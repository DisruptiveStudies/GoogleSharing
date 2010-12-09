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

from random import choice
from Identity import Identity
from ActiveIdentityPool import ActiveIdentityPool
from signal import signal, SIGTERM, SIGINT, SIGQUIT
import os, pickle, logging
import UserAgentsFirefox

class IdentityProvider:    

    BASE_IDENTITY_SIZE = 30
    _instance          = None

    def __init__(self):
        self.identityPool     = set()
        self.peggedIdentities = ActiveIdentityPool(self.identityExpired, 90)
        self.stateFile        = self.getStateFile()

        self.refillIdentityPool()
        self.unserializeIdentities()

        signal(SIGTERM, self.shutdownHandler)
        signal(SIGINT, self.shutdownHandler)

    def shutdownHandler(self, signum, frame):
        logging.warning("Shutting down...")
        self.serializeIdentities()
        os._exit(0)

    def refillIdentityPool(self):
        for i in range(IdentityProvider.BASE_IDENTITY_SIZE):
            self.identityPool.add(Identity(choice(UserAgentsFirefox.list)))        

    def getIdentity(self, ip):
        if ip in self.peggedIdentities:
            return self.peggedIdentities[ip]
        elif len(self.identityPool) > 0:
            identity = self.identityPool.pop()
            self.peggedIdentities[ip] = identity
            return identity
        else:
            self.refillIdentityPool()
            return self.getIdentity(ip)

    def identityExpired(self, ip, identity):
        logging.debug("Putting identity back into pool...")
        self.identityPool.add(identity)

    def getStateFile(self):
        if (not os.path.isdir("/var/googleshare/")):
            os.mkdir("/var/googleshare/")

        if (not os.path.exists("/var/googleshare/state")):
            open("/var/googleshare/state", "w").close()

        stateFile = open("/var/googleshare/state", "r+")
        return stateFile

    def serializeIdentities(self):
        self.stateFile.seek(0)
        
        for identity in self.peggedIdentities:
            self.identityPool.add(identity)

        logging.debug("Dumping identity pool: " + str(self.identityPool))
        pickle.dump(self.identityPool, self.stateFile)
        self.stateFile.truncate()
        self.stateFile.close()

    def unserializeIdentities(self):        
        try:
            self.stateFile.seek(0)
            self.identityPool = pickle.load(self.stateFile)
        except:
            logging.warning("Error unserializing identities, either state file was corrupted, or this is your first run.  Proceeding with no or partial state cache...")

    def getInstance():
        if IdentityProvider._instance == None:
            IdentityProvider._instance = IdentityProvider()

        return IdentityProvider._instance

    getInstance = staticmethod(getInstance)
