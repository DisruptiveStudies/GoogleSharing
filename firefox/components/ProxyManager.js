
var EXTENSION_ID = "googlesharing@extension.thoughtcrime.org";

function ProxyManager() {
  this.enabled      = true;
  this.shortStatus  = false;
  this.upgradeToSsl = true;
  this.proxies      = new Array();
  this.loadPreferences();
}

ProxyManager.prototype.isUpgradeSsl = function() {
  return this.upgradeToSsl;
};

ProxyManager.prototype.setUpgradeSsl = function(value) {
  this.upgradeToSsl = value;
};

ProxyManager.prototype.isShortStatus = function() {
  return this.shortStatus;
};

ProxyManager.prototype.setShortStatus = function(val) {
  this.shortStatus = val;
};

ProxyManager.prototype.isEnabled = function() {
  return this.enabled;
};

ProxyManager.prototype.setEnabled = function(val) {
  this.enabled = val;
};

ProxyManager.prototype.getProxyCount = function() {
  return this.proxies.length;
};

ProxyManager.prototype.addProxy = function(proxy) {
  this.proxies.push(proxy);
};

ProxyManager.prototype.insertProxy = function(proxy, index) {
  this.proxies.splice(index, 0, proxy);
};

ProxyManager.prototype.getProxyList = function() {
  return this.proxies;
};

ProxyManager.prototype.getProxyAtIndex = function(index) {
  return this.proxies[index];
};

ProxyManager.prototype.removeProxyAtIndex = function(index) {
  this.proxies.splice(index, 1);
};

ProxyManager.prototype.getSettingsFile = function() {
  var directoryService = Components.classes["@mozilla.org/file/directory_service;1"].
  getService(Components.interfaces.nsIProperties);

  var file = directoryService.get("ProfD", Components.interfaces.nsIFile);
  file.append("googlesharing.xml");
  
  return file;
};

ProxyManager.prototype.getSettingsInputStream = function(file) {
  var inputStream = Components.classes["@mozilla.org/network/file-input-stream;1"]
  .createInstance(Components.interfaces.nsIFileInputStream);
  inputStream.init(file, -1, -1, Components.interfaces.nsIFileInputStream.CLOSE_ON_EOF);

  return inputStream;
};

ProxyManager.prototype.getSettingsOutputStream = function() {
  var file         = this.getSettingsFile();
  var outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
  createInstance(Components.interfaces.nsIFileOutputStream);
  outputStream.init(file, 0x02 | 0x08 | 0x20, 0664, 0);
  return outputStream;
};

ProxyManager.prototype.getInputSettingsObject = function() {
  var file        = this.getSettingsFile();
  if (!file.exists()) return null;
    
  var inputStream = this.getSettingsInputStream(file);
  var parser      = Components.classes["@mozilla.org/xmlextras/domparser;1"]
  .createInstance(Components.interfaces.nsIDOMParser);
  var object      = parser.parseFromStream(inputStream, null, file.fileSize, "text/xml");  
  if (!object || object.documentElement.nodeName == "parsererror") return null;

  return object;
};

ProxyManager.prototype.savePreferences = function() {
  var outputStream = this.getSettingsOutputStream();
  var serializer   = Components.classes["@mozilla.org/xmlextras/xmlserializer;1"]
  .createInstance(Components.interfaces.nsIDOMSerializer);
  var xmlDocument  = Components.classes["@mozilla.org/xml/xml-document;1"]
  .createInstance(Components.interfaces.nsIDOMDocument);

  var rootElement    = xmlDocument.createElement("googlesharing");
  rootElement.setAttribute("enabled", this.enabled);
  rootElement.setAttribute("shortStatus", this.shortStatus);
  rootElement.setAttribute("upgrade-ssl", this.upgradeToSsl);

  var proxiesElement = xmlDocument.createElement("proxies");
  rootElement.appendChild(proxiesElement);

  for (key in this.proxies) {
    var proxyElement = this.proxies[key].serialize(xmlDocument);
    proxiesElement.appendChild(proxyElement);
  }

  outputStream.write("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n", 39);
  serializer.serializeToStream(rootElement, outputStream, "UTF-8");
};

ProxyManager.prototype.disableAllProxies = function() {
  for (key in this.proxies) {
    this.proxies[key].setEnabled(false)
  }
};

ProxyManager.prototype.getDefaultProxy = function() {
  var proxy = new Proxy();
  proxy.setHost("proxy.googlesharing.net");
  proxy.setSSLPort(443);
  proxy.setHTTPPort(80);
  proxy.setSSLEnabled(true);
  proxy.setEnabled(true);
  proxy.setInterfaceLanguage("en");
  proxy.setSearchLanguage("all");
  return proxy;
};

ProxyManager.prototype.loadPreferences = function() {
  var settings = this.getInputSettingsObject();

  if (!settings) {
    var proxy = this.getDefaultProxy();
    this.proxies.push(proxy)
    return;
  }

  var rootElement   = settings.getElementsByTagName("googlesharing");
  this.enabled      = (rootElement.item(0).getAttribute("enabled") == "true");
  this.shortStatus  = (rootElement.item(0).getAttribute("shortStatus") == "true");
  this.upgradeToSsl = (rootElement.item(0).getAttribute("upgrade-ssl") == "true");

  if (!rootElement.item(0).hasAttribute("upgrade-ssl")) {
    this.upgradeToSsl = true;
  }

  var proxyElements = settings.getElementsByTagName("proxy");

  for (var i=0;i<proxyElements.length;i++) {
    var element = proxyElements.item(i);
    element.QueryInterface(Components.interfaces.nsIDOMElement);

    var proxy = new Proxy();
    proxy.deserialize(element);

    this.proxies.push(proxy);
  }
};
