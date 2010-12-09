/*
 * Copyright (c) 2010 Moxie Marlinspike
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License as
 * published by the Free Software Foundation; either version 2 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307
 * USA
 */

function Prefetcher(urlScheme, host, port) {
  this.urlScheme               = urlScheme;
  this.host                    = host;
  this.port                    = port;
  this.cachedIdentity          = null;
  this.cachedIdentityTimestamp = 0;
  this.outstandingAsyncRequest = false;
}

Prefetcher.prototype.parseIdentity = function(response) {
  var json                     = Components.classes["@mozilla.org/dom/json;1"].createInstance(Components.interfaces.nsIJSON);
  this.cachedIdentity          = new Identity(json.decode(response));
  this.cachedIdentityTimestamp = new Date().getTime();

  return this.cachedIdentity;
};

Prefetcher.prototype.sendRequest = function(request, async) {
  var cookieRequest = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance();
  var thisInstance  = this;

  if (async) {
    cookieRequest.onreadystatechange = function() {
      if (cookieRequest.readyState == 4) {  
    	if(cookieRequest.status == 200) {
    	  thisInstance.parseIdentity(cookieRequest.responseText);
	  thisInstance.outstandingAsyncRequest = false;
    	} else {
	  thisInstance.outstandingAsyncRequest = false;
    	}
      }  
    };  

    this.outstandingAsyncRequest = true;
  }


  cookieRequest.open('GET', request, async);  
  cookieRequest.overrideMimeType('text/plain; charset=x-user-defined');  
  cookieRequest.send(null)

  if (!async && cookieRequest.status == 200) {
    return this.parseIdentity(cookieRequest.responseText);
  } else if (!async) {
    return null;
  }
};

Prefetcher.prototype.hasCachedIdentity = function() {
  return (this.cachedIdentity != null && ((new Date().getTime() - this.cachedIdentityTimestamp) <= 70000));
};

Prefetcher.prototype.fetchCachedSharedIdentity = function() {
  if (this.hasCachedIdentity()) {
    return this.cachedIdentity;
  }
  
  return null;
};

Prefetcher.prototype.updateSharedIdentity = function(cookie, domain, path) {
  this.sendRequest(this.urlScheme + this.host + ":" + this.port + 
		   "/updateIdentity?domain=" + domain + "&path=" + path + 
		   "&cookie=" + cookie, false);
};

Prefetcher.prototype.fetchSharedIdentity = function(async) {
  var identity = this.fetchCachedSharedIdentity();

  if (identity == null && !(async && this.outstandingAsyncRequest)) {
    identity = this.sendRequest(this.urlScheme + this.host + ":" + 
				this.port + "/fetchIdentity", async);
  }

  return identity;
};

