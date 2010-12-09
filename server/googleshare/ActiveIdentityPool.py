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

import time, logging

class Node(object):
#    __slots__ = ['prev', 'next', 'me', 'expire']
    def __init__(self, prev, me, expire):
        self.prev = prev
        self.me = me
        self.next = None
        self.expire = expire

class ActiveIdentityPool:
    """
    Implementation of a length-limited O(1) LRU queue.
    Built for and used by PyPE:
    http://pype.sourceforge.net
    Copyright 2003 Josiah Carlson.

    Modified 2010 by Moxie Marlinspike for lazy/asynchronous expiration.
    """

    def __init__(self, expirationListener, timeout):
        self.d                  = {}
        self.first              = None
        self.last               = None
        self.timeout            = timeout
        self.expirationListener = expirationListener

    def checkForExpiration(self):
        currentTime = time.time()
        cur         = self.first

        while cur != None:
            cur2 = cur.next

            if (cur.expire <= currentTime):
                logging.debug("Expiring: " + cur.me[0])
                self.expirationListener(cur.me[0], cur.me[1])
                del self[cur.me[0]]
            else:
                return

            cur = cur2        

    def __contains__(self, obj):
        self.checkForExpiration()
        return obj in self.d

    def __getitem__(self, obj):
        a = self.d[obj].me
        self[a[0]] = a[1]
        return a[1]

    def __setitem__(self, obj, val):
        if obj in self.d:
            del self[obj]

        nobj = Node(self.last, (obj, val), time.time() + self.timeout)

        if self.first is None:
            self.first = nobj
        if self.last:
            self.last.next = nobj

        self.last   = nobj
        self.d[obj] = nobj

    def __delitem__(self, obj):
        nobj = self.d[obj]
        if nobj.prev:
            nobj.prev.next = nobj.next
        else:
            self.first = nobj.next
        if nobj.next:
            nobj.next.prev = nobj.prev
        else:
            self.last = nobj.prev
        del self.d[obj]

    def __iter__(self):
        cur = self.first
        while cur != None:
            cur2 = cur.next
            yield cur.me[1]
            cur = cur2

    def iteritems(self):
        cur = self.first
        while cur != None:
            cur2 = cur.next
            yield cur.me
            cur = cur2

    def iterkeys(self):
        return iter(self.d)

    def itervalues(self):
        for i,j in self.iteritems():
            yield j

    def keys(self):
        return self.d.keys()

    def __str__(self):
        value = "list(["

        cur = self.first
        while cur != None:
            cur2 = cur.next
            value += "<" + str(cur.me[0]) + "," + str(cur.me[1]) + ">, "
            cur = cur2


        value += "])"
        return value

