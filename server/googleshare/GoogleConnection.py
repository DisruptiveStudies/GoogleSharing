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

import re, string, logging

from twisted.web.http import HTTPClient

from Cookie import Cookie

class GoogleConnection(HTTPClient):

    disallowedHeaders = ['set-cookie']

    def __init__(self, command, uri, postData, headers, identity, client):
        self.command          = command
        self.uri              = uri
        self.postData         = postData
        self.headers          = headers
        self.identity         = identity
        self.client           = client        
        self.shutdownComplete = False

    def sendRequest(self):
        self.sendCommand(self.command, self.uri)

    def sendHeaders(self):
        for header, value in self.headers.items():
            self.sendHeader(header, value)

        self.endHeaders()

    def sendPostData(self):
        self.transport.write(self.postData)

    def connectionMade(self):
        self.sendRequest()
        self.sendHeaders()
        
        if (self.command == 'POST'):
            self.sendPostData()

    def handleStatus(self, version, code, message):
        self.client.setResponseCode(int(code), message)

    def handleHeader(self, key, value):
        if (not key.lower() in GoogleConnection.disallowedHeaders):
            self.client.setHeader(key, value)
        elif (key.lower() == 'set-cookie'):
            logging.debug("Adding cookie to collection: " + value)
            self.identity.setCookie(Cookie(value, self.headers['Host'], self.uri))

    def handleEndHeaders(self):
        if (self.length == 0):
            self.shutdown()
            
    def handleResponsePart(self, data):
        self.client.write(data)

    def handleResponseEnd(self):
        self.shutdown()

    def shutdown(self):
        if not self.shutdownComplete:
            self.shutdownComplete = True
            self.client.finish()
            self.transport.loseConnection()
