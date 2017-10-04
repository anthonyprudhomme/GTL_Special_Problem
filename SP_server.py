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
subscribers = {'leftCameraRate': None, 'middleCameraImage': None, 'middleCameraRate': None, 'rightCameraRate': None}

class CustomSubscriber:
    def __init__(self, topicName, topicType, callback, subscriber = None):
        self.topicName = topicName
     	self.topicType = topicType
	self.callback = callback
        self.subscriber = rospy.Subscriber(topicName, topicType, callback)
      
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

	if self.path == '/getLeftCameraRate':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            data = {}
	    if datas['leftCameraRate'] is not None:
	    	data['rate'] = datas['leftCameraRate']
	    json_data = json.dumps(data)
	    self.wfile.write(json_data)
	    return

	if self.path == '/getMiddleCameraRate':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            data = {}
	    if datas['middleCameraRate'] is not None:
	    	data['rate'] = datas['middleCameraRate']
	    json_data = json.dumps(data)
	    self.wfile.write(json_data)
	    return

	if self.path == '/getMiddleCameraImage':
            self.send_response(200)
            self.send_header('Content-Type', 'image/jpeg')
            self.end_headers()
            data = {}
	    if datas['middleCameraImage'] is not None:
	    	data = datas['middleCameraImage']
	    self.wfile.write(data)
	    return
	else:
	    if self.path == '/':
	        self.path = '/index.html'
	    return SimpleHTTPServer.SimpleHTTPRequestHandler.do_GET(self)
	
    
    def do_POST(self):

	if self.path == '/unsub':
	    print 'unsubscribing'
	    self.data_string = self.rfile.read(int(self.headers['Content-Length']))
	    print self.data_string
	    subscribers[parse_qs(self.data_string)['key'][0]].subscriber.unregister()
	if self.path == '/sub':
	    self.data_string = self.rfile.read(int(self.headers['Content-Length']))
	    customSub = subscribers[parse_qs(self.data_string)['key'][0]]
	    subscribers[parse_qs(self.data_string)['key'][0]] = CustomSubscriber(customSub.topicName,customSub.topicType, customSub.callback)
	

previousTimes = {'leftCameraRate': None, 'middleCameraRate': None, 'rightCameraRate': None}
datas = {'leftCameraRate': None, 'middleCameraRate': None, 'rightCameraRate': None, 'middleCameraImage': None}
def leftCameraRateCallback(data):
    datas['leftCameraRate'] = getRate('leftCameraRate')
    rospy.loginfo('Left camera rate: %s', datas['leftCameraRate'])

def middleCameraRateCallback(data):
    datas['middleCameraRate'] = getRate('middleCameraRate')
    #rospy.loginfo('Middle camera rate: %s', datas['middleCameraRate'])

def middleCameraImageCallback(data):
    #rospy.loginfo(rospy.get_caller_id() + 'I heard from mid %s', data)
    #rospy.loginfo(rospy.get_caller_id() + 'I received datas')
    datas['middleCameraImage'] = data

def rightCameraRateCallback(data):
    datas['rightCameraRate'] = getRate('rightCameraRate')
    rospy.loginfo('Right camera rate: %s', datas['rightCameraRate'])

def subscribeToTopics():
    rospy.init_node('listener', anonymous=True)
    #rospy.Subscriber('MiddleCameraRate', String, middleCameraRateCallback)
    
    subscribers['middleCameraImage'] = CustomSubscriber('vrep/visionSensor/compressed',CompressedImage, middleCameraImageCallback)
    subscribers['leftCameraRate'] = CustomSubscriber('leftCameraRate',String, leftCameraRateCallback)
    subscribers['rightCameraRate'] = CustomSubscriber('rightCameraRate',String, rightCameraRateCallback)
    subscribers['middleCameraRate'] = CustomSubscriber('vrep/visionSensor/compressed',CompressedImage, middleCameraRateCallback)

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

def run(server_class=HTTPServer, handler_class=SPRequestHandler, port=8089, server_ip='192.93.8.105'):
    subscribeToTopics()
    web_dir = os.path.join(os.path.dirname(__file__), 'web')
    os.chdir(web_dir)
    server_address = (server_ip, port)
    httpd = server_class(server_address, handler_class)
    print 'Server running at', server_ip, str(port)
    httpd.serve_forever()

run()
		
