if (typeof AudioContext !== "undefined") {
			context = new AudioContext();
		} else if (typeof webkitAudioContext !== "undefined") {
			context = new webkitAudioContext();
		} else {
			$(".hideIfNoApi").hide();
			$(".showIfNoApi").show();
		}
		
		var assetPath = "assets/";
		var context, audioBuffer, sourceNode;	
		var analyser = context.createAnalyser();
		var javascriptNode = context.createScriptProcessor(2048, 1, 1);
		javascriptNode.connect(context.destination);
		
		$(document).ready(function() {								
			$("#song1").click(function() {	loadSong("bensound-happyrock.mp3");		});
			$("#song2").click(function() {	loadSong("bensound-house.mp3");			});
			$("#song3").click(function() {	loadSong("bensound-jazzyfrenchy.mp3");	});
			$("#song4").click(function() {	loadSong("bensound-moose.mp3");			});
			$("#song5").click(function() {	loadSong("bensound-retrosoul.mp3");		});
			$("#song6").click(function() {	loadSong("bensound-rumble.mp3");		});
			
			$("#mainDiv").click(function() {	
				if($(this).offset().left > 0){
					$(this).animate({ opacity: 0.1, left: '-23%', top: '98%'}, 500 );
				} else {
					$(this).animate({ opacity: 1.0, left: '50%',  top: '10%'}, 500 );
					if (sourceNode) sourceNode.disconnect();	//stop playback if menu is focused
				}
			});
			
			window.addEventListener( 'resize', onWindowResize, false );
			init(); //For webGL context
			animate();
		});
		
		function loadSong(path){
			var request = new XMLHttpRequest();		
			request.open('GET', assetPath + path, true);
			request.responseType = 'arraybuffer';
						
			
			analyser.smoothingTimeConstant = 0.2;
			analyser.fftSize = 1024;
			
			sourceNode = context.createBufferSource();
			sourceNode.connect(analyser);
			analyser.connect(javascriptNode);
			sourceNode.connect(context.destination);
			
			request.onload = function() { 
				context.decodeAudioData(request.response, 
				function(buffer){	
					playSound(buffer);
				}, onError);
			}
			request.send();
		}
		
		javascriptNode.onaudioprocess = function () {
			var array =  new Uint8Array(analyser.frequencyBinCount);
			analyser.getByteFrequencyData(array);
			var average = getAverageVolume(array);
			changeLight(average);
		}
		
		function getAverageVolume(array) {
			var values = 0;
			var average;
			var length = array.length;

			for (var i = 0; i < length; i++) {
				values += array[i];
			}
			
			average = values / length;
			return average;
		}
		
		function playSound(buffer) {
			sourceNode.buffer = buffer;
			sourceNode.start(0);
		}
				
		function onError(e) {
			console.log(e);
		}