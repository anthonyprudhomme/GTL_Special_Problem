from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer
import SimpleHTTPServer
from urlparse import urlparse, parse_qs
import cgi
import os
import json
import simplejson

import subprocess
import re


# import of Ros components to be able to subscribe to topics
import rospy
import roslib; roslib.load_manifest('wpa_cli')

from std_msgs.msg import String

from sensor_msgs.msg import CameraInfo
from sensor_msgs.msg import CompressedImage
from sensor_msgs.msg import Image
from sensor_msgs.msg import LaserScan
from sensor_msgs.msg import Imu
from sensor_msgs.msg import NavSatFix
from sensor_msgs.msg import NavSatStatus
from sensor_msgs.msg import TimeReference

from vectornav.msg import ins
from vectornav.msg import sensors

from disk_monitor.msg import DiskStatus

subscribers = {}

class CustomSubscriber:
    def __init__(self, topicName, topicType, typesOfData, callback, htmlTopicName, subscriber = None):
        self.topicName = topicName
     	self.topicType = topicType
	self.callback = callback
	self.typesOfData = typesOfData
	self.htmlTopicName = htmlTopicName
        self.subscriber = rospy.Subscriber(topicName, topicType, callback, (topicName, typesOfData))

class SubscriberManager:
    def __init__(self, customSubscriber, startTime = None, numberOfMessagesBetweenRequests = 0, lastData = None):
        self.customSubscriber = customSubscriber
     	self.startTime = startTime
	self.numberOfMessagesBetweenRequests = numberOfMessagesBetweenRequests
        self.lastData = lastData
	
class TypeOfData:
    RATE, IMAGE_L, IMAGE_M, IMAGE_R, LIDAR, GPS, IMU, BATTERY, DISK_SPACE = range(9)
      
class SPRequestHandler(SimpleHTTPServer.SimpleHTTPRequestHandler):
    def _set_headers(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
    def do_HEAD(self):
        self._set_headers()

    def do_GET(self):
	referer = self.headers.get('Referer')
	#print self.path

	if '/getData' in self.path:
	    self.send_response(200)
	    self.data_string = parse_qs(urlparse(self.path).query)
	    self.topicName = self.data_string['topicName'][0]
	    self.typeOfData = int(self.data_string['typeOfData'][0])
	    data = {}
	    if TypeOfData.RATE == self.typeOfData:
		self.send_header('Content-Type', 'application/json')
                self.end_headers()
	        data['rate'] = computeAverage(self.topicName)
	        json_data = json.dumps(data)
	        self.wfile.write(json_data)
	        return

	    if TypeOfData.IMAGE_L == self.typeOfData or TypeOfData.IMAGE_M == self.typeOfData or TypeOfData.IMAGE_R == self.typeOfData:
		self.send_header('Content-Type', 'image/jpeg')
                self.end_headers()
                if hasattr(subscribers[self.topicName], 'data') and subscribers[self.topicName].data is not None:
	            data = subscribers[self.topicName].data
	        self.wfile.write(data)
		return

	    if TypeOfData.LIDAR == self.typeOfData:
		self.send_header('Content-Type', 'application/json')
                self.end_headers()
		if hasattr(subscribers[self.topicName], 'data') and subscribers[self.topicName].data is not None:
		    data['lidarAngleMin'] = subscribers[self.topicName].data.angle_min
		    data['lidarAngleMax'] = subscribers[self.topicName].data.angle_max
	    	    data['lidarData'] = subscribers[self.topicName].data.ranges
	        json_data = json.dumps(data)
	        self.wfile.write(json_data)
	        return

	    if TypeOfData.GPS == self.typeOfData:
		self.send_header('Content-Type', 'application/json')
                self.end_headers()
		data['latitude'] = subscribers[self.topicName].lastData.x
	        data['longitude'] = subscribers[self.topicName].lastData.y
	        data['altitude'] = subscribers[self.topicName].lastData.z
	        json_data = json.dumps(data)
	        self.wfile.write(json_data)
		return

	    if TypeOfData.IMU == self.typeOfData:
		self.send_header('Content-Type', 'application/json')
                self.end_headers()
		data['angular_velocity_x'] = subscribers[self.topicName].lastData.Gyro.x
	        data['angular_velocity_y'] = subscribers[self.topicName].lastData.Gyro.y
	        data['angular_velocity_z'] = subscribers[self.topicName].lastData.Gyro.z
	        data['linear_acceleration_x'] = subscribers[self.topicName].lastData.Accel.x
	        data['linear_acceleration_y'] = subscribers[self.topicName].lastData.Accel.y
	        data['linear_acceleration_z'] = subscribers[self.topicName].lastData.Accel.z
	        json_data = json.dumps(data)
	        self.wfile.write(json_data)
	        return

	    if TypeOfData.BATTERY == self.typeOfData:
		print 'not implemented yet'

	    if TypeOfData.DISK_SPACE == self.typeOfData:
	        self.send_header('Content-Type', 'application/json')
	        self.end_headers()
	        subscribers[self.topicName].lastData = getDiskSpace()
	        data['size_mb'] = subscribers[self.topicName].lastData.size_mb
	        data['used_mb'] = subscribers[self.topicName].lastData.used_mb
	        data['available_mb'] = subscribers[self.topicName].lastData.available_mb
	        json_data = json.dumps(data)
	        self.wfile.write(json_data)
		return

	if self.path == '/topics':
		self.send_response(200)
		self.send_header('Content-Type', 'application/json')
		self.end_headers()
		data = {}
		for key in subscribers:
			data[key] = {'types': subscribers[key].customSubscriber.typesOfData, 'htmlTopicName': subscribers[key].customSubscriber.htmlTopicName}
			json_data = json.dumps(data)
		self.wfile.write(json_data)
		return

	else:
	    if self.path == '/':
	        self.path = '/index.html'
	    return SimpleHTTPServer.SimpleHTTPRequestHandler.do_GET(self)
	
    
    def do_POST(self):

	if self.path == '/unsub':
	    self.data_string = self.rfile.read(int(self.headers['Content-Length']))
	    subscribers[parse_qs(self.data_string)['key'][0]].customSubscriber.subscriber.unregister()

	if self.path == '/sub':
	    self.data_string = self.rfile.read(int(self.headers['Content-Length']))
	    customSub = subscribers[parse_qs(self.data_string)['key'][0]].customSubscriber
	    subscribers[parse_qs(self.data_string)['key'][0]].customSubscriber = CustomSubscriber(customSub.topicName,customSub.topicType, customSub.typesOfData,  customSub.callback, customSub.htmlTopicName)

	if self.path == '/publishToTopic':
	    print "Has published something"
	    self.data_string = self.rfile.read(int(self.headers['Content-Length']))
	    topicName = parse_qs(self.data_string)['topicName'][0]
	    messageToPublish = parse_qs(self.data_string)['message'][0]
	    global publisher
	    publisher.publish(messageToPublish)
	    

#-------------Callback----------------

def callback(data, args):
    if TypeOfData.RATE in args[1]:
	setTimeIfNecessary(args[0])
	#rospy.loginfo(rospy.get_caller_id() + 'I received rate data')

    if TypeOfData.IMAGE_L in args[1] or TypeOfData.IMAGE_M in args[1] or TypeOfData.IMAGE_R in args[1]:
	subscribers[args[0]].data = data
	#rospy.loginfo(rospy.get_caller_id() + 'I received image data')

    if TypeOfData.LIDAR in args[1]:
	subscribers[args[0]].data = data
	#rospy.loginfo(rospy.get_caller_id() + 'I received lidar data')

    if TypeOfData.GPS in args[1]:
	subscribers[args[0]].lastData = data.LLA
	#rospy.loginfo(rospy.get_caller_id() + 'I received gps data')

    if TypeOfData.IMU in args[1]:
	subscribers[args[0]].lastData = data
	#rospy.loginfo(rospy.get_caller_id() + 'I received imu data')

    if TypeOfData.BATTERY in args[1]:
	subscribers[args[0]].lastData = data
	#rospy.loginfo(rospy.get_caller_id() + 'I received battery data')

    if TypeOfData.DISK_SPACE in args[1]:
	#subscribers[args[0]].lastData = data
	rospy.loginfo(rospy.get_caller_id() + 'I received disk space data')
    
#---------------------------------------

def subscribeToTopics():
    rospy.init_node('listener', anonymous=True)
    
	#Test topics
    subscribers['vrep/visionSensor/compressed'] = SubscriberManager(CustomSubscriber('vrep/visionSensor/compressed', CompressedImage, [TypeOfData.IMAGE_M], callback, "image_m"))
    subscribers['vrep/visionSensorInfo'] = SubscriberManager(CustomSubscriber('vrep/visionSensorInfo', CameraInfo, [TypeOfData.RATE], callback, "image_m_rate"))
    subscribers['lidar/scan'] = SubscriberManager(CustomSubscriber('lidar/scan', LaserScan, [TypeOfData.RATE,TypeOfData.LIDAR], callback, "lidar"))
    subscribers['vectornav/imu'] = SubscriberManager(CustomSubscriber('vectornav/imu', sensors, [TypeOfData.IMU], callback, "imu"))
    subscribers['vectornav/ins'] = SubscriberManager(CustomSubscriber('vectornav/ins', ins, [TypeOfData.GPS], callback, "gps"))
    subscribers['disk_space'] = SubscriberManager(CustomSubscriber('disk_space', DiskStatus, [TypeOfData.DISK_SPACE], callback, "disk_space"))

	#Real topics
	#subscribers['/camera1/image_color/compressed'] = SubscriberManager(CustomSubscriber('/camera1/image_color/compressed', CompressedImage, [TypeOfData.IMAGE_L], callback, "image_l"))
	#subscribers['/camera1/cameraInfo'] = SubscriberManager(CustomSubscriber('/camera1/cameraInfo', CameraInfo, [TypeOfData.RATE], callback, "image_l_rate"))
	#subscribers['/camera2/image_color/compressed'] = SubscriberManager(CustomSubscriber('/camera2/image_color/compressed', CompressedImage, [TypeOfData.IMAGE_M], callback, "image_m"))
	#subscribers['/camera2/cameraInfo'] = SubscriberManager(CustomSubscriber('/camera2/cameraInfo', CameraInfo, [TypeOfData.RATE], callback, "image_m_rate"))
    #subscribers['/camera3/image_color/compressed'] = SubscriberManager(CustomSubscriber('/camera3/image_color/compressed', CompressedImage, [TypeOfData.IMAGE_R], callback, "image_r"))
    #subscribers['/camera3/cameraInfo'] = SubscriberManager(CustomSubscriber('/camera3/cameraInfo', CameraInfo, [TypeOfData.RATE], callback, "image_r_rate"))
    #subscribers['/scan'] = SubscriberManager(CustomSubscriber('/scan', LaserScan, [TypeOfData.RATE,TypeOfData.LIDAR], callback,"lidar"))
    #subscribers['vectornav/imu'] = SubscriberManager(CustomSubscriber('vectornav/imu', sensors, [TypeOfData.IMU], callback, "imu"))
    #subscribers['vectornav/ins'] = SubscriberManager(CustomSubscriber('vectornav/ins', ins, [TypeOfData.GPS], callback))
	#subscribers['disk_space'] = SubscriberManager(CustomSubscriber('disk_space', DiskStatus, [TypeOfData.DISK_SPACE], callback, "disk_space"))
    

# Methods to get the rate at which a topic is pusblishing
# The parameter "key" is a string that contains the name of the topic (see previousTimes variable to get the key)
def setTimeIfNecessary(key):
    if subscribers[key].startTime == None:
        subscribers[key].startTime = rospy.Time.now()
    subscribers[key].numberOfMessagesBetweenRequests +=1

def computeAverage(key):
    averageRate = 0
    if subscribers[key].startTime is not None:
        actualTime = rospy.Time.now()
        deltaTime = actualTime - subscribers[key].startTime
        averageTimeBetweenMessages = deltaTime/subscribers[key].numberOfMessagesBetweenRequests
        averageRate = 1 * 1000000000 / float(str(averageTimeBetweenMessages))
        subscribers[key].startTime = None
        subscribers[key].numberOfMessagesBetweenRequests = 0
    return averageRate

dev = rospy.get_param("~device","/dev/sda5")

def getDiskSpace():
    scan_results = subprocess.check_output(["df", "-m"]).split("\n")
    for line in scan_results:
        l = []
        line = line.strip()
        while len(line)>0:
            l.append(line.split(" ")[0])
            line = (" ".join(line.split(" ")[1:])).strip()
        if len(l)==0 or (l[0] != dev):
            continue
        state = DiskStatus()
        state.device = l[0]
        state.mounted = l[5]
        state.size_mb = int(l[1])
        state.used_mb = int(l[2])
        state.available_mb = int(l[3])
    return state

publisher = None

def run(server_class=HTTPServer, handler_class=SPRequestHandler, port=8000, server_ip='192.93.8.105'):
    subscribeToTopics()
    global publisher
    publisher = rospy.Publisher('topicFromWebApp', String, queue_size=10)
    web_dir = os.path.join(os.path.dirname(__file__), 'web')
    os.chdir(web_dir)
    server_address = (server_ip, port)
    httpd = server_class(server_address, handler_class)
    print 'Server running at', server_ip, str(port)
    httpd.serve_forever()

run()
		
