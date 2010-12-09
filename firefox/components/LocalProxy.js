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

function LocalProxy(remoteProxy) {
  this.wrappedJSObject       = this;
  this.remoteProxy           = remoteProxy;
  this.serverSocket          = null;
  this.encryptedServerSocket = null;
  this.proxyInfo             = null;
  this.encryptedProxyInfo    = null;
  this.tunnelProxy           = null;
  this.terminated            = false;

  this.constructServerSocket();
  this.initializeProxyInfo();
}

LocalProxy.prototype.hasCachedIdentity = function() {
  return this.remoteProxy.hasCachedIdentity();
};

LocalProxy.prototype.fetchSharedIdentity = function(async) {
  return this.remoteProxy.fetchSharedIdentity(async);
};

LocalProxy.prototype.updateSharedIdentity = function(cookie, domain, path) {
  this.remoteProxy.updateSharedIdentity(cookie, domain, path);
};

LocalProxy.prototype.setProxyTunnel = function(tunnelProxy) {
  this.tunnelProxy = tunnelProxy;
};

LocalProxy.prototype.getInterfaceLanguage = function() {
  return this.remoteProxy.getInterfaceLanguage();
};

LocalProxy.prototype.getSearchLanguage = function() {
  return this.remoteProxy.getSearchLanguage();
};

LocalProxy.prototype.shutdown = function() {
  this.terminated = true;
  this.serverSocket.close();
  this.encryptedServerSocket.close();
};

LocalProxy.prototype.getProxyInfo = function() {
  return this.proxyInfo;
};

LocalProxy.prototype.getEncryptedProxyInfo = function() {
  return this.encryptedProxyInfo;
};

LocalProxy.prototype.matchesURL = function(url) {
  return !this.terminated && this.remoteProxy.matchesURL(url);
};

LocalProxy.prototype.isPrefetchURL = function(url) {
  return !this.terminated && this.remoteProxy.isPrefetchURL(url);
};

LocalProxy.prototype.constructServerSocket = function() {
  try {
    this.serverSocket = Components.classes["@mozilla.org/network/server-socket;1"].createInstance(Components.interfaces.nsIServerSocket);
  
    this.serverSocket.init(-1,true,-1);
    this.serverSocket.asyncListen(this);

    this.encryptedServerSocket = Components.classes["@mozilla.org/network/server-socket;1"]
    .createInstance(Components.interfaces.nsIServerSocket);  
    this.encryptedServerSocket.init(-1,true,-1);
    this.encryptedServerSocket.asyncListen(this);
  } catch (e) {
    dump("Server socket construction failed: " + e + "\n");
  }
};

LocalProxy.prototype.initializeProxyInfo = function() {
  var proxyService        = Components.classes["@mozilla.org/network/protocol-proxy-service;1"].getService(Components.interfaces.nsIProtocolProxyService);
  this.proxyInfo          = proxyService.newProxyInfo("http", "localhost", this.serverSocket.port, 1, 0, null);
  // this.encryptedProxyInfo = proxyService.newProxyInfo("http", this.remoteProxy.getHost(), 
  // 						      this.remoteProxy.getHTTPPort(), 1, 0, null); 
  this.encryptedProxyInfo = proxyService.newProxyInfo("http", "localHost", this.encryptedServerSocket.port, 1, 0, null);
};

LocalProxy.prototype.connectToRemoteProxy = function(connectWithoutSsl) {
  var transportService = Components.classes["@mozilla.org/network/socket-transport-service;1"]
  .getService(Components.interfaces.nsISocketTransportService);

  var transport;

  if (this.remoteProxy.isSSLEnabled() && !connectWithoutSsl) {
    transport = transportService.createTransport(['ssl'],1,this.remoteProxy.getHost(), this.remoteProxy.getSSLPort(),this.tunnelProxy);
  } else {
    // XXX if tunnelProxy is HTTP, we need to do CONNECT ourselves here.
    transport = transportService.createTransport(null,0,this.remoteProxy.getHost(),this.remoteProxy.getHTTPPort(),this.tunnelProxy);
  }

  transport.setTimeout(0, 5);
  return transport;
};

LocalProxy.prototype.onSocketAccepted = function(serverSocket, clientTransport) {
  var serverTransport = this.connectToRemoteProxy(serverSocket == this.encryptedServerSocket);
  var dataShuffler    = new DataShuffler(this, clientTransport, serverTransport);
  dataShuffler.shuffle();
};

LocalProxy.prototype.onStopListening = function(serverSocket, status) {
  if (!this.terminated) {
    dump("onStopListening called for active ServerSocket...\n");
  }
};