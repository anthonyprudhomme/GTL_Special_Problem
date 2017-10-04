from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer
import SimpleHTTPServer
from urlparse import parse_qs
import cgi
import os
import json
import simplejson


# import of Ros components to be able to subscribe to topics
import rospy
from std_msgs.msg import String
from sensor_msgs.msg import CompressedImage

lCamRate = None
mCamRate = None
rCamRate = None
mCamImage = None
subscribers = {'leftCam': None, 'middleCam': None, 'rightCam': None}
class SPRequestHandler(SimpleHTTPServer.SimpleHTTPRequestHandler):
    def _set_headers(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
    def do_HEAD(self):
        self._set_headers()

    def do_GET(self):
	referer = self.headers.get('Referer')
	print self.path

	if self.path == '/getLCamRate':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            data = {}
	    global lCamRate
	    if lCamRate is not None:
	    	data['test'] = lCamRate
	    json_data = json.dumps(data)
	    self.wfile.write(json_data)
	    return

	if self.path == '/getMCamRate':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            data = {}
	    global mCamRate
	    if mCamRate is not None:
	    	data['test'] = mCamRate
	    json_data = json.dumps(data)
	    self.wfile.write(json_data)
	    return

	if self.path == '/getMCamImage':
            self.send_response(200)
            self.send_header('Content-Type', 'image/jpeg')
            self.end_headers()
            data = {}
	    global mCamImage
	    if mCamImage is not None:
	    	data = mCamImage
	    self.wfile.write(data)
	    return
	else:
	    if self.path == '/':
	        self.path = '/index.html'
	    return SimpleHTTPServer.SimpleHTTPRequestHandler.do_GET(self)
	
    
    def do_POST(self):

	if self.path == '/unsub':
	    self.data_string = self.rfile.read(int(self.headers['Content-Length']))
	    subscribers[parse_qs(self.data_string)['key'][0]].unregister()
	if self.path == '/sub':
	    self.data_string = self.rfile.read(int(self.headers['Content-Length']))
	    subscribers[parse_qs(self.data_string)['key'][0]] = rospy.Subscriber('vrep/visionSensor/compressed', CompressedImage, middleCameraCallback)
	

previousTimes = {'leftCam': None, 'middleCam': None, 'rightCam': None}
def leftCameraRateCallback(data):
    global lCamRate
    lCamRate = getRate('leftCam')
    rospy.loginfo('Left camera rate: %s', lCamRate)

def middleCameraRateCallback(data):
    global mCamRate
    mCamRate = getRate('middleCam')
    rospy.loginfo('Middle camera rate: %s', mCamRate)

def middleCameraCallback(data):
    #rospy.loginfo(rospy.get_caller_id() + 'I heard from mid %s', data)
    #rospy.loginfo(rospy.get_caller_id() + 'I received datas')
    global mCamImage
    mCamImage = data

def rightCameraRateCallback(data):
    global mCamRate
    mCamRate = getRate('rightCam')
    rospy.loginfo('Right camera rate: %s', mCamRate)

def subscribeToTopics():
    rospy.init_node('listener', anonymous=True)
    #rospy.Subscriber('MCamRate', String, mCamRateCallback)
    
    subscribers['middleCam'] = rospy.Subscriber('vrep/visionSensor/compressed', CompressedImage, middleCameraCallback)
    rospy.Subscriber('LCamRate', String, leftCameraRateCallback)
    rospy.Subscriber('RCamRate', String, rightCameraRateCallback)

def getRate(key):
    rate = 0
    if previousTimes[key] == None:
        previousTimes[key] = rospy.Time.now()
    else:
        actualTime = rospy.Time.now()
        deltaTime = actualTime - previousTimes[key]
        rate = 1 * 1000000000 / float(str(deltaTime))
        previousTimes[key] = rospy.Time.now()  
    return rate

def run(server_class=HTTPServer, handler_class=SPRequestHandler, port=8089, server_ip='192.93.8.109'):
    subscribeToTopics()
    web_dir = os.path.join(os.path.dirname(__file__), 'web')
    os.chdir(web_dir)
    server_address = (server_ip, port)
    httpd = server_class(server_address, handler_class)
    print 'Server running at', server_ip, str(port)
    httpd.serve_forever()

run()
		
