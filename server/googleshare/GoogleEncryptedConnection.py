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

from twisted.internet.protocol import BaseProtocol

class GoogleEncryptedConnection(BaseProtocol):

    def __init__(self, client):
        self.client           = client        
#        self.shutdownComplete = False

    def connectionMade(self):
        self.client.channel.proxyConnection = self
        self.client.channel.setRawMode()
        self.client.transport.write("HTTP/1.0 200 Connection established\r\n")
        self.client.transport.write("Proxy-Agent: GoogleSharing\r\n\r\n")
#        self.client.setResponseCode(200, "Connection established")
#        self.client.finish()

    def dataReceived(self, data):
        self.client.transport.write(data)

    def connectionLost(self, reason):
        self.client.transport.loseConnection()
#        if not self.shutdownComplete:
#           self.shutdownComplete = True

