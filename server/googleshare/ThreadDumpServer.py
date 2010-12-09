
import threading
import sys
import traceback
import socket
import logging

class ThreadDumpServer(threading.Thread):
    
    def __init__(self, port):
        threading.Thread.__init__(self)
        self.port = port

    def dumpThreads(self):
        code = []
        for threadId, stack in sys._current_frames().items():
            code.append("\n# ThreadID: %s" % threadId)
            for filename, lineno, name, line in traceback.extract_stack(stack):
                code.append('File: "%s", line %d, in %s' % (filename, lineno, name))
                if line:
                    code.append("  %s" % (line.strip()))
                    
        logging.warning("Thread Dump:\n\n" + "\n".join(code))

    def run(self):
        serverSocket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        serverSocket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        serverSocket.bind(("127.0.0.1", self.port))
        serverSocket.listen(1)

        while True:
            conn, addr   = serverSocket.accept()
            self.dumpThreads()
            conn.close()
