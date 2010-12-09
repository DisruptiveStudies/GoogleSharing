/*
 * Copyright (c) 2010 Moxie Marlinspike
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License as
 * published by the Free Software Foundation; either version 2 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307
 * USA
 */

function Cookie(jsonObject) {
  this.name   = jsonObject.name;
  this.value  = jsonObject.value;
  this.domain = jsonObject.domain;
  this.path   = jsonObject.path;
}

Cookie.prototype.isValidFor = function(domain, path) {
  if (this.domain[0] == '.') {
    return (this.endsWith(domain, this.domain)) && (path.indexOf(this.path) == 0);
  } else {
    return ((domain == this.domain) || (this.endsWith(domain, "." + this.domain))) && (path.indexOf(this.path) == 0);
  }  
};

Cookie.prototype.endsWith = function(str, endswith) {
  return str.length >= endswith.length && str.substr(str.length - endswith.length) == endswith;
};

Cookie.prototype.serialize = function() {
  return this.name + "=" + this.value + " ; ";
};