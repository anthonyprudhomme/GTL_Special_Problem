window.onload = function start() {
	askForTopics();
    setInterval(updatedEvent, 1000);

    $('*[class^="col-"]').each(function() {

        var timeout, longtouch;

        $(this).mousedown(function() {
            var element = this;
            timeout = setTimeout(function() {
                longtouch = true;
                changeActivity(element);
            }, 300);
        }).mouseup(function() {
            if (!longtouch) {
                redirectTo(this);
            }
            longtouch = false;
            clearTimeout(timeout);
        });

    });
    lidarPolarCanvas = document.getElementById("lidarPolarCanvas");
    isLidarPolarChartSet = false;
	imageRateLineCanvas = document.getElementById("imageRateLineCanvas");
    isImageRateChartSet = false;
	updateLineChartRandomly();
}
var pressTimer;

var isLidarPolarChartSet;
var lidarPolarAreaChart;
var lidarPolarCanvas;

var isImageRateChartSet;
var imageRateLineChart;
var imageRateLineCanvas;

TypeOfData = {
	RATE: 0,
 	IMAGE: 1,
 	LIDAR: 2,
 	GPS: 3,
 	IMU: 4,
 	BATTERY: 5,
 	DISK_SPACE: 6
};

function updateChartRandomly() {
    var angleValues = new Array();
    var i;
    for (i = 0; i < 360; i++) {
        angleValues.push(Math.floor((Math.random() * 50) + 1));
    }
    drawLidarChart(angleValues);
}

function updateLineChartRandomly() {
	if(!isImageRateChartSet){
		var rateValues = new Array();
		rateValues.push(0);
		drawImageRateLineChart(rateValues);
	}
	//addNewRateToChart(Math.floor((Math.random() * 50) + 1));
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
	    	//console.log(lidarPolarAreaChart);
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
		console.log(element.id);
		topics[element.id].subscribed = true;
		subscribe(element.id);	
	}else{
		console.log(element.id);
		topics[element.id].subscribed = false;
		unsubscribe(element.id);
	}
    $(element).toggleClass("inactive");
}

function redirectTo(element) {
    var className = $(element).attr('class');
    if (className.indexOf("Lcam") != -1) {
        window.location.href = "image.html";
		subscribe(element.id);
    }
    if (className.indexOf("Mcam") != -1) {
        window.location.href = "image.html";
		subscribe(element.id);
    }
    if (className.indexOf("Rcam") != -1) {
        window.location.href = "image.html";
		subscribe(element.id);
    }
    if (className.indexOf("Lidar") != -1) {
        window.location.href = "lidar.html";
		subscribe(element.id);
    }
    if (className.indexOf("Position") != -1) {
        window.location.href = "position.html";
    }
}

function askForData(topicName, typeOfData) {
	//console.log(topicName, typeOfData);
    $.ajax({
        url: "http://192.93.8.105:8088/" + "getData",
        type: "GET",
		data: { topicName: topicName, typeOfData: typeOfData},
        success: function(data) {
            //console.log(data);
			var element = document.getElementById(topicName+typeOfData);
			if(data.rate != undefined){
				element.innerHTML = data.rate.toFixed(2) + " Hz";
				if(topics[topicName].types.indexOf(TypeOfData.IMAGE) !== -1){
					addNewRateToChart(data.rate.toFixed(2));		
				}
			}
			if(data.lidarData != undefined){
				drawLidarChart(data.lidarData);
			}			
			if(typeOfData == TypeOfData.IMAGE){
				updateImage(data, element);
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
        url: "http://192.93.8.105:8088/topics",
        type: "GET",
        success: function(data) {
            
			topics = data;
			for (var topicName in topics) {
				topics[topicName] = {types: topics[topicName], subscribed: true};
			}
			console.log(topics);
        },
        error: function(xhr, status, error) {
            
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
        element.src = "data:image/jpeg;base64, " + b64encoded;
    }
}

function setSubscribtion(path, topicName) {
    $.ajax({
        url: "http://192.93.8.105:8088/" + path,
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

function Uint8ToString(u8a) {
    var CHUNK_SZ = 0x8000;
    var c = [];
    for (var i = 0; i < u8a.length; i += CHUNK_SZ) {
        c.push(String.fromCharCode.apply(null, u8a.subarray(i, i + CHUNK_SZ)));
    }
    return c.join("");
}

function updatedEvent() {
	for (var topicName in topics) {
		var typesOfData = topics[topicName].types;
		if(topics[topicName].subscribed){
			if (typesOfData.indexOf(TypeOfData.RATE) !== -1) {
				askForData(topicName,TypeOfData.RATE);
			}
			if (typesOfData.indexOf(TypeOfData.IMAGE) !== -1) {
			  	askForData(topicName,TypeOfData.IMAGE);
			}
			if (typesOfData.indexOf(TypeOfData.LIDAR) !== -1) {
			 	askForData(topicName,TypeOfData.LIDAR);
			}
			if (typesOfData.indexOf(TypeOfData.GPS) !== -1) {
			 	askForData(topicName,TypeOfData.GPS);
			}
			if (typesOfData.indexOf(TypeOfData.IMU) !== -1) {
			 	askForData(topicName,TypeOfData.IMU);
			}
			if (typesOfData.indexOf(TypeOfData.BATTERY) !== -1) {
			 	askForData(topicName,TypeOfData.BATTERY);
			}
			if (typesOfData.indexOf(TypeOfData.DISK_SPACE) !== -1) {
				askForData(topicName,TypeOfData.DISK_SPACE);
			}
		}
	}
}

function unsubscribe(topicName) {
    setSubscribtion("unsub", topicName);
}

function subscribe(topicName) {
    setSubscribtion("sub", topicName);
}
