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


function ConnectionManager(proxyManager) {
  this.proxyManager   = proxyManager;
  this.localProxies   = new Array();
  this.lastProxyIndex = 0;

  this.registerNotificationListener();
  this.updateLastProxyTime();
  this.initializeLocalProxies();
}

ConnectionManager.prototype.isInReuseWindow = function() {
  return (new Date().getTime() - this.lastProxyTime) <= 30000;
};

ConnectionManager.prototype.updateLastProxyTime = function() {
  this.lastProxyTime = new Date().getTime();
};

ConnectionManager.prototype.lastProxyMatches = function(url) {
  if (this.lastProxyIndex < this.localProxies.length) {
    return this.localProxies[this.lastProxyIndex].matchesURL(url);
  }  
};

ConnectionManager.prototype.shutdown = function() {
  for (var i=0;i<this.localProxies.length;i++) {
    this.localProxies[i].shutdown();
  }
};

ConnectionManager.prototype.checkoutProxyAt = function(proxyIndex) {
  this.lastProxyIndex = proxyIndex;
  this.updateLastProxyTime();
  return this.localProxies[proxyIndex];
}

ConnectionManager.prototype.getProxyForURL = function(url) {
  if (this.isInReuseWindow() && this.lastProxyMatches(url)) {
    return this.checkoutProxyAt(this.lastProxyIndex);
  }

  for (var i=this.lastProxyIndex+1;i<this.localProxies.length;i++) {
    if (this.localProxies[i].matchesURL(url)) {
      return this.checkoutProxyAt(i);
    }
  }

  for (var i=0;(i<=this.lastProxyIndex) && (i<this.localProxies.length);i++) {
    if (this.localProxies[i].matchesURL(url)) {
      return this.checkoutProxyAt(i);
    }
  }

  return null;
};

ConnectionManager.prototype.registerNotificationListener = function() {
  var observerService = Components.classes["@mozilla.org/observer-service;1"]
  .getService(Components.interfaces.nsIObserverService);
  observerService.addObserver(this, "googlesharing-proxyfailed", false);
};

// We would just display the notification here, but nsIAlertService is
// infuriatingly not supported by all platforms (WHY?), so we need to push
// this up to the XUL level which can do all the right magic.
ConnectionManager.prototype.notifyProxyDisabled = function(localProxy) {
  var observerService = Components.classes["@mozilla.org/observer-service;1"]
  .getService(Components.interfaces.nsIObserverService);  
  observerService.notifyObservers(localProxy, "googlesharing-proxyfailed-status", null);
};

ConnectionManager.prototype.notifyAllProxiesDisabled = function() {
  var observerService = Components.classes["@mozilla.org/observer-service;1"]
  .getService(Components.interfaces.nsIObserverService);  
  observerService.notifyObservers(observerService, "googlesharing-allproxiesfailed", false);
};

ConnectionManager.prototype.observe = function(subject, topic, data) {
  if (topic == "googlesharing-proxyfailed") {
    if (subject.wrappedJSObject) 
      subject = subject.wrappedJSObject;

    if (this.hasProxy(subject)) {
      subject.shutdown();
      this.notifyProxyDisabled(subject);
      this.removeProxy(subject);
    }
  }
};

ConnectionManager.prototype.removeProxy = function(proxy) {
  for (var i=0;i<this.localProxies.length;i++) {
    if (this.localProxies[i] == proxy) {
      this.localProxies.splice(i,1);
      break;
    }
  }

  if (this.localProxies.length == 0) 
    this.notifyAllProxiesDisabled();

};

ConnectionManager.prototype.hasProxy = function(proxy) {
  for (var i=0;i<this.localProxies.length;i++) {
    if (this.localProxies[i] == proxy) {
      return true;
    }
  }

  return false;
};

ConnectionManager.prototype.initializeLocalProxies = function() {
  for (var i=0;i<this.proxyManager.getProxyCount();i++) {
    var proxy = this.proxyManager.getProxyAtIndex(i);
    if (proxy.getEnabled()) {
      var localProxy = new LocalProxy(proxy);
      this.localProxies.push(localProxy);      
    }
  }
};