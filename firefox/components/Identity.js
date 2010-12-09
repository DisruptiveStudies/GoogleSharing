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

function Identity(jsonObject) {
  this.userAgent = jsonObject.userAgent;
  this.cookies   = new Array();

  for (var i=0;i<jsonObject.cookies.length;i++) {
    this.cookies.push(new Cookie(jsonObject.cookies[i]));
  }
}

Identity.prototype.getUserAgent = function() {
  return this.userAgent;
};

Identity.prototype.getCookies = function(domain, path) {
  var serializedCookies = "";

  for (var i=0;i<this.cookies.length;i++) {
    if (this.cookies[i].isValidFor(domain, path)) {
      serializedCookies = serializedCookies + this.cookies[i].serialize();
    }
  }

  if (serializedCookies == "") return null;
  else                         return serializedCookies;
}
  