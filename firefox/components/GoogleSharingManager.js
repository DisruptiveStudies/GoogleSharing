// Copyright (c) 2010 Moxie Marlinspike <moxie@thoughtcrime.org>
// Thi s program is free software; you can redistribute it and/or
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

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

var loadScript = function(filename) {
  try {
    var path = __LOCATION__.parent.clone();
    path.append(filename);

    var fileProtocol = Components.classes["@mozilla.org/network/protocol;1?name=file"]
    .getService(Components.interfaces["nsIFileProtocolHandler"]);
    var loader       = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
    .getService(Components.interfaces["mozIJSSubScriptLoader"]);
        
    loader.loadSubScript(fileProtocol.getURLSpecFromFile(path));
  } catch (e) {
    dump("Error loading component script: " + path.path + " : " + e);
  }
};

var setRestartCount = function(value) {
  dump("Setting restart count: " + value + "\n");
  var preferences = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
  preferences.getBranch("googlesharing.").setIntPref("restart-count", value);  
};

var getRestartCount = function() {
    var preferences = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
    return preferences.getBranch("googlesharing.").getIntPref("restart-count");    
};

var loadCertificate = function() {
  try{
    var path = __LOCATION__.parent.parent.clone();
    path.append("certificate.pem");
    
    var certDB = Components.classes["@mozilla.org/security/x509certdb;1"]
    .getService(Components.interfaces.nsIX509CertDB); 
    
    certDB.importCertsFromFile(null, path, Components.interfaces.nsIX509Cert.SERVER_CERT);
    var cert = certDB.findCertByNickname(null, "proxy.googlesharing.net");
    
    certDB.setCertTrust(cert, Components.interfaces.nsIX509Cert.SERVER_CERT, Components.interfaces.nsIX509CertDB.TRUSTED_SSL);

    setRestartCount(0);
  } catch (e) {
    dump("Failed to load certificate: " + e + "\n");    
    dump("Restarting...");
    setRestartCount(getRestartCount()+1);
    Components.classes["@mozilla.org/toolkit/app-startup;1"].getService(Components.interfaces.nsIAppStartup)
    .quit(Components.interfaces.nsIAppStartup.eRestart | Components.interfaces.nsIAppStartup.eAttemptQuit);

  }
};

var initializeCertificate = function() {  

  try {
    var certDB = Components.classes["@mozilla.org/security/x509certdb;1"]
    .getService(Components.interfaces.nsIX509CertDB); 
    
    var cert = certDB.findCertByNickname(null, "proxy.googlesharing.net");
    
  } catch (e ) {
    dump("Find certificate Exception: " + e + "\nRestart count: " + getRestartCount() + "\n");
    if (getRestartCount() < 3) {
      dump("Attempting to load the certificate...\n");
      loadCertificate();      
    } else {
      dump("Looping, not loading certificate...\n");
    }
  }
};

initializeCertificate();

loadScript("Filter.js");
loadScript("Proxy.js");
loadScript("ProxyManager.js");
loadScript("MainThreadDispatcher.js");
loadScript("LocalProxy.js");
loadScript("DataShuffler.js");
loadScript("ConnectionManager.js");
loadScript("LanguagePreferences.js");
loadScript("Identity.js");
loadScript("Cookie.js");
loadScript("Prefetcher.js");

function GoogleSharingManager() { 
  this.wrappedJSObject = this;
  this.initializeExtensionVersion();
  this.initializeConnectionManager();
  this.registerHeadersObserver();
  this.registerProxyObserver();
}

GoogleSharingManager.prototype = {
  classDescription: "GoogleSharingManager Component",
  classID:          Components.ID("{d29c7ea0-fd61-11de-8a39-0800200c9a66}"),
  contractID:       "@thoughtcrime.org/googlesharingmanager;1",
  QueryInterface: XPCOMUtils.generateQI(),
  proxyManager: null,
  connectionManager: null,
  extensionVersion: "0.0",
  enabled: false, 

  initializeExtensionVersion: function() {
    var uuid = "googlesharing@extension.thoughtcrime.org";
    if ("@mozilla.org/extensions/manager;1" in Components.classes) {
      var gExtensionManager = Components.classes["@mozilla.org/extensions/manager;1"]
      .getService(Components.interfaces.nsIExtensionManager);
      this.extensionVersion = gExtensionManager.getItemForID(uuid).version;
    } else {
      // Geko 2.0
      Components.utils.import("resource://gre/modules/AddonManager.jsm");
      var self = this;
      AddonManager.getAddonByID(uuid, function(addon) { self.extensionVersion = addon.version; });
    }
  },

  initializeConnectionManager: function() {
    this.proxyManager      = new ProxyManager();
    this.connectionManager = new ConnectionManager(this.proxyManager);
    this.enabled           = this.proxyManager.isEnabled();
  },

  update: function() {
    this.connectionManager.shutdown();
    this.connectionManager = new ConnectionManager(this.proxyManager);
  },

  setEnabled: function(value) {
    this.enabled = value;
    this.proxyManager.setEnabled(value);
    this.proxyManager.savePreferences();    
    if (this.enabled) this.update();
  },

  isEnabled: function() {
    return this.enabled;
  },

  isShortStatus: function() {
    return this.proxyManager.isShortStatus();
  },

  setShortStatus: function(value) {
    this.proxyManager.setShortStatus(value);
    this.proxyManager.savePreferences();
  },

  getProxyManager: function() {
    return this.proxyManager;
  },

  getNewProxy: function() {
    return new Proxy();
  },

  getConnectionManager: function() {
    return this.connectionManager;
  },

  registerHeadersObserver: function() {
    var observerService = Components.classes["@mozilla.org/observer-service;1"]
    .getService(Components.interfaces.nsIObserverService);
    observerService.addObserver(this, "http-on-modify-request", false);
    observerService.addObserver(this, "http-on-examine-response", false);
    observerService.addObserver(this, "network:offline-status-changed", false);
  },

  registerProxyObserver: function() {
    var protocolService = Components.classes["@mozilla.org/network/protocol-proxy-service;1"]
    .getService(Components.interfaces.nsIProtocolProxyService);

    protocolService.unregisterFilter(this);
    protocolService.registerFilter(this, 10000);
  },

  applyFilter : function(protocolService, uri, proxy) {
    if (!this.enabled)         return proxy;
    //    if (!uri.schemeIs("http")) return proxy;
    
    var requestUri = uri.scheme + "://" + uri.host + uri.path;
    var localProxy = this.connectionManager.getProxyForURL(requestUri);
    if (!localProxy) return proxy;

    if (!localProxy.isPrefetchURL(requestUri)) {      
      localProxy.setProxyTunnel(proxy);
      return localProxy.getProxyInfo();
    } else {
      localProxy.setProxyTunnel(proxy);
      return localProxy.getEncryptedProxyInfo();
    }
  },

  getAbbreviatedPathForSubject: function(subject) {
    var abbreviatedPath = subject.originalURI.path.substring(0, subject.originalURI.path.lastIndexOf('/'));

    if (abbreviatedPath.indexOf("/") != 0)
      return "/" + abbreviatedPath;

    return abbreviatedPath;
  },

  sendActivityNotification: function() {
    var observerService = Components.classes["@mozilla.org/observer-service;1"]
    .getService(Components.interfaces.nsIObserverService);  
    observerService.notifyObservers(observerService, "googlesharing-activity", false);
  },

  setHeadersForRequest: function(localProxy, subject) {
    subject.setRequestHeader("Cookie", "", false);	
    subject.setRequestHeader("X-GoogleSharing-Version", this.extensionVersion, false);
    subject.setRequestHeader("X-Interface-Lang", localProxy.getInterfaceLanguage(), false);
      
    if (localProxy.getSearchLanguage() != "all") {
      subject.setRequestHeader("X-Search-Lang", localProxy.getSearchLanguage(), false);
    }
  },

  setHeadersForEncryptedRequest: function(localProxy, subject) {
    var abbreviatedPath = this.getAbbreviatedPathForSubject(subject);
    var sharedIdentity  = localProxy.fetchSharedIdentity(false);
    var cookies         = null;
    if (sharedIdentity != null)
      cookies           = sharedIdentity.getCookies(subject.originalURI.host, abbreviatedPath);
    
    if (cookies != null) {
      subject.setRequestHeader("Cookie", cookies, false);
    } else {
      subject.setRequestHeader("Cookie", "", false);
    }
    
    subject.setRequestHeader("User-Agent", sharedIdentity.getUserAgent(), false);
    subject.setRequestHeader("Accept-Encoding", "gzip,deflate", false);
    subject.setRequestHeader("Accept-Language", "en-us,en;q=0.5", false);
  },

  setHeadersForEncryptedResponse: function(localProxy, subject) {
    var cookie;

    try {
      cookie = subject.getResponseHeader("Set-Cookie");
    } catch (exception) {
      return;
    }    

    var abbreviatedPath = this.getAbbreviatedPathForSubject(subject);
    
    dump("Updating cookie abbreviated path: " + abbreviatedPath + "\n");
    
    subject.setResponseHeader("Set-Cookie", "", false);
    localProxy.updateSharedIdentity(cookie, subject.originalURI.host, abbreviatedPath);
  },

  handleOutgoingRequest: function(requestUri, localProxy, subject) {    
    if (!localProxy.isPrefetchURL(requestUri)) {
      this.setHeadersForRequest(localProxy, subject);
    } else {
      this.setHeadersForEncryptedRequest(localProxy, subject);
    }

    this.sendActivityNotification();
  },

  handleIncomingResponse: function(requestUri, localProxy, subject) {
    if (localProxy.isPrefetchURL(requestUri)) {
      this.setHeadersForEncryptedResponse(localProxy, subject);
    }
  },

  observe: function(subject, topic, data) {
    if (topic == 'http-on-modify-request' || topic == 'http-on-examine-response') {
      if (!this.enabled) return;
      subject.QueryInterface(Components.interfaces.nsIHttpChannel);
      var requestUri = subject.originalURI.scheme + "://" + subject.originalURI.host + subject.originalURI.path;
      var localProxy = this.connectionManager.getProxyForURL(requestUri);    
      if (!localProxy) return;

      if (topic == 'http-on-modify-request') {
	this.handleOutgoingRequest(requestUri, localProxy, subject);
      } else {
	this.handleIncomingResponse(requestUri, localProxy, subject);
      }
    } else if (topic == 'network:offline-status-changed') {
      dump("Network offline status changed: " + data + "\n");
      if (data == "online") {
	this.connectionManager = new ConnectionManager(this.proxyManager);
      }
    }

  }
};

var components = [GoogleSharingManager];
/**
 * XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
 * XPCOMUtils.generateNSGetModule is for Mozilla 1.9.2 (Firefox 3.6).
 */
if (XPCOMUtils.generateNSGetFactory)
  var NSGetFactory = XPCOMUtils.generateNSGetFactory(components);
else
  var NSGetModule = XPCOMUtils.generateNSGetModule(components);
