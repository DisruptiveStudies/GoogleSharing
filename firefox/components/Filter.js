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

function Filter() {
  this.name    = null;
  this.pattern = null;
  this.regexp  = null;
  this.enabled = false;
}

Filter.prototype.getName = function() {
  return this.name;
};

Filter.prototype.setName = function(name) {
  this.name = name;
};

Filter.prototype.getExpression = function() {
  return this.pattern;
};

Filter.prototype.setExpression = function(expression) {
  this.pattern = expression;
  this.regexp  = new RegExp(this.pattern);
};

Filter.prototype.getEnabled = function() {
  return this.enabled;
};

Filter.prototype.setEnabled = function(value) {
  this.enabled = value;
};

Filter.prototype.matchesURL = function(url) {
  if (!this.enabled) return false;

  return this.regexp.test(url);
};

Filter.prototype.serialize = function(xmlDocument) {
  var filterElement = xmlDocument.createElement("filter");
  filterElement.setAttribute("name", this.name);
  filterElement.setAttribute("pattern", this.pattern);
  filterElement.setAttribute("enabled", this.enabled);

  return filterElement;
};

Filter.prototype.deserialize = function(element) {
  this.name    = element.getAttribute("name");
  this.pattern = element.getAttribute("pattern");
  this.enabled = (element.getAttribute("enabled") == "true");

  if (this.pattern && this.pattern != "") {
    this.regexp = new RegExp(this.pattern);
  }
};
