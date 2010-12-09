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

function LanguagePreferences(interfaceLanguage, searchLanguage) { 
  this.interfaceLanguage = interfaceLanguage;
  this.searchLanguage    = searchLanguage;
}

LanguagePreferences.prototype.fixUpPath = function(host, path) {
  if (path == "" || path == "/") {
    if ((host == "www.google.com") || (host == "encrypted.google.com")) {
      path = "/webhp";
    }
  }

  return path;
};

LanguagePreferences.prototype.addPathVariablePrefix = function(path) {
  if (path.indexOf("?") == -1) {
    path += "?";
  } else {
    path += "&";
  }

  return path;
};

LanguagePreferences.prototype.addSearchLanguage = function(path, searchLanguage) {
  if (path.indexOf("lr=") != -1) {
    return path;
  }

  if ((path.indexOf("/intl/") != -1) || (path.indexOf("/en/") != -1)) {
    return path;
  }

  path  = this.addPathVariablePrefix(path);
  path += ("lr=" + searchLanguage);

  return path;
};

LanguagePreferences.prototype.addInterfaceLanguage = function(path, interfaceLanguage) {
  if (path.indexOf("hl=") != -1) {
    return path;
  }

  if ((path.indexOf("/intl") != -1) || (path.indexOf("/en/") != -1)) {
    return path;
  }

  path  = this.addPathVariablePrefix(path);
  path += ("hl=" + interfaceLanguage);

  return path;
};

LanguagePreferences.prototype.isLanguifiable = function(host, path) {
  if ((host != "www.google.com") && (host != "encrypted.google.com")) {
    return false;
  }

  if (path.indexOf("/accounts/") != -1) {
    return false;
  }

  return true;
};

LanguagePreferences.prototype.getLanguifiedPath = function(host, path) {
  dump("Languifying: " + host + path + "\n");

  if (!this.isLanguifiable(host, path)) {
    return path;
  }

  path = this.fixUpPath(host, path);

  dump("Fixed up path: " + path + "\n");
  
  if (this.interfaceLanguage != null) {
    path = this.addInterfaceLanguage(path, this.interfaceLanguage);
  }

  if (this.searchLanguage != null) {
    path = this.addSearchLanguage(path, this.searchLanguage);
  }

  dump("Languified path: " + path + "\n");

  return path;
};

