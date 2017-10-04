window.onload = function start() {
    setInterval(updatedEvent, 2000);

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
    polarCanvas = document.getElementById("polarCanvas");
    isPolarChartSet = false;
    setInterval(updateChart, 2000);

}
var pressTimer;
var isPolarChartSet;
var polarAreaChart;
var polarCanvas;

function updateChart() {
    var angleValues = new Array();
    var i;
    for (i = 0; i < 360; i++) {
        angleValues.push(Math.floor((Math.random() * 50) + 1));
    }
    drawChart(angleValues);
}

function changeActivity(element) {
	if($(element).hasClass("inactive")){
		subscribe(element.id);	
	}else{
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

function drawChart(angleValues) {
    if (polarCanvas != null) {
        if (isPolarChartSet == false) {
            var polarData = {
                datasets: [{
                    data: angleValues,
                    backgroundColor: "#f38b4a",
                    borderColor: "#f38b7a"
                }]
            };

            polarAreaChart = new Chart(polarCanvas, {
                type: 'polarArea',
                data: polarData
            });
            console.log(polarAreaChart.options);
            isPolarChartSet = true;
        } else {
            polarAreaChart.data.datasets[0].data = angleValues;
            polarAreaChart.update();
        }
    }
}



function askForData(path, element, contentType, askingForRate) {
    $.ajax({
        url: "http://192.93.8.105:8089/" + path,
        type: "GET",
        //contentType: contentType,
        //dataType: contentType,
        success: function(data) {
            console.log(data);
			if(askingForRate){
				element.innerHTML = data.rate.toFixed(2) + " Hz";
			}else{
				updateImage(data, element);
			}
        },
        error: function(xhr, status, error) {
            var err = eval("(" + xhr.responseText + ")");
            console.log("Error");
            console.log(xhr);
            console.log(status);
            console.log(error);
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
        url: "http://192.93.8.105:8089/" + path,
        type: "POST",
        contentType: "application/json",
        dataType: "application/json",
        data: {
            key: topicName
        },
        success: function(data) {
            //console.log("Success");
            //console.log(data);
        },
        error: function(xhr, status, error) {
            var err = eval("(" + xhr.responseText + ")");
            console.log("Error");
            console.log(xhr);
            console.log(status);
            console.log(error);
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
    var d = new Date();
    //askForData("getLCamRate",document.getElementById("leftCameraRate"),"application/json");
    //askForData("getMCamRate",document.getElementById("midCameraRate"),"application/json");
    //askForData("getMCamImage",document.getElementById("image"),"image/jpeg");
    if (document.getElementById("image") != null) {
        askForData("getMiddleCameraImage", document.getElementById("image"), "image/jpeg",false);
    }
	if (document.getElementById("middleCameraRate") != null) {
        askForData("getMiddleCameraRate", document.getElementById("middleCameraRateValue"), "application/json",true);
    }
}

function unsubscribe(topicName) {
    setSubscribtion("unsub", topicName);
}

function subscribe(topicName) {
    setSubscribtion("sub", topicName);
}
