var ipAddress;
var refreshTime;

// Chart for lidar data visualization
var isLidarPolarChartSet;
var lidarPolarAreaChart;
var lidarPolarCanvas;

// Chart showing rate of camera over time
var isImageRateChartSet;
var imageRateLineChart;
var imageRateLineCanvas;

// Variables containing the current page shown and the current camera selected
var currentPage;
var currentCamera;

//This object is an enum that's linked to the server file "SP_server.py": typeName has to be the same as in this file
TypeOfData = {
	RATE: {id: 0, typeName: "rate"},
 	IMAGE_L: {id: 1, typeName: "image_l"},
	IMAGE_M: {id: 2, typeName: "image_m"},
	IMAGE_R: {id: 3, typeName: "image_r"},
 	LIDAR: {id: 4, typeName: "lidar"},
 	GPS: {id: 5, typeName: "gps"},
 	IMU: {id: 6, typeName: "imu"},
 	BATTERY: {id: 7, typeName: "battery"},
 	DISK_SPACE: {id: 8, typeName: "disk_space"}
};

// This function is triggered at the loading of any of the page of the web app
window.onload = function start() {
	ipAddress ="192.93.8.105:8000";
	refreshTime = 1000;
	currentPage = document.getElementById("page_id").getAttribute("value");
	console.log(currentPage);
	// This function will get all the topics from the server (see SP_Server.py file and look for self.path == '/topics': to see what's sent)
	askForTopics();
	// This is going to ask for topics value every refreshTime. RefreshTime is in milliseconds
    setInterval(updateTopicValues, refreshTime);
	
	// Depending on the page you are on, do different things
	if(currentPage.indexOf("index")!= -1){
		$('input[type=checkbox]').change(function(){
			changeActivity(this.parentNode);
		});
		$('input[type=checkbox]').prop('checked', true);

		$( "#postAMessage" ).click(function() {
			console.log('clicked publish');		 
			publishMessage(1);
		});
		$(".link_new_page").click(function() {
			if(this.parentNode.parentNode.getAttribute("id").indexOf('image') != -1){
				currentCamera = this.parentNode.parentNode.getAttribute("id");
				document.cookie = "current_camera="+currentCamera;
			}
		});
	}

	if(currentPage.indexOf("image")!= -1){
		currentCamera = getCookie('current_camera');
		var imageImg = document.getElementById('image_img');
		imageImg.setAttribute("id", currentCamera+"_"+currentCamera);
		var imageRate = document.getElementById('image_rate');
		imageRate.setAttribute("id", currentCamera);
		var imageRateValue = document.getElementById('image_rate_value');
		imageRateValue.setAttribute("id", currentCamera+"_rate_rate");

		imageRateLineCanvas = document.getElementById("imageRateLineCanvas");
		isImageRateChartSet = false;
		initLineChart();
	}

	if(currentPage.indexOf("lidar")!= -1){
		lidarPolarCanvas = document.getElementById("lidarPolarCanvas");
		isLidarPolarChartSet = false;
	}
}

function initLineChart() {
	if(!isImageRateChartSet){
		var rateValues = new Array();
		rateValues.push(0);
		drawImageRateLineChart(rateValues);
	}
}

function drawLidarChart(angleValues) {
    if (lidarPolarCanvas != null) {
        if (isLidarPolarChartSet == false) {
			var radarChartLabels = new Array();
			var i;
			for (i = 0; i < angleValues.length; i++) {
				radarChartLabels.push('');
			}

            lidarPolarAreaChart = new Chart(lidarPolarCanvas, {
                type: 'radar',
                data: {
				labels: radarChartLabels,
				datasets: [{
					data: angleValues,
					label: 'Lidar visualisation',
					borderColor: "#f38b7a"
				}]
			}
            });
            isLidarPolarChartSet = true;
			lidarPolarAreaChart.options.scale.angleLines.display = false;
			lidarPolarAreaChart.options.animation.duration = 0;
			lidarPolarAreaChart.options.elements.line.fill = false;
			lidarPolarAreaChart.options.elements.line.borderWidth = 0.00001;
			lidarPolarAreaChart.options.elements.point.radius = 1.5;
			lidarPolarAreaChart.options.elements.point.pointStyle = "dot";
			lidarPolarAreaChart.options.elements.point.backgroundColor = "#f38b7a";
			lidarPolarAreaChart.update();
        } else {
            lidarPolarAreaChart.data.datasets[0].data = angleValues;
            lidarPolarAreaChart.update();
        }
    }
}

function drawImageRateLineChart(rateValues) {
    if (imageRateLineCanvas != null) {
        if (isImageRateChartSet == false) {
			var lineChartLabels = new Array();
			var i;
			for (i = 0; i < 100; i++) {
				if (i % 10 == 0) {
					lineChartLabels.push(i);
				} else {
					lineChartLabels.push("");
				}
			}
            var lineData = {
				labels: lineChartLabels,
                datasets: [{
                    data: rateValues,
					label: 'Rate (Hz)',
                    borderColor: "#f38b7a"
                }]
            };

            imageRateLineChart = new Chart(imageRateLineCanvas, {
                type: 'line',
                data: lineData
            });
			imageRateLineChart.options.elements.point.radius = 0.5;
			imageRateLineChart.options.scales.xAxes[0].showXLabels = 10;
            isImageRateChartSet = true;
        } else {
            imageRateLineChart.data.datasets[0].data = rateValues;
            imageRateLineChart.update();
        }
    }
}

function addNewRateToChart(newRate){
	console.log("called");
	var values = imageRateLineChart.data.datasets[0].data;
	if(values.length <100){
		values.push(newRate);
	}else{
		values.splice(0,1);
		values.push(newRate);
	}
	imageRateLineChart.data.datasets[0].data = values;
    imageRateLineChart.update();
}

// This function is triggered when you clickon a check box, it subscribes or unsubscribe to the topic linked to the checkbox 
function changeActivity(element) {
	if($(element).hasClass("inactive")){
		subscribe(element.id);	
	}else{
		unsubscribe(element.id);
	}
    $(element).toggleClass("inactive");
}

// This function is called every "refreshTime' it asks for each topic you're subscribed to the new data 
function updateTopicValues() {
	for (var topicName in topics) {
		var typesOfData = topics[topicName].topic.types;
		if(topics[topicName].subscribed){
			for(var typeOfData in typesOfData) {
				askForData(topicName, topics[topicName].topic.htmlTopicName, typesOfData[typeOfData]);
			}
		}
	}
}

// This function is called by the function above
// It queries the new datas of the topic from the server (SP_server.py)
// topicName is a string that corresponds to the actual topic name you wanna get data from (i.e. /vrep/...)
// htmlTopicName is a string the name given to that type of data in the html file
// typeOfData is an integer that corresponds to the typeOfData in the enumeration at the beginning of this file
function askForData(topicName, htmlTopicName, typeOfData) {
    $.ajax({
        url: "http://" + ipAddress + "/" + "getData",
        type: "GET",
		data: { topicName: topicName, typeOfData: typeOfData},
        success: function(data) {
            //console.log(data);
			// select the html element that matches the htmlTopicName and the type of data
			var typeName = getTypeNameFromId(typeOfData);
			// element is the html element that will be updated with the new data, its id is built from the base html topic name we defined and the type name (rate, lidar etc...)
			var element = document.getElementById(htmlTopicName+'_'+typeName);
			if(element != undefined){
				// Now we check what the data received is containing and we fill the element with this data
				if(data.rate != undefined){
					element.innerHTML = data.rate.toFixed(2) + " Hz";
					// If it is a rate and if it is linked to an image then we can add it to the rate chart of the image
					if(htmlTopicName.indexOf("image") !== -1){
						if(currentPage.indexOf("image")!= -1){
							addNewRateToChart(data.rate.toFixed(2));
						}		
					}
				}
				if(data.lidarData != undefined){
					if(currentPage.indexOf("lidar")!= -1){
						drawLidarChart(data.lidarData);
					}
				}			
				if(typeOfData == TypeOfData.IMAGE_L.id || typeOfData == TypeOfData.IMAGE_M.id || typeOfData == TypeOfData.IMAGE_R.id){
					if(currentPage.indexOf("image")!= -1 || currentPage.indexOf("all_cameras")!= -1){
						updateImage(data, element);
					}
				}
				if(data.linear_acceleration_x != undefined){
					var elements = element.getElementsByClassName("topicValue");
					elements[0].innerHTML = data.linear_acceleration_x.toFixed(2);
					elements[1].innerHTML = data.linear_acceleration_y.toFixed(2);
					elements[2].innerHTML = data.linear_acceleration_z.toFixed(2);
					elements[3].innerHTML = data.angular_velocity_x.toFixed(2);
					elements[4].innerHTML = data.angular_velocity_y.toFixed(2);
					elements[5].innerHTML = data.angular_velocity_z.toFixed(2);
				}
				if(data.latitude != undefined){
					var elements = element.getElementsByClassName("topicValue");
					elements[0].innerHTML = data.latitude.toFixed(7);
					elements[1].innerHTML = data.longitude.toFixed(7);
					elements[2].innerHTML = data.altitude.toFixed(2);
				}
				if(data.size_mb != undefined){
					var elements = element.getElementsByClassName("topicValue");
					var percentage = (data.available_mb/data.size_mb)*100;
					elements[0].innerHTML = data.available_mb.toFixed(0) +" Mb";
					elements[1].innerHTML = percentage.toFixed(2)+"%";
				}
			}	
        },
        error: function(xhr, status, error) {
			// This function is triggered if there was an error with the request
            var err = eval("(" + xhr.responseText + ")");
        }
    });
}

var topics = null;

// This function is asking the server for the different topics available
function askForTopics() {
    $.ajax({
        url: "http://" + ipAddress + "/topics",
        type: "GET",
        success: function(data) {
			topics = data;
			// For each topic, add that it is currently subscribed
			for (var topicName in topics) {
				topics[topicName] = {topic: topics[topicName], subscribed: true};
			}
			// set subscription of the different topics depending on the current page
			subscribeToRightTopicsForCurrentPage(currentPage);	
        },
        error: function(xhr, status, error) {
            
        }
    });
}

// Send to the server a request to change the subscription to a topic
function setSubscribtion(path, topicName) {
    $.ajax({
        url: "http://" + ipAddress + "/" + path,
        type: "POST",
        data: {
            key: topicName
        },
        success: function(data) {
        },
        error: function(xhr, status, error) {
            var err = eval("(" + xhr.responseText + ")");
        }
    });
}

// Publish a message to a topic by sending a request to the server
function publishMessage(messageToPublish){
	$.ajax({
        url: "http://" + ipAddress + "/" + "publishToTopic",
        type: "POST",
        data: {
			topicName : "topicFromWebApp",
            message: messageToPublish
        },
        success: function(data) {
			console.log('success');
        },
        error: function(xhr, status, error) {
            var err = eval("(" + xhr.responseText + ")");
			console.log("error when publishing");
        }
    });
}

// Update the image at the given element with the given data
function updateImage(data, element){
	// Looking for where is the array with data; +6 is to start the string at "[" and not at "data"
    uintAsString = data.substring(data.indexOf("data: [") + 6);
    if (uintAsString != undefined && uintAsString.length > 0) {
        uintAsJson = JSON.parse(uintAsString);
        var u8 = new Uint8Array(uintAsJson.length);
        for (var i = 0; i < uintAsJson.length; i++) {
            u8[i] = uintAsJson[i];
        }
        var b64encoded = btoa(Uint8ToString(u8));
        element.src = "data:image;base64, " + b64encoded;
    }
}

function Uint8ToString(u8a) {
    var CHUNK_SZ = 0x8000;
    var c = [];
    for (var i = 0; i < u8a.length; i += CHUNK_SZ) {
        c.push(String.fromCharCode.apply(null, u8a.subarray(i, i + CHUNK_SZ)));
    }
    return c.join("");
}

function unsubscribe(htmlTopicName) {
	var topicName = getTopicNameFromHtmlTopicName(htmlTopicName);
	if(topics[topicName] != undefined){
		topics[topicName].subscribed = false;
		setSubscribtion("unsub", topicName);
	}
}

function subscribe(htmlTopicName) {
	var topicName = getTopicNameFromHtmlTopicName(htmlTopicName);
	if(topics[topicName] != undefined){
		topics[topicName].subscribed = true;
    	setSubscribtion("sub", topicName);
	}
}

function subscribeToRightTopicsForCurrentPage(page){
	if(page.indexOf("index")!= -1){
		unsubscribe("image_l");
		unsubscribe("image_m");
		unsubscribe("image_r");
	}
	if(page.indexOf("image")!= -1){
		subscribe(currentCamera);
	}
	if(page.indexOf("all_cameras")!= -1){
		subscribe("image_l");
		subscribe("image_m");
		subscribe("image_r");
	}
}

function getTopicNameFromHtmlTopicName(htmlTopicName){
	for (var topicName in topics) {
		if(topics[topicName].topic.htmlTopicName.localeCompare(htmlTopicName) == 0){
			return topicName;
		}
	}
	return '';
}

function getTypeNameFromId(id){
	for (var type in TypeOfData) {
		if(TypeOfData[type].id == id){
			return TypeOfData[type].typeName;
		}
	}
	return '';
}

function getCookie(cookieName) {
    var name = cookieName + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

