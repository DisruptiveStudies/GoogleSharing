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

loadScript("LanguagePreferences.js");

function ContentPolicy() { 
  this.wrappedJSObject        = this;
  this.blockExpression        = new RegExp(".+\\.google-analytics\\.com\\/__utm\\.gif.+");
  this.autoCompleteExpression = /^https:\/\/clients[0-9]\.google\.com\/complete\/.+/;
  this.googleSharingManager   = Components.classes['@thoughtcrime.org/googlesharingmanager;1'].getService().wrappedJSObject;  
}

ContentPolicy.prototype = {
  classDescription: "GoogleSharingContentPolicy Component",
  classID:          Components.ID("{cb985df0-5300-11df-9879-0800200c9a66}"),
  contractID:       "@thoughtcrime.org/gscontentpolicy;1",
  QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsIContentPolicy]),
  _xpcom_categories: [{category: "content-policy"}],

  shouldLoad: function(aContentType, aContentLocation, aRequestOrigin, aContext, aMimeTypeGuess, aExtra) {
    if ((aContentLocation.scheme == "http" || aContentLocation.scheme == "http") && 
	this.blockExpression.test(aContentLocation.host + aContentLocation.path)) 
    {
      return false;
    }

    var proxy = this.getProxyForURL(aContentLocation.spec);

    if (aContentLocation.scheme == "http" && proxy != null) 
      this.upgradeToHttpsIfPossible(aContentLocation, proxy);

    if (this.autoCompleteExpression.test(aContentLocation.spec) && !proxy.hasCachedIdentity()) {
      try {
	proxy.fetchSharedIdentity(true);
      } catch (e) {
	dump("Got exception on prefetch: " + e + "\n");
      }
      return false;
    }

    return true;
  },

  shouldProcess: function(aContentType, aContentLocation, aRequestOrigin, aContext, aMimeType, aExtra) {
    return true;
  },

  getUriForSpec: function(spec) {
    var uri = Components.classes["@mozilla.org/network/standard-url;1"]
    .createInstance(Components.interfaces.nsIStandardURL);
    uri.init(Components.interfaces.nsIStandardURL.URLTYPE_STANDARD, 80, spec, null, null);

    uri = uri.QueryInterface(Components.interfaces.nsIURI);
    return uri;
  },

  getProxyForURL: function(spec) {
    var connectionManager = this.googleSharingManager.getConnectionManager();

    if (!this.googleSharingManager.isEnabled() || connectionManager == null || !this.googleSharingManager.getProxyManager().isUpgradeSsl())
      return null;
    
    return connectionManager.getProxyForURL(spec);
  },

  upgradeSpecToHttpsIfPossible: function(spec) {
    spec = spec.replace(/^http:\/\/(www\.)?google\.com\/$/ig, "https://encrypted.google.com/");
    spec = spec.replace(/^http:\/\/(www\.)?google\.com\/(search||webhp||#)?/ig, 
		      "https://encrypted.google.com/$2");
    spec = spec.replace(/^http:\/\/(www\.)?google\.com\/(firefox||firefox\/?$)/ig, 
		      "https://encrypted.google.com/search");
    spec = spec.replace(/^http:\/\/clients[0-9]\.google\.com\/complete\/search/ig,
		      "https://clients1.google.com/complete/search");
    spec = spec.replace(/^http:\/\/suggestqueries\.google\.com\/complete\/search/ig,
		      "https://clients1.google.com/complete/search");

    return spec;
  },

  replaceWithUpgradedUri: function(aContentLocation, spec) {
    dump("Modified URI from: " + aContentLocation.spec + " to: " + spec + "\n");

    var secureUri           = this.getUriForSpec(spec);
    aContentLocation.scheme = secureUri.scheme;
    aContentLocation.host   = secureUri.host;
    aContentLocation.port   = secureUri.port;
    aContentLocation.path   = secureUri.path;
  },

  getLanguifiedSpec: function(spec, proxy) {
    var uri                 = this.getUriForSpec(spec);    
    var languagePreferences = new LanguagePreferences(proxy.getInterfaceLanguage(), proxy.getSearchLanguage());
    var path                = languagePreferences.getLanguifiedPath(uri.host, uri.path);

    return uri.scheme + "://" + uri.host + path;    
  },

  upgradeToHttpsIfPossible: function(aContentLocation, proxy) {
    dump("Attempting spec upgrade: " + aContentLocation.spec + "\n");

    var spec = this.upgradeSpecToHttpsIfPossible(aContentLocation.spec);

    if (spec.indexOf("https://") == 0)
      spec = this.getLanguifiedSpec(spec, proxy);
    
    if (spec != aContentLocation.spec)
      this.replaceWithUpgradedUri(aContentLocation, spec);
  },

};

var components = [ContentPolicy];
function NSGetModule(compMgr, fileSpec) {
  return XPCOMUtils.generateModule(components);
}
