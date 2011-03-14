// Copyright (c) 2010 Moxie Marlinspike <moxie@thoughtcrime.org>
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License as
// published by the Free Software Foundation; either version 3 of the
// License, or (at your option) any later version.

// This program is distributed in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
// General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307
// USA


function DataShuffler(localProxy, clientTransport, serverTransport) {
  this.localProxy            = localProxy;
  this.clientTransport       = clientTransport;
  this.serverTransport       = serverTransport;

  this.rawClientOutputStream = clientTransport.openOutputStream(0,0,0);
  this.rawServerOutputStream = serverTransport.openOutputStream(0,0,0);
  this.rawClientInputStream  = clientTransport.openInputStream(0,0,0);
  this.rawServerInputStream  = serverTransport.openInputStream(0,0,0);
  
  this.clientInputStream     = Components.classes["@mozilla.org/binaryinputstream;1"].createInstance(Components.interfaces.nsIBinaryInputStream);
  this.serverInputStream     = Components.classes["@mozilla.org/binaryinputstream;1"].createInstance(Components.interfaces.nsIBinaryInputStream);

  this.clientOutputStream    = Components.classes["@mozilla.org/binaryoutputstream;1"].createInstance(Components.interfaces.nsIBinaryOutputStream);
  this.serverOutputStream    = Components.classes["@mozilla.org/binaryoutputstream;1"].createInstance(Components.interfaces.nsIBinaryOutputStream);

  this.clientInputStream.setInputStream(this.rawClientInputStream);
  this.serverInputStream.setInputStream(this.rawServerInputStream);

  this.clientOutputStream.setOutputStream(this.rawClientOutputStream);
  this.serverOutputStream.setOutputStream(this.rawServerOutputStream);

  this.workerThread          = Components.classes["@mozilla.org/thread-manager;1"].getService(Components.interfaces.nsIThreadManager).currentThread;
}

DataShuffler.prototype.shuffleStreams = function(fromStream, toStream) {
  var count = fromStream.available();
  var data  = fromStream.readBytes(count);
  toStream.writeBytes(data, count);
  toStream.flush()
};

DataShuffler.prototype.isProxyFailure = function(e) {
  return (e.name == "NS_ERROR_CONNECTION_REFUSED" || e.name == "NS_ERROR_NET_TIMEOUT");
};

DataShuffler.prototype.handleProxyFailure = function() {
  this.notifyProxyFailure(this.localProxy);

  var script = "<script type=\"text/javascript\" language=\"javascript\">window.location.reload();</script>";
  var html   = "HTTP/1.1 200 OK\r\nContent-Type=text/html\r\nContent-Length:" + script.length + "\r\n\r\n" + script;
  this.clientOutputStream.writeBytes(html, html.length);
  this.clientOutputStream.flush();
}

DataShuffler.prototype.onInputStreamReady = function(inputStream) {
  if (inputStream == this.rawClientInputStream) {
    try {
      this.shuffleStreams(this.clientInputStream, this.serverOutputStream);
    } catch (e) {
      this.rawServerOutputStream.close();
      this.rawClientInputStream.close();
      return;
    }    
    this.rawClientInputStream.asyncWait(this, 0, 0, this.workerThread);
  } else {
    try {
      this.shuffleStreams(this.serverInputStream, this.clientOutputStream);
    } catch (e) {

      if (this.isProxyFailure(e)) {
	this.handleProxyFailure();
	return;
      }

      this.rawClientOutputStream.close();
      this.rawServerInputStream.close();
      this.clientTransport.close(0);
      
      return;
    }

    this.rawServerInputStream.asyncWait(this, 0, 0, this.workerThread);
  }
};

DataShuffler.prototype.notifyProxyFailure = function(localProxy) {
  var main = Components.classes["@mozilla.org/thread-manager;1"].getService().mainThread;
  main.dispatch(new MainThreadDispatcher(localProxy), main.DISPATCH_NORMAL);
};

DataShuffler.prototype.shuffle = function() {
  this.rawClientInputStream.asyncWait(this, 0, 0, this.workerThread);
  this.rawServerInputStream.asyncWait(this, 0, 0, this.workerThread);
};
