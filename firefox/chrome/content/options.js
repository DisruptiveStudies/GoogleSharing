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


var proxyManager;
var googleSharingManager;

function getProxyTree() {
  return document.getElementById("proxyTree");
}

function onOptionsLoad() {
  googleSharingManager = Components.classes['@thoughtcrime.org/googlesharingmanager;1']
    .getService().wrappedJSObject;
  proxyManager         = googleSharingManager.getProxyManager();
  update();
}

function onOptionsSave() {
  proxyManager.setUpgradeSsl(document.getElementById("upgrade-ssl").checked);
  proxyManager.savePreferences();
  issuePreferencesChangedNotification();

  return true;
}

function onRemoveProxy() {
  var tree = getProxyTree();
  proxyManager.removeProxyAtIndex(tree.currentIndex);
  update();
}

function onEditProxy() {
  var tree   = getProxyTree();
  var proxy  = proxyManager.getProxyAtIndex(tree.currentIndex);
  var retVal = {proxy: proxy};

  window.openDialog("chrome://googlesharing/content/addEditProxy.xul", "dialog2", "modal", retVal);
  update();
}

function onAddProxy() {
  var retVal = {proxy: null};
  window.openDialog("chrome://googlesharing/content/addEditProxy.xul", "dialog2", "modal", retVal).focus();

  if (retVal.proxy) {
    proxyManager.addProxy(retVal.proxy);
    update();
  }
}

function update() {
  document.getElementById("upgrade-ssl").checked = proxyManager.isUpgradeSsl();
  var proxyTree                                  = getProxyTree();

  proxyTree.view = {  
    rowCount : proxyManager.getProxyCount(),  
    
    getCellText : function(row, column) {
      var proxy = proxyManager.getProxyAtIndex(row);

      if      (column.id == "proxyHost")     return proxy.getHost();
      else if (column.id == "proxyHTTPPort") return proxy.getHTTPPort();
      else if (column.id == "proxySSLPort")  return proxy.getSSLPort();
    },  

    getCellValue: function(row, col) {
      return proxyManager.getProxyAtIndex(row).getEnabled();
    },

    setCellValue: function(row, col, val) {
      //      proxyManager.disableAllProxies()
      proxyManager.getProxyAtIndex(row).setEnabled(val == "true");
      update();
    },

    setTree: function(treebox){this.treebox = treebox; },  
    isContainer: function(row){return false;},  
    isSeparator: function(row){ return false; },  
    isSorted: function(){ return false; },  
    isEditable: function(row, column) {
      if (column.id == "proxyEnabled") return true;
      else                             return false;
    },
    getLevel: function(row){ return 0; },  
    getImageSrc: function(row,col){ return null; },  
    getRowProperties: function(row,props){},  
    getCellProperties: function(row,col,props){},  
    getColumnProperties: function(colid,col,props){}  
  };    

}

function issuePreferencesChangedNotification() {  
  googleSharingManager.update();
}


