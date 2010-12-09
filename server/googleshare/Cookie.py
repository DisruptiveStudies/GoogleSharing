# Copyright (c) 2010 Moxie Marlinspike
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License as
# published by the Free Software Foundation; either version 3 of the
# License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful, but
# WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
# General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307
# USA
#

import string, logging

class Cookie:

    def __init__(self, cookieString, domain, path):
        tokens     = string.split(cookieString, ";")        
        nameValue  = string.split(tokens[0], "=", 1)
        
        self.name  = nameValue[0].strip()
        self.value = nameValue[1].strip()

        parameters = self.parseCookieParameters(tokens)

        if 'domain' in parameters:
            self.domain = parameters['domain'].strip()
        else:
            self.domain = domain

        if 'path' in parameters:
            self.path = parameters['path'].strip()
        else:
            self.path = self.stripDownPath(path)

    def stripDownPath(self, path):
        argIndex = path.find('?')

        if argIndex != -1:
            path = path[:argIndex]
        
        lastSlash = path.rfind("/")

        if lastSlash == -1:
            return "/"

        return path[:lastSlash+1]

    def parseCookieParameters(self, tokens):
        parameters = dict()

        for i in range(1, len(tokens)):
            nameValue                = string.split(tokens[i], "=", 1)
            if len(nameValue) > 1:
                parameters[nameValue[0].strip()] = nameValue[1]

        return parameters

    def serialize(self):
        return self.name + "=" + self.value + " ; "

    def isValidFor(self, domain, path):
         if self.domain[0] == '.':
             return domain.endswith(self.domain) and path.startswith(self.path)
         else:
             return (domain == self.domain or domain.endswith('.' + self.domain)) and path.startswith(self.path)         
        
    def __hash__(self):
        return self.name.__hash__()

    def __eq__(self, other):
        return self.name.__eq__(other.name)

    def __ne__(self, other):
        return self.name.__ne__(other.name)

    def __gt__(self, other):
        return self.name.__gt__(other.name)

    def __ge__(self, other):
        return self.name.__ge__(other.name)
