var ipAddress;

var isLidarPolarChartSet;
var lidarPolarAreaChart;
var lidarPolarCanvas;

var isImageRateChartSet;
var imageRateLineChart;
var imageRateLineCanvas;

var currentPage;
var currentCamera;

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
	currentPage = document.getElementById("page_id").getAttribute("value");
	console.log(currentPage);
	askForTopics();
    setInterval(updateTopicValues, 1000);
	
	// Depending on the page you are on, do different things
	if(currentPage.indexOf("index")!= -1){
		$('input[type=checkbox]').change(function(){
			changeActivity(this.parentNode);
		});

		$('input[type=checkbox]').prop('checked', true);

		$( "#postAMessage" ).click(function() {
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
		imageRateValue.setAttribute("id", currentCamera+"_rate");

		imageRateLineCanvas = document.getElementById("imageRateLineCanvas");
		isImageRateChartSet = false;
		initLineChart();
	}

	if(currentPage.indexOf("lidar")!= -1){
		lidarPolarCanvas = document.getElementById("lidarPolarCanvas");
		isLidarPolarChartSet = false;
	}

	$(window).bind('beforeunload', function(){
  		unsubscribeFromCurrentTopics();
	});
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

function changeActivity(element) {
	if($(element).hasClass("inactive")){
		subscribe(element.id);	
	}else{
		unsubscribe(element.id);
	}
    $(element).toggleClass("inactive");
}

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

function askForData(topicName, htmlTopicName, typeOfData) {
    $.ajax({
        url: "http://" + ipAddress + "/" + "getData",
        type: "GET",
		data: { topicName: topicName, typeOfData: typeOfData},
        success: function(data) {
            //console.log(data);
			// select the html element that matches the htmlTopicName and the type of data
			var typeName = getTypeNameFromId(typeOfData);
			var element = document.getElementById(htmlTopicName+'_'+typeName);
			if(element != undefined){
				if(data.rate != undefined){
					element.innerHTML = data.rate.toFixed(2) + " Hz";
					if(topics[topicName].topic.types.indexOf(TypeOfData.IMAGE_M.id) !== -1){
						if(currentPage.indexOf("image")!= -1){
							addNewRateToChart(data.rate.toFixed(2));
						}		
					}
				}
				if(data.lidarData != undefined){
					if(currentPage.indexOf("lidar")!= -1){
						console.log("drawing");
						drawLidarChart(data.lidarData);
					}
				}			
				if(typeOfData == TypeOfData.IMAGE_L.id || typeOfData == TypeOfData.IMAGE_M.id || typeOfData == TypeOfData.IMAGE_R.id){
					if(currentPage.indexOf("image")!= -1){
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
					var percentage = data.available_mb/data.size_mb
					elements[0].innerHTML = data.available_mb.toFixed(2);
					elements[1].innerHTML = percentage.toFixed(2)+"%";
				}
			}	
        },
        error: function(xhr, status, error) {
            var err = eval("(" + xhr.responseText + ")");
            //console.log("Error");
            //console.log(xhr);
            //console.log(status);
            //console.log(error);
        }
    });
}

var topics = null;

function askForTopics() {
    $.ajax({
        url: "http://" + ipAddress + "/topics",
        type: "GET",
        success: function(data) {
			topics = data;
			for (var topicName in topics) {
				topics[topicName] = {topic: topics[topicName], subscribed: true};
			}
			console.log(topics);	
        },
        error: function(xhr, status, error) {
            
        }
    });
}

function setSubscribtion(path, topicName) {
    $.ajax({
        url: "http://" + ipAddress + "/" + path,
        type: "POST",
        data: {
            key: topicName
        },
        success: function(data) {
            //console.log("Success");
            //console.log(data);
        },
        error: function(xhr, status, error) {
            var err = eval("(" + xhr.responseText + ")");
            //console.log("Error");
            //console.log('Request Status: ' + xhr.status + ' Status Text: ' + xhr.statusText + ' ' + xhr.responseText);
            //console.log(status);
            //console.log(error);
        }
    });
}

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
	console.log(htmlTopicName);
	var topicName = getTopicNameFromHtmlTopicName(htmlTopicName);
	console.log("2- " + topicName);
	topics[topicName].subscribed = false;
    setSubscribtion("unsub", topicName);
}

function subscribe(htmlTopicName) {
	var topicName = getTopicNameFromHtmlTopicName(htmlTopicName);
	topics[topicName].subscribed = true;
    setSubscribtion("sub", topicName);
}

function unsubscribeFromCurrentTopics(){

}

function getTopicNameFromHtmlTopicName(htmlTopicName){
	for (var topicName in topics) {
		if(topics[topicName].topic.htmlTopicName.indexOf(htmlTopicName) != -1){
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

