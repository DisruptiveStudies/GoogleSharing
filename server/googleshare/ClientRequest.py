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

from twisted.web.http import Request
from twisted.internet import reactor

from IdentityProvider import IdentityProvider
from GoogleEncryptedConnectionFactory import GoogleEncryptedConnectionFactory
from GoogleConnectionFactory import GoogleConnectionFactory
from GoogleEncryptedConnection import GoogleEncryptedConnection
from GoogleConnection import GoogleConnection
from Cookie import Cookie
import LanguagePreferences

import re, logging

class ClientRequest(Request):

    validRequestExpressions = [re.compile(r"^(?:(?!chatenabled\.|mail\.|checkout\.|sites\.|docs\.|picasaweb\.|notebook\.|spreadsheets\.)[^.]+\.)?google\.com(?!\/accounts|\/a\/UniversalLogin|\/calendar\/|\/reader\/|\/health\/|\/notebook\/|\/webmaster)"),
                               re.compile(r".+\.gstatic\.com/.?"),
                               re.compile(r".+\.googlehosted\.com/.?"),
                               re.compile(r"(.+\.)?1e100\.net/.?")]

    identityCheckoutExpression = re.compile(r"^/fetchIdentity")
    identityUpdateExpression   = re.compile(r"^/updateIdentity\?.+")

    def __init__(self, channel, queued, reactor=reactor):
        Request.__init__(self, channel, queued)
        self.reactor          = reactor
        self.identityProvider = IdentityProvider.getInstance()

    def isVersionCompatible(self):
        return True

    def isIdentityUpdateRequest(self, path):
        if (path is None):
            return False

        return re.match(ClientRequest.identityUpdateExpression, path)

    def isIdentityCheckoutRequest(self, path):
        if (path is None):
            return False

        return re.match(ClientRequest.identityCheckoutExpression, path)

    def isValidConnectRequest(self, method, host):
        if (method is None or host is None ):
            return False

        return method == "CONNECT" and (host == "encrypted.google.com" or
                                        host == "clients1.google.com"  or
                                        host == "id.google.com")

    def isValidProxyRequest(self, method, host, path):
        if (host is None or path is None or method is None):
            return False

        if (method == "CONNECT"):
            return False
        
        for expression in ClientRequest.validRequestExpressions:
            if re.match(expression, host + path):
                return True

        return False

    def constructHeaders(self, identity, host, path):
        constructedHeaders               = dict()
        constructedHeaders['Host']       = self.getHeader('host')
        constructedHeaders['User-Agent'] = identity.getUserAgent()        

        if self.getHeader('accept') is not None:
            constructedHeaders['Accept']     = self.getHeader('accept')

        constructedHeaders['Accept-Encoding'] = 'gzip,deflate'
        constructedHeaders['Accept-Language'] = 'en-us,en;q=0.5'

        if self.getHeader('connection') is not None:
            constructedHeaders['Connection']  = self.getHeader('connection')
        elif self.getHeader('proxy-connection') is not None:
            constructedHeaders['Connection'] = self.getHeader('proxy-connection')

        if self.getHeader('keep-alive') is not None:
            constructedHeaders['Keep-Alive']  = self.getHeader('keep-alive')

        if self.getHeader('content-length') is not None:
            constructedHeaders['Content-Length'] = self.getHeader('content-length')

        cookie = identity.getCookies(host, path)

        if (cookie != None):
            logging.debug("Sending cookie: " + cookie)
            constructedHeaders['Cookie'] = cookie

        return constructedHeaders


    def fixUpPath(self, host, path):
        if (path == "" or path == "/"):
            if (host == "images.google.com"):
                path = "/imghp/"
            elif (host == "www.google.com" or host == "google.com"):
                path = "/webhp/"
            else:
                path = "/"

        return path

    def addPathVariablePrefix(self, path):
        if path.find("?") == -1:
            path += "?"
        else:
            path += "&"

        return path

    def addInterfaceLanguage(self, path, interfaceLanguage):
        if path.find("hl=") != -1:
            return path
        
        self.addPathVariablePrefix(path)

        path += ("hl=" + interfaceLanguage)

    def getPathFromLanguagePreferences(self, host, path):
        interfaceLanguage = self.getHeader("X-Interface-Lang")
        searchLanguage    = self.getHeader("X-Search-Lang")
        path              = self.fixUpPath(host, path.strip())

        if interfaceLanguage != None:
            path = self.addInterfaceLanguage(interfaceLanguage)

        if searchLanguage != None:
            path = self.addSearchLanguage(searchLanguage)

        return path

    def getPathFromUri(self):
        if (self.uri.find("http://") == 0):
            index = self.uri.find('/', 7)
            return self.uri[index:]

        return self.uri        

    def process(self):        
        host     = self.getHeader('host')
        path     = self.getPathFromUri()        
        path     = LanguagePreferences.getLanguifiedPath(host, path, 
                                                         self.getHeader("X-Interface-Lang"), 
                                                         self.getHeader("X-Search-Lang"))

        if (not self.isVersionCompatible()):
            logging.debug("Redirecting incompatible version...")
            self.redirectForUpgrade()
        elif (self.isValidConnectRequest(self.method, host)):
            logging.debug("Got connect request...")
            self.proxyEncryptedRequest();
        elif (self.isIdentityCheckoutRequest(path)):
            logging.debug("Got identity request...")
            self.processIdentityRequest()
        elif (self.isIdentityUpdateRequest(path)):
            logging.debug("Got identity update...")
            self.processIdentityUpdate(path)
        elif (self.isValidProxyRequest(self.method, host, path)):
            logging.debug("Got valid request...")
            self.proxyRequest(host, path)            
        else:
            logging.debug("Denying request: " + str(host) + str(path))
            self.denyRequest()            

    def proxyRequest(self, host, path):        
        identity = self.identityProvider.getIdentity(self.getClientIP())            
        logging.debug("Got identity: " + str(identity))
        headers  = self.constructHeaders(identity, host, path)
        
        self.content.seek(0,0)
        postData = self.content.read()

        connectionFactory          = GoogleConnectionFactory(self.method, path, postData, headers, identity, self)
        connectionFactory.protocol = GoogleConnection
        self.reactor.connectTCP(host, 80, connectionFactory, bindAddress=self.channel.factory.outgoingInterface)

    def proxyEncryptedRequest(self):
        connectionFactory          = GoogleEncryptedConnectionFactory(self)
        connectionFactory.protocol = GoogleEncryptedConnection
#        self.channel.setRawMode()        
        self.reactor.connectTCP("encrypted.google.com", 443, connectionFactory,
                                bindAddress=self.channel.factory.outgoingInterface)

    def redirectForUpgrade(self):
        self.setResponseCode(302, "Redirect")
        self.setHeader("Location", "http://www.googlesharing.net/upgrade.html")
        self.finish()

    def processIdentityUpdate(self, path):
        if ((not 'path' in self.args) or (not 'domain' in self.args) or (not 'cookie' in self.args)):
            self.setResponseCode(403)
            self.write("Tunneled path, host, and cookie not specified...")
            self.finish()
            return        

        pathForRequest   = self.args['path'][0]
        domainForRequest = self.args['domain'][0]
        cookieString     = self.args['cookie'][0]
        cookie           = Cookie(cookieString, domainForRequest, pathForRequest)
        identity         = self.identityProvider.getIdentity(self.getClientIP())

        identity.setCookie(cookie)
        self.setResponseCode(200, "OK")
        self.write(identity.serializeToJson())
        self.finish()
        
    def processIdentityRequest(self):
        # if ((not 'path' in self.args) or (not 'domain' in self.args)):
        #     self.setResponseCode(403)
        #     self.write("Tunneled path and host not specified...")
        #     self.finish()
        #     return

        # pathForRequest   = self.args['path'][0]
        # domainForRequest = self.args['domain'][0]
        # identity         = self.identityProvider.getIdentity(self.getClientIP())

        identity = self.identityProvider.getIdentity(self.getClientIP())
        self.setResponseCode(200, "OK")
        self.write(identity.serializeToJson())
        self.finish()

        # self.setResponseCode(200, "OK")
        # self.write(identity.serializeToJson(domainForRequest, pathForRequest))
        # self.finish()

    def denyRequest(self):
        self.setResponseCode(403, "Access Denied")
        self.setHeader("Connection", "close")
        self.write('<html>The request you issued is not authorized for GoogleSharing.\nPerhaps you need to <a href="https://addons.mozilla.org/en-US/firefox/addon/60333">upgrade your GoogleSharing Addon</a>?</html>')
        self.finish()
