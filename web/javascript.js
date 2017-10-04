window.onload = function start(){
	setInterval(updatedEvent, 2000);

	$( "#sub" ).click(function() {
	  	subscribe();
		console.log('sub');
	});	
	$( "#unsub" ).click(function() {
	  	unsubscribe();
		console.log('unsub');
	});

	var birdsCanvas = document.getElementById("birdsChart");

	var angleValues = new Array();
	var i;
	for (i =0; i<360;i++){
		angleValues.push(Math.floor((Math.random() * 50) + 1));
	}
	var birdsData = {
	  datasets: [{
		data: angleValues,
		backgroundColor: "#f38b4a",
		borderColor: "#f38b7a"
	  }]
	};

	var polarAreaChart = new Chart(birdsCanvas, {
	  type: 'polarArea',
	  data: birdsData
	});
	console.log(polarAreaChart.options);
	
}



function askForData(path,element, contentType){
	$.ajax({
		url: "http://192.93.8.109:8089/"+path,
		type: "GET",
		//contentType: contentType,
		//dataType: contentType,
		success: function(data) {
			console.log("Success");
			console.log(data);
			// Looking for where is the array with data; +6 is to start the string at "[" and not at "data"
			uintAsString = data.substring(data.indexOf("data: [") + 6);
			if(uintAsString != undefined && uintAsString.length >0){
				uintAsJson = JSON.parse(uintAsString);
				var u8 = new Uint8Array(uintAsJson.length);
				for(var i=0; i < uintAsJson.length; i++) {
					u8[i] = uintAsJson[i];
				}
				var b64encoded =  btoa(Uint8ToString(u8));
				element.src = "data:image/jpeg;base64, "+b64encoded;
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

function setSubscribtion(path, topicName){
	$.ajax({
		url: "http://192.93.8.109:8089/"+path,
		type: "POST",
		contentType: "application/json",
		dataType: "application/json",
		data: {key: topicName},
		success: function(data) {
			console.log("Success");
			console.log(data);
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

function Uint8ToString(u8a){
  var CHUNK_SZ = 0x8000;
  var c = [];
  for (var i=0; i < u8a.length; i+=CHUNK_SZ) {
    c.push(String.fromCharCode.apply(null, u8a.subarray(i, i+CHUNK_SZ)));
  }
  return c.join("");
}



function updatedEvent() {
    var d = new Date();
	//askForData("getLCamRate",document.getElementById("leftCameraRate"),"application/json");
	//askForData("getMCamRate",document.getElementById("midCameraRate"),"application/json");
	//askForData("getMCamImage",document.getElementById("image"),"image/jpeg");
	askForData("getMCamImage",document.getElementById("image1"),"image/jpeg");
    document.getElementById("midCameraRate").innerHTML = d.toLocaleTimeString();
}

function unsubscribe() {
    setSubscribtion("unsub","middleCam");
}

function subscribe() {
    setSubscribtion("sub","middleCam");
}
