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

var GoogleShare = {

  googleSharingManager: null,
  timerRunning: false,

  onLoad: function(event) {
    this.initializeGoogleSharingManager();
    this.registerStatusObserver();
    this.updateLocalStatus();
    this.updateShortStatusOption();
  },

  initializeGoogleSharingManager: function() {
    this.googleSharingManager = Components.classes['@thoughtcrime.org/googlesharingmanager;1']
    .getService().wrappedJSObject;
  },

  registerStatusObserver: function() {
    var observerService = Components.classes["@mozilla.org/observer-service;1"]
    .getService(Components.interfaces.nsIObserverService);
    observerService.addObserver(this, "googlesharing-status", false);
    observerService.addObserver(this, "googlesharing-activity", false);
    observerService.addObserver(this, "googlesharing-allproxiesfailed", false);
    observerService.addObserver(this, "googlesharing-proxyfailed-status", false);
  },

  displayNotificationNoAlertService: function(title, message) {
    var window = Components.classes['@mozilla.org/embedcomp/window-watcher;1']
    .getService(Components.interfaces.nsIWindowWatcher)
    .openWindow(null, 'chrome://global/content/alerts/alert.xul',
    		'_blank', 'chrome,titlebar=no,popup=yes',null);
    window.arguments = [null, title, message, false, ''];
  },

  displayNotification: function(title, message) {
    try {
      var alertsService = Components.classes["@mozilla.org/alerts-service;1"]  
      .getService(Components.interfaces.nsIAlertsService);  
      alertsService.showAlertNotification("chrome://googlesharing/content/images/googlesharing.png",   
					  title, message, false, "", null, "");  
    } catch (e) {
      this.displayNotificationNoAlertService(title, message);
    }
  },

  displayDisabledNotification: function() {
    this.displayNotification("GoogleSharing Disabled", 
			     "All proxies are currently unreachable, disabling GoogleSharing.");
  },

  displayProxyFailedNotification: function(proxyName) {
    this.displayNotification("Proxy temporarily disabled", 
			     proxyName + " has been temporarily disabled due to connectivity failure.");    
  },

  observe: function(subject, topic, data) {
    if (topic == "googlesharing-status") {
      this.updateLocalStatus();
    } else if (topic == "googlesharing-activity" && 
	       this.googleSharingManager.isEnabled() && 
	       !this.timerRunning) 
    {
      this.startActivityFlash();
    } else if (topic == "googlesharing-allproxiesfailed") {
      if (this.googleSharingManager.isEnabled()) {
	this.updateSystemStatus();
	this.displayDisabledNotification();
      }
    } else if (topic == "googlesharing-proxyfailed-status") {
      if (subject.wrappedJSObject) 
	subject = subject.wrappedJSObject;
      this.displayProxyFailedNotification(subject.remoteProxy.getHost());
    }

  },

  stopActivityFlash: function() {
    this.timerRunning = false;
    if (this.googleSharingManager.isEnabled()) {
      document.getElementById("googlesharing-panel").setAttribute("style", "color: green;");
    }
  },

  startActivityFlash: function() {
    this.timerRunning = true;
    document.getElementById("googlesharing-panel").setAttribute("style", "color: lime;");
    window.setTimeout(function(thisObj) { thisObj.stopActivityFlash(); }, 200, this);
  },

  setEnabledStatus: function() {
    if (this.googleSharingManager.isShortStatus())
      document.getElementById("googlesharing-panel").label="GS";
    else
      document.getElementById("googlesharing-panel").label="Google Sharing Enabled";

    document.getElementById("googlesharing-panel").setAttribute("style", "color: green;");
    document.getElementById("googlesharing-status-context").label = "Disable";
  },

  setDisabledStatus: function() {
    if (this.googleSharingManager.isShortStatus())
      document.getElementById("googlesharing-panel").label = "GS";
    else
      document.getElementById("googlesharing-panel").label = "Google Sharing Disabled"

    document.getElementById("googlesharing-panel").setAttribute("style", "color: red;");
    document.getElementById("googlesharing-status-context").label = "Enable";
  },

  updateSystemStatus: function() {
    this.googleSharingManager.setEnabled(!this.googleSharingManager.isEnabled());
    
    var observerService = Components.classes["@mozilla.org/observer-service;1"]
    .getService(Components.interfaces.nsIObserverService);  
    observerService.notifyObservers(observerService, "googlesharing-status", false);
  },

  updateLocalStatus: function() {
    (this.googleSharingManager.isEnabled() ? this.setEnabledStatus() : this.setDisabledStatus());
  },

  updateShortStatusOption: function() {
    if (this.googleSharingManager.isShortStatus())
      document.getElementById("googlesharing-status-length").label = "Long Status";
    else 
      document.getElementById("googlesharing-status-length").label = "Short Status";
  },

  onStatusBarClick: function(event) {
    if (event.button != 0) return;
    this.updateSystemStatus();
    this.updateLocalStatus();
  },

  onToggleShortStatus: function(event) {
    this.googleSharingManager.setShortStatus(!this.googleSharingManager.isShortStatus());
    this.updateShortStatusOption();
    this.updateLocalStatus();
  },

  isTaggable: function(document) {
    if (document.getElementById("googlesharing_addition") != null) {
      return false;
    }

    if (document.getElementById("lga") != null) {
      return true;
    }

    if (document.getElementById("subform_ctrl") != null) {
      return true;
    }

    if (document.getElementById("search") != null) {
      return true;
    }

    if (document.getElementById("result-count") != null) {
      return true;
    }

    return false;
  },

  getGoogleSharingElement: function(document, textNode, topMargin, leftMargin) {
    var element                 = document.createElement("div");
    element.id                  = "googlesharing_addition";
    element.style.fontSize      = "14px";
    element.style.paddingBottom = "10px";
    element.style.paddingTop    = topMargin;
    element.style.marginLeft    = leftMargin;
    element.appendChild(textNode);
    
    var linkNode = document.createElement("a");
    linkNode.setAttribute("href", "https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=37GLA89S6BLJQ");
    linkNode.appendChild(document.createTextNode("donated"));

    element.appendChild(linkNode);
    element.appendChild(document.createTextNode(" this month?"));

    return element;
  },

  addTagToMainPage: function(document, baseElement) {
    var textNode  = document.createTextNode("Search results will be anonymized by GoogleSharing, have you ");
    var gsElement = this.getGoogleSharingElement(document, textNode, "0px", "0px");
    baseElement.appendChild(gsElement);
  },

  addTagToSearchResults: function(document, baseElement) {
    var textNode = document.createTextNode("Search results anonymized by GoogleSharing, have you ");
    var gsElement = this.getGoogleSharingElement(document, textNode, "5px", "0px");
    baseElement.appendChild(gsElement);
  },

  addTagToMappingResults: function(document, baseElement) {
    var textNode = document.createTextNode("Mapping results anonymized by GoogleSharing, have you ");
    var gsElement = this.getGoogleSharingElement(document, textNode, "5px", "5px");
    baseElement.appendChild(gsElement);
  },

  addTagToProductResults: function(document, baseElement) {
    var textNode = document.createTextNode("Search results anonymized by GoogleSharing, have you ");
    var gsElement = this.getGoogleSharingElement(document, textNode, "0px", "0px");
    baseElement.appendChild(gsElement);
  },
  
  addTagToDocument: function(document) {    
    var baseElement;
    
    if        ((baseElement = document.getElementById("lga")) != null)
      this.addTagToMainPage(document, baseElement);
    else if ((baseElement = document.getElementById("subform_ctrl" )) != null)
      this.addTagToSearchResults(document, baseElement);
    else if ((baseElement = document.getElementById("search")) != null)
      this.addTagToMappingResults(document, baseElement);
    else if ((baseElement = document.getElementById("result-count")) != null)
      this.addTagToProductResults(document, baseElement);
    else
      return;
  },

  handleClassicRequest: function() {
    if (confirm("Disable GoogleSharing SSL upgrade?")) {
      this.googleSharingManager.getProxyManager().setUpgradeSsl(false);
      this.googleSharingManager.getProxyManager().savePreferences();      
      window.document.location="http://www.google.com/";
    }
  },

  addDowngradeLink: function(document) {
    if (this.googleSharingManager.getProxyManager().isUpgradeSsl()) {
      var linkElements = document.getElementsByTagName("a");

      for (var i=0;i<linkElements.length;i++) {
	var link = linkElements[i];

	if (link.getAttribute("href") == "http://www.google.com/") {
	  link.addEventListener("click", function() { GoogleShare.handleClassicRequest(); }, true);
	}
      }
    }
  },

  onContentLoad: function(event) {
    if (!(event.originalTarget instanceof HTMLDocument) ||
	(this.googleSharingManager == null)             ||
	!(this.googleSharingManager.isEnabled())) return;

    var document = event.originalTarget;

    if (this.googleSharingManager.getConnectionManager().getProxyForURL(document.location) == null) {
      return;
    }

    if (this.isTaggable(document)) {
      this.addTagToDocument(document);
      this.addDowngradeLink(document);
    }

    var ignore   = false;
    document.addEventListener("DOMNodeInserted", function(event) {
	if (GoogleShare.isTaggable(document)) {
	  ignore = true;
	  GoogleShare.addTagToDocument(document)
	}
      }, true);
  }
};

window.addEventListener("load", function(e) { GoogleShare.onLoad(e); }, false); 
window.document.addEventListener("DOMContentLoaded", function(e) {GoogleShare.onContentLoad(e);}, true);
