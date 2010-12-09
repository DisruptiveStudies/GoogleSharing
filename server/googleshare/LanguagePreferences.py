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

import re

parameterizedRequestExpression = re.compile(r"^(?:(?!desktop\.|labs\.|sketchup\.|earth\.|picasa\.)[^.]+\.)?google\.com(?!\/governmentrequests\/|\/analytics\/|\/googlephone\/|\/goog-411|\/options|\/talk|\/mobile)")

def _fixUpPath(host, path):
    if (path == "" or path == "/"):
        if (host == "images.google.com"):
            path = "/imghp"
        elif (host == "www.google.com" or host == "google.com"):
            path = "/webhp"
        else:
            path = "/"
            
    return path

def _addPathVariablePrefix(path):
    if path.find("?") == -1:
        path += "?"
    else:
        path += "&"
        
    return path

def _addIntlPrefix(host, path, interfaceLanguage):
    if host.startswith("desktop."):
        return "/" + interfaceLanguage + "/" + path
    
    if host.startswith("earth."):
        return "/intl/" + interfaceLanguage + "/" + path
    
    if host.startswith("picasa."):
        return "/intl/" + interfaceLanguage + "/" + path

    if host.startswith("sketchup."):
        return "/intl/" + interfaceLanguage + "/" + path

    if path.endswith("/goog-411/"):
        return "/intl/" + interfaceLanguage + path

    if path.endswith("/options/"):
        return "/intl/" + interfaceLanguage + path

    if path.endswith("/talk/"):
        return "/intl/" + interfaceLanguage + path

    if path.endswith("/mobile/"):
        return "/intl/" + interfaceLanguage + path

    if path.endswith("/governmentrequests/"):
        return "/intl/" + interfaceLanguage + path

    return path

def _isParameterizable(host, path):
    return re.match(parameterizedRequestExpression, host + path)

def _addSearchLanguage(path, searchLanguage):
    if path.find("lr=") != -1:
        return path

    if path.find("/intl/") != -1 or path.find("/en/") != -1:
        return path
    
    path = _addPathVariablePrefix(path)
    
    path += ("lr=" + searchLanguage)
    return path
    
def _addInterfaceLanguage(host, path, interfaceLanguage):
    if path.find("hl=") != -1:
        return path
    
    if path.find("/intl/") != -1 or path.find("/en/") != -1:
        return path

    if _isParameterizable(host, path):
        path = _addPathVariablePrefix(path)    
        path += ("hl=" + interfaceLanguage)
    else:
        path = _addIntlPrefix(host, path, interfaceLanguage)

    return path

def _isLanguifiable(host, path):
    if (path[-1] != '/' and path.find("?") == -1 and path.find("products") == -1 and not host == "finance.google.com"):
        return False
    
    return True

def getLanguifiedPath(host, path, interfaceLanguage, searchLanguage):
    if not _isLanguifiable(host, path):
        return path

    path = _fixUpPath(host, path.strip())
    
    if interfaceLanguage != None:
        path = _addInterfaceLanguage(host, path, interfaceLanguage)
        
    if searchLanguage != None:
        path = _addSearchLanguage(path, searchLanguage)
            
    return path
