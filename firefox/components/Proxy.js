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


function Proxy() {
  this.name              = null;
  this.host              = null;
  this.interfaceLanguage = "en";
  this.searchLanguage    = "all";
  this.httpPort          = -1;
  this.sslPort           = -1;
  
  this.enabled           = false;
  this.filters           = new Array();
  this.encryptedFilters  = new Array();

  this.proxyMaps         = true;
  this.proxyGroups       = true;
  this.proxyNews         = true;
  this.proxyVideo        = true;
  this.proxyProducts     = true;
  this.proxyImages       = true;
  this.proxyFinance      = true;
  this.proxyCode         = true;

  this.useSSL            = true;
  this.prefetcher        = null;

  this.setDefaultFilters();
}

Proxy.prototype.initializePrefetcher = function() {
  if (this.prefetcher == null) {
    this.prefetcher = new Prefetcher("https://", this.host, this.sslPort);
  }
};

Proxy.prototype.updateSharedIdentity = function(cookie, domain, path) {
  this.initializePrefetcher();
  this.prefetcher.updateSharedIdentity(cookie, domain, path);
};

Proxy.prototype.hasCachedIdentity = function() {
  this.initializePrefetcher();
  return this.prefetcher.hasCachedIdentity();
};

Proxy.prototype.fetchSharedIdentity = function(async) {
  this.initializePrefetcher();
  return this.prefetcher.fetchSharedIdentity(async);
};

Proxy.prototype.setDefaultFilters = function() {
  var javascriptApiPaths = 
  "|\\/jsapi|\\/uds\\/|\\/books\\/api\\.js|\\/friendconnect\\/script\\/friendconnect\\.js|\\/s2\\/sharing\\/js|\\/maps\\?.*file=(googleapi|api).*" + 
  "|\\/maps\\/api\\/js|\\/reviews\\/scripts\\/annotations_bootstrap\\.js";

  mainFilter = new Filter();
  mainFilter.setName("main");
  mainFilter.setExpression("^http:\\/\\/(?:(?!chatenabled\\.|mail\\.|checkout\\.|sites\\.|docs\\.|picasaweb\\.|notebook\\.|spreadsheets\\.|wave\\.|voice\\.|bookmarks\\.|talkgadget\\." +
  			   (this.proxyMaps     ? "" : "|maps\\.|id\\.|mt[0-9]\\.|khm[0-9]\\.")     +
  			   (this.proxyGroups   ? "" : "|groups\\.")   +
  			   (this.proxyNews     ? "" : "|news\\.")     +
  			   (this.proxyVideo    ? "" : "|video\\.")    +
  			   (this.proxyProducts ? "" : "|products\\.") +
  			   (this.proxyImages   ? "" : "|images\\.")   +
			   (this.proxyCode     ? "" : "|code\\.")     +
  			   ")[^.]+\\.)?google\\.com(?!\\.|\\/accounts|\\/a\\/|\\/UniversalLogin|\\/calendar|\\/reader|\\/health|\\/notebook|\\/wave|\\/ig|\\/apps|\\/webmasters|\\/contacts|\\/voice|\\/bookmarks|\\/group\\/[^/]+\\/post"     + 
  			   javascriptApiPaths                         +
  			   (this.proxyProducts ? "" : "|\\/prdhp")    +
  			   (this.proxyImages   ? "" : "|\\/imghp")    +
  			   ")");
  mainFilter.setEnabled(true);
   
  staticFilter  = new Filter();
  staticFilter.setName("static");
  staticFilter.setExpression("^http:\\/\\/.+\\.gstatic\\.com(?!\\/.+api.+)");
  staticFilter.setEnabled(true);

  hostedFilter  = new Filter();
  hostedFilter.setName("hosted");
  hostedFilter.setExpression("^http:\\/\\/.+\\.googlehosted\\.com/.?");
  hostedFilter.setEnabled(true);

  hundredFilter = new Filter();
  hundredFilter.setName("1e100");
  hundredFilter.setExpression("^http:\\/\\/(.+\\.)?1e100\\.net/.?");
  hundredFilter.setEnabled(true);

  encryptedSearchFilter = new Filter();
  encryptedSearchFilter.setName("encrypted");
  encryptedSearchFilter.setExpression("^https:\\/\\/(encrypted|clients1|id)\\.google.com\\/.?");
  encryptedSearchFilter.setEnabled(true);
    
  filters = new Array();
  filters.push(mainFilter);
  filters.push(staticFilter);
  filters.push(hostedFilter);
  filters.push(hundredFilter);
  filters.push(encryptedSearchFilter);

  encryptedFilters = new Array();
  encryptedFilters.push(encryptedSearchFilter);

  this.setFilters(filters);
  this.setEncryptedFilters(encryptedFilters);
};

Proxy.prototype.getHost = function() {
  return this.host;
};

Proxy.prototype.setHost = function(host) {
  this.host = host;
};

Proxy.prototype.getSSLPort = function() {
  return this.sslPort;
};

Proxy.prototype.setSSLPort = function(port) {
  this.sslPort = port;
};

Proxy.prototype.getHTTPPort = function() {
  return this.httpPort;
};

Proxy.prototype.setHTTPPort = function(port) {
  this.httpPort = port;
};

Proxy.prototype.getName = function() {
  return this.name;
};

Proxy.prototype.setName = function(name) {
  this.name = name;
};

Proxy.prototype.getFilters = function() {
  return this.filters;
};

Proxy.prototype.setFilters = function(filters) {
  this.filters = filters;
};

Proxy.prototype.setEncryptedFilters = function(filters) {
  this.encryptedFilters = filters;
};

Proxy.prototype.getEnabled = function() {
  return this.enabled;
};

Proxy.prototype.setEnabled = function(value) {
  this.enabled = value;
};

Proxy.prototype.isSSLEnabled = function() {
  return this.useSSL;
}

Proxy.prototype.setSSLEnabled = function(value) {
  this.useSSL = value;
}

Proxy.prototype.setInterfaceLanguage = function(value) {
  this.interfaceLanguage = value;
};

Proxy.prototype.getInterfaceLanguage = function() {
  return this.interfaceLanguage;
};

Proxy.prototype.setSearchLanguage = function(value) {
  this.searchLanguage = value;
};

Proxy.prototype.getSearchLanguage = function() {
  return this.searchLanguage;
};

Proxy.prototype.getFilterCount = function() {
  return this.filters.length;
};

Proxy.prototype.setProxyMaps = function(value) {
  this.proxyMaps = value;
};

Proxy.prototype.getProxyMaps = function(value) {
  return this.proxyMaps;
};

Proxy.prototype.setProxyGroups = function(value) {
  this.proxyGroups = value;
};

Proxy.prototype.getProxyGroups = function(value) {
  return this.proxyGroups;
};

Proxy.prototype.setProxyNews = function(value) {
  this.proxyNews = value;
};

Proxy.prototype.getProxyNews = function(value) {
  return this.proxyNews;
};

Proxy.prototype.setProxyVideo = function(value) {
  this.proxyVideo = value;
};

Proxy.prototype.getProxyVideo = function(value) {
  return this.proxyVideo;
};

Proxy.prototype.setProxyProducts = function(value) {
  this.proxyProducts = value;
};

Proxy.prototype.getProxyProducts = function(value) {
  return this.proxyProducts;
};

Proxy.prototype.setProxyImages = function(value) {
  this.proxyImages = value;
};

Proxy.prototype.getProxyImages = function(value) {
  return this.proxyImages;
};

Proxy.prototype.setProxyFinance = function(value) {
  this.proxyFinance = value;
};

Proxy.prototype.getProxyFinance = function(value) {
  return this.proxyFinance;
};

Proxy.prototype.setProxyCode = function(value) {
  this.proxyCode = value;
};

Proxy.prototype.getProxyCode = function() {
  return this.proxyCode;
};

Proxy.prototype.serialize = function(xmlDocument) {
  var proxyElement = xmlDocument.createElement("proxy");
  proxyElement.setAttribute("name", this.name);
  proxyElement.setAttribute("host", this.host);
  proxyElement.setAttribute("ssl-port", this.sslPort);
  proxyElement.setAttribute("http-port", this.httpPort);
  proxyElement.setAttribute("use-ssl", this.useSSL);
  proxyElement.setAttribute("enabled", this.enabled);
  proxyElement.setAttribute("interface-language", this.interfaceLanguage);
  proxyElement.setAttribute("search-language", this.searchLanguage);

  proxyElement.setAttribute("proxyMaps", this.proxyMaps);
  proxyElement.setAttribute("proxyGroups", this.proxyGroups);
  proxyElement.setAttribute("proxyNews", this.proxyNews);
  proxyElement.setAttribute("proxyVideo", this.proxyVideo);
  proxyElement.setAttribute("proxyProducts", this.proxyProducts);
  proxyElement.setAttribute("proxyImages", this.proxyImages);
  proxyElement.setAttribute("proxyFinance", this.proxyFinance);
  proxyElement.setAttribute("proxyCode", this.proxyCode);

  return proxyElement;
};

Proxy.prototype.deserialize = function(element) {
  this.name              = element.getAttribute("name");
  this.host              = element.getAttribute("host");
  this.sslPort           = element.getAttribute("ssl-port");
  this.httpPort          = element.getAttribute("http-port");
  this.useSSL            = (element.getAttribute("use-ssl") == "true");
  this.interfaceLanguage = element.getAttribute("interface-language");
  this.searchLanguage    = element.getAttribute("search-language");
  this.enabled           = (element.getAttribute("enabled") == "true");
  this.proxyMaps         = (element.getAttribute("proxyMaps") == "true");
  this.proxyGroups       = (element.getAttribute("proxyGroups") == "true");
  this.proxyNews         = (element.getAttribute("proxyNews") == "true");
  this.proxyVideo        = (element.getAttribute("proxyVideo") == "true");
  this.proxyProducts     = (element.getAttribute("proxyProducts") == "true");
  this.proxyImages       = (element.getAttribute("proxyImages") == "true");
  this.proxyFinance      = (element.getAttribute("proxyFinance") == "true" || !element.getAttribute("proxyFinance"));
  this.proxyCode         = (element.getAttribute("proxyCode") == "true" || !element.getAttribute("proxyCode"));
  this.prefetcher        = new Prefetcher("https://", this.host, this.sslPort);
  this.setDefaultFilters();
};

Proxy.prototype.isPrefetchURL = function(url) {
  if (!this.enabled)        return false;

  for (var i=0;i<this.encryptedFilters.length;i++) {
    if (this.encryptedFilters[i].matchesURL(url)) {
      return true;
    }
  }

  return false;
};

Proxy.prototype.matchesURL = function(url) {
  if (!this.enabled) return false;

  for (var i=0;i<this.filters.length;i++) {
    if (this.filters[i].matchesURL(url)) {
      return true;
    }
  }

  return false;
};