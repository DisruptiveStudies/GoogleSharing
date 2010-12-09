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


function getSearchLanguageCheckboxes() {
  return document.getElementById("googlesharing-search-language").getElementsByTagName("checkbox");
}

function getSearchLanguage() {
  var all = document.getElementById("lang_all");

  if (all.checked) {
    return "all";
  }

  var checkboxes     = getSearchLanguageCheckboxes();
  var languageString = "";
  var i;

  for (i=0;i<checkboxes.length;i++) {
    if (checkboxes[i].checked) {
      if (languageString == "") {
	languageString = checkboxes[i].id;
      } else {
	languageString += "|" + checkboxes[i].id;
      }
    }
  }

  if (languageString == "") {
    return "all";
  } else {
    return languageString;
  }
}

function registerAllLanguageListener() {
  var allLanguageBox = document.getElementById("lang_all");
  
  allLanguageBox.onclick = function() {
    setAllLanguages(allLanguageBox.checked);
  }
}

function setAllLanguages(enabled) {
  var checkboxes = getSearchLanguageCheckboxes();
  var i;

  for (i=0;i<checkboxes.length;i++) {
    if (checkboxes[i].id != "lang_all") {
      checkboxes[i].enabled  = !enabled;
      checkboxes[i].disabled = enabled;
    }
  }
}


function setInterfaceLanguage(interfaceLanguage) {
  var interfaceList = document.getElementById("interface-language");
  var i;
  
  for (i=0;i<interfaceList.itemCount;i++) {
    var item = interfaceList.getItemAtIndex(i);
    if (item.value == interfaceLanguage) {
      interfaceList.selectedIndex = i;
      return;
    }
  }  
}

function setSearchLanguage(searchLanguage) {
  if (searchLanguage == "all") {
    document.getElementById("lang_all").checked = true;
    setAllLanguages(true);
    return;
  }

  var checkboxes      = getSearchLanguageCheckboxes();
  var searchLanguages = searchLanguage.split('|');
  var i;
  var j;

  for (i=0;i<checkboxes.length;i++) {
    for (j=0;j<searchLanguages.length;j++) {
      if (checkboxes[i].id == searchLanguages[j]) {
	checkboxes[i].checked = true;
      }
    }
  }
}

function onDialogLoad() {
  registerAllLanguageListener();
  var retVal = window.arguments[0];

  if (retVal.proxy) {
    var proxy = retVal.proxy;
    document.getElementById("proxy-host").value = proxy.getHost();
    document.getElementById("ssl-port").value   = proxy.getSSLPort();
    document.getElementById("http-port").value  = proxy.getHTTPPort();
    document.getElementById("use-ssl").checked  = proxy.isSSLEnabled();

    setInterfaceLanguage(proxy.getInterfaceLanguage());
    setSearchLanguage(proxy.getSearchLanguage());

    document.getElementById("maps").checked     = !proxy.getProxyMaps();
    document.getElementById("groups").checked   = !proxy.getProxyGroups();
    document.getElementById("video").checked    = !proxy.getProxyVideo();
    document.getElementById("products").checked = !proxy.getProxyProducts();
    document.getElementById("news").checked     = !proxy.getProxyNews();
    document.getElementById("images").checked   = !proxy.getProxyImages();
    document.getElementById("finance").checked  = !proxy.getProxyFinance();
    document.getElementById("code").checked     = !proxy.getProxyCode();

  } else {
    setInterfaceLanguage("en");
    setSearchLanguage("all");
  }
}


function onDialogOK() {  
  var host              = document.getElementById("proxy-host").value;
  var sslPort           = document.getElementById("ssl-port").value;
  var httpPort          = document.getElementById("http-port").value;
  var interfaceLanguage = document.getElementById("interface-language").selectedItem.value;
  var searchLanguage    = getSearchLanguage();

  if (!host || !sslPort || !httpPort ) {
    alert("Sorry, you  must specify a host and ports.");
    return false;
  }

  var retVal = window.arguments[0];
  var proxy;

  if (retVal.proxy) {
    proxy = retVal.proxy;
  } else {
    var googleSharingManager = Components.classes['@thoughtcrime.org/googlesharingmanager;1']
      .getService().wrappedJSObject;
    proxy = googleSharingManager.getNewProxy();
  }

  proxy.setHost(host);
  proxy.setSSLPort(sslPort);
  proxy.setHTTPPort(httpPort);
  proxy.setSSLEnabled(document.getElementById("use-ssl").checked);
  proxy.setInterfaceLanguage(interfaceLanguage);
  proxy.setSearchLanguage(searchLanguage);

  proxy.setProxyMaps(!document.getElementById("maps").checked);
  proxy.setProxyGroups(!document.getElementById("groups").checked);
  proxy.setProxyVideo(!document.getElementById("video").checked);
  proxy.setProxyProducts(!document.getElementById("products").checked);
  proxy.setProxyNews(!document.getElementById("news").checked);
  proxy.setProxyImages(!document.getElementById("images").checked);
  proxy.setProxyFinance(!document.getElementById("finance").checked);
  proxy.setProxyCode(!document.getElementById("code").checked);

  proxy.setDefaultFilters();

  retVal.proxy = proxy;

  return true;
}

