import sys, os, shutil
from distutils.core import setup, Extension

shutil.copyfile("googleshare.py", "googleshare/googleshare")

setup  (name        = 'googleshare',
        version     = '0.19',
        description = 'A proxy implementation for the GoogleSharing system.',
        author = 'Moxie Marlinspike',
        author_email = 'moxie@thoughtcrime.org',
        url = 'http://www.googlesharing.net/',
        license = 'GPL',
        packages  = ["googleshare"],
        package_dir = {'googleshare' : 'googleshare/'},
        scripts = ['googleshare/googleshare'],
        data_files = [('share/googleshare', ['README', 'INSTALL', 'COPYING']),
                      ('/etc/init.d', ['init-script/googleshare'])]
       )

print "Cleaning up..."

try:
    removeall("build/")
    os.rmdir("build/")
except:
    pass

try:
    os.remove("googleshare/googleshare")

except:
    pass

def capture(cmd):
    return os.popen(cmd).read().strip()

def removeall(path):
	if not os.path.isdir(path):
		return

	files=os.listdir(path)

	for x in files:
		fullpath=os.path.join(path, x)
		if os.path.isfile(fullpath):
			f=os.remove
			rmgeneric(fullpath, f)
		elif os.path.isdir(fullpath):
			removeall(fullpath)
			f=os.rmdir
			rmgeneric(fullpath, f)

def rmgeneric(path, __func__):
	try:
		__func__(path)
	except OSError, (errno, strerror):
		pass
