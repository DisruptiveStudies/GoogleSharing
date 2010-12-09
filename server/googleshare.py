#!/usr/bin/env python
"""googleshare implements Moxie Marlinspike's GoogleSharing system."""

__author__ = "Moxie Marlinspike"
__email__  = "moxie@thoughtcrime.org"
__license__= """
Copyright (c) 2010 Moxie Marlinspike <moxie@thoughtcrime.org>

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License as
published by the Free Software Foundation; either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but
WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307
USA

"""

from twisted.internet import epollreactor
epollreactor.install()

from twisted.web import http
from twisted.internet import reactor
from OpenSSL import SSL
from googleshare.GoogleProxy import GoogleProxy
from googleshare.IdentityProvider import IdentityProvider
from googleshare.ThreadDumpServer import ThreadDumpServer

import sys, string, os, getopt, logging, pwd, grp, googleshare.daemonize

gVersion = "0.19"

class ServerContextFactory:

    def __init__(self, cert, key):
        self.cert         = cert
        self.key          = key

    def getContext(self):
        ctx = SSL.Context(SSL.TLSv1_METHOD)
        ctx.use_certificate_chain_file(self.cert)
        ctx.use_privatekey_file(self.key)

        return ctx

def parseOptions(argv):
    incomingInterface = ''
    outgoingInterface = None
    certFile          = '/etc/ssl/certs/googlesharing.pem'
    keyFile           = '/etc/ssl/private/googlesharing.key'
    logLevel          = logging.INFO
    sslListenPort     = 443
    httpListenPort    = 80
    background        = True
    psyco             = False

    try:
        opts, args = getopt.getopt(argv, "c:k:s:p:i:o:afdh")

        for opt, arg in opts:
            if opt in ("-c"):
                certFile = arg
            elif opt in ("-k"):
                keyFile = arg
            elif opt in ("-s"):
                sslListenPort = arg
            elif opt in ("-p"):
                httpListenPort = arg
            elif opt in ("-d"):
                logLevel = logging.DEBUG
            elif opt in ("-f"):
                background = False
            elif opt in ("-a"):
                psyco      = True
            elif opt in ("-i"):
                incomingInterface = arg
            elif opt in ("-o"):
                outgoingInterface = (arg, 0)
            elif opt in ("-h"):
                usage()
                sys.exit()
        
        return (certFile, keyFile, sslListenPort, httpListenPort, logLevel, background, psyco, incomingInterface, outgoingInterface)

    except getopt.GetoptError:
        usage()
        sys.exit(2)
                
def usage():
    print "\ngoogleshare " + str(gVersion) + " by Moxie Marlinspike"
    print "usage: googleshare <options>\n"
    print "Options:"
    print "-c <path>      Location of SSL certificate file."
    print "-k <path>      Location of SSL key file (no password)."
    print "-s <port>      SSL port to listen on."
    print "-p <port>      HTTP port to listen on."
    print "-i <address>   IP address to listen on for incoming connections (optional)."
    print "-o <address>   IP address to bind to for making outgoing connections (optional)."
    print "-f             Run in foreground."
    print "-d             Debug mode."
    print "-h             Print this help message."
    print "-a             Accelerate with psyco."
    print ""

def writePidFile():
    pidFile = open("/var/run/googleshare.pid", "wb")
    pidFile.write(str(os.getpid()))
    pidFile.close()
    
def dropPrivileges():
    nobody = pwd.getpwnam('nobody')
    adm    = grp.getgrnam('nogroup')
    
    os.setgroups([adm.gr_gid])
    os.setgid(adm.gr_gid)
    os.setuid(nobody.pw_uid)

def initializeLogging(logLevel):
    logging.basicConfig(filename="/var/log/googleshare.log",level=logLevel, 
                        format='%(asctime)s %(message)s',filemode='a')        

    logging.info("GoogleSharing Proxy started...")

def initializeIdentities():
    IdentityProvider.getInstance()

def initializePsyco():
    try:
        import psyco
        psyco.full()
    except ImportError:
        logging.warning("psyco not available!  apt-get install python-psyco")

def initializeThreadDumpServer(port):
    if port != -1:
        ThreadDumpServer(port).start()

def main(argv):
    (certFile, keyFile, sslListenPort, 
     httpListenPort, logLevel, background, 
     psyco, incomingInterface, outgoingInterface) = parseOptions(argv)
    proxyFactory                                  = http.HTTPFactory(timeout=10)
    proxyFactory.protocol                         = GoogleProxy
    proxyFactory.outgoingInterface                = outgoingInterface

    reactor.listenSSL(int(sslListenPort), proxyFactory, ServerContextFactory(certFile, keyFile), interface=incomingInterface)
    reactor.listenTCP(int(httpListenPort), proxyFactory, interface=incomingInterface)
    
    initializeLogging(logLevel)
    initializeIdentities()

    if background:
        print "\ngoogleshare " + str(gVersion) + " by Moxie Marlinspike backgrounding..."
        googleshare.daemonize.createDaemon()
    else:
        print "\ngoogleshare " + str(gVersion) + " by Moxie Marlinspike running..."

    writePidFile()
    dropPrivileges()                

    if psyco:
        initializePsyco()

    reactor.run()

if __name__ == '__main__':
    main(sys.argv[1:])
