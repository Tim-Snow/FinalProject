if (typeof AudioContext !== "undefined") {
	context = new AudioContext();
} else if (typeof webkitAudioContext !== "undefined") {
	context = new webkitAudioContext();
} else {
	$(".hideIfNoApi").hide();
	$(".showIfNoApi").show();
}
	
var assetPath = "assets/";
var context, audioBuffer, sourceNode, analyser, 
	playback = false, analysing = false, hasAnalysed = false;;	
var javascriptNode = context.createScriptProcessor(0, 1, 1);

$(document).ready(function() {								
	$("#song1").click(function() {	loadSong("bensound-happyrock.mp3");		});
	$("#song2").click(function() {	loadSong("bensound-house.mp3");			});
	$("#song3").click(function() {	loadSong("bensound-jazzyfrenchy.mp3");	});
	$("#song4").click(function() {	loadSong("bensound-moose.mp3");			});
	$("#song5").click(function() {	loadSong("bensound-retrosoul.mp3");		});
	$("#song6").click(function() {	loadSong("bensound-rumble.mp3");		});
	
	$("#mainDiv").click(function() {	
		if($(this).offset().left > 0){
			$(this).animate({ opacity: 0.6, left: '-23%', top: '96%'}, 500 );
		} else {
			$(this).animate({ opacity: 0.8, left: '50%',  top: '10%'}, 500 );
			if (sourceNode)	{
				sourceNode.disconnect();	//stop playback if menu is focused
				playback = false;
				analysing = false;
				hasAnalysed = false;
			}
		}	
	});
		
	window.addEventListener( 'resize', onWindowResize, false );
	
	init(); //For webGL context
	animate();
});

var prevPath; //to reload song at start after initial analysis
function loadSong(path){
	prevPath = path;
	var request = new XMLHttpRequest();		
	request.open('GET', assetPath + path, true);
	request.responseType = 'arraybuffer';
	
	javascriptNode.connect(context.destination);
	
	analyser = context.createAnalyser();
	analyser.smoothingTimeConstant = 0;
	analyser.fftSize = 512;
	
	sourceNode = context.createBufferSource();
	sourceNode.connect(analyser);
	analyser.connect(javascriptNode);
	sourceNode.connect(context.destination);
		
	request.onload = function() { 
		context.decodeAudioData(request.response, 
		function(buffer){
			if(!hasAnalysed){
				precalcBandAvgAmp(buffer);
				//jquery to show analysing
				console.log("Sample Rate: ", context.sampleRate);
			} else {
				playSound(buffer);
			}
		}, onError);
	}
	request.send();
}
//store arrays for beat analysis
var band0Avg = new Array(); var band1Avg = new Array(); var band2Avg = new Array();
var band3Avg = new Array(); var band4Avg = new Array(); var band5Avg = new Array();
var band0AvgFinal = 0;		var band1AvgFinal = 0;		var band2AvgFinal = 0;
var band3AvgFinal = 0;		var band4AvgFinal = 0;		var band5AvgFinal = 0;
//store old values for fadeout
var avgStore;
var fBankStore = new Array(0, 0, 0, 0, 0, 0);
javascriptNode.onaudioprocess = function () {
	var fBank, average;
	var array = new Uint8Array(analyser.frequencyBinCount);
	
	sourceNode.onended = function() {
		if(analysing == true){
			analysing = false;
			hasAnalysed = true;
			storeBandAvgs();
			console.log("Finished Analysing");
			console.log("B0: ", band0AvgFinal, " B1: ", band1AvgFinal, " B2: ", band2AvgFinal);
			console.log("B3: ", band3AvgFinal, " B4: ", band4AvgFinal, " B5: ", band5AvgFinal);
			loadSong(prevPath);
		}
	}

	//score each band comparing beat to average of all frequencies (higher score for beats at higher volumes)
	//select top scoring band as beat, highlight this eq block
	//update eq blocks to flash when they detect beat
	
	if (playback == true) {
		analyser.getByteFrequencyData(array);
		fBank = scheirerFilterBank(array, fBankStore);
		average = checkAvgAmp(array);
				
		changeLight(average);
		updateEqPlatforms(fBank);
		avgStore = average;
		fBankStore = fBank;
	} else {
	//fadeout when music is stopped
		for (var i = 0; i < (fBankStore.length); i++){
			if(fBankStore[i] >= 2) { 
				fBankStore[i] -= 2; 
			} else { fBankStore[i] = 1; }
		}
		if (avgStore >= 1) { 
			avgStore -= 1; 
		} else { avgStore = 0; }
		
		updateEqPlatforms(fBankStore);
		changeLight(avgStore);
	}
}

//will not register another beat before dropping below avg amp
var band0prev = false; var band1prev = false; var band2prev = false;
var band3prev = false; var band4prev = false; var band5prev = false;

function scheirerFilterBank(freqData, prevFreqData){
	var band0  = 0, band1  = 0, band2  = 0, 
		band3  = 0, band4  = 0, band5  = 0,
		band2c = 0, band3c = 0, band4c = 0;
	//48000 sample rate, 512 fft size = 256 brackets = 187.5 hz per bracket
	for (var i = 0; i < (freqData.length); i++){
		if (i == 0) { //0-200hz
			band0 += freqData[i];
		} else if (i == 1) { //200-400
			band1 += freqData[i];
		} else if (i < 4) { //400-800
			band2 += freqData[i];
			band2c += 1;
		} else if (i < 9) { //800-1600
			band3 += freqData[i];
			band3c += 1;
		} else if (i < 17) { //1600-3200
			band4 += freqData[i];
			band4c += 1;
		} else if (i == 17) { //3200 (3187.5 - 3375)
			band5 += freqData[i];
		}
	}
	band2 = band2 / band2c;
	band3 = band3 / band3c; 
	band4 = band4 / band4c;
	
	if(analysing == true){
		band0Avg.push(band0);
		band1Avg.push(band1);
		band2Avg.push(band2);
		band3Avg.push(band3);
		band4Avg.push(band4);
		band5Avg.push(band5);
	} else {
		if (detectBeats(band0, prevFreqData[0], band0AvgFinal, band0prev)){ console.log("B0 BEAT"); band0prev = true; } else { band0prev = false; }
		if (detectBeats(band1, prevFreqData[1], band1AvgFinal, band1prev)){ console.log("B1 BEAT"); band1prev = true; } else { band1prev = false; }
		if (detectBeats(band2, prevFreqData[2], band2AvgFinal, band2prev)){ console.log("B2 BEAT"); band2prev = true; } else { band2prev = false; }
		if (detectBeats(band3, prevFreqData[3], band3AvgFinal, band3prev)){ console.log("B3 BEAT"); band3prev = true; } else { band3prev = false; }
		if (detectBeats(band4, prevFreqData[4], band4AvgFinal, band4prev)){ console.log("B4 BEAT"); band4prev = true; } else { band4prev = false; }
		if (detectBeats(band5, prevFreqData[5], band5AvgFinal, band5prev)){ console.log("B5 BEAT"); band5prev = true; } else { band5prev = false; }
	}
	var fBank = new Array(band0, band1, band2, band3, band4, band5);
	return fBank;
}

function detectBeats(currentAmp, lastAmp, avgAmp, prevDetect){
//if getting louder ignore, if at peak (was louder now getting quieter + still louder then average) = beat
	if ( currentAmp > avgAmp ){
		if ( lastAmp > currentAmp ){
			if (prevDetect == false ){
				prevDetect = true;
				return true;
			}
		}
	} else {
		prevDetect = false;
		return false;	
	}
}

function storeBandAvgs(){
	band0AvgFinal = checkAvgAmp(band0Avg);
	band1AvgFinal = checkAvgAmp(band1Avg);
	band2AvgFinal = checkAvgAmp(band2Avg);
	band3AvgFinal = checkAvgAmp(band3Avg);
	band4AvgFinal = checkAvgAmp(band4Avg);
	band5AvgFinal = checkAvgAmp(band5Avg);
}

function checkAvgAmp(band){
	var bandAmplitude = 0;
		
	for(var i = 0; i < (band.length); i++){
		bandAmplitude += band[i];
	}
	var avg = bandAmplitude / (band.length);
	return avg;
}

function precalcBandAvgAmp(buffer){
	sourceNode.buffer = buffer;
	analysing = true;
	playback = true;
	sourceNode.start(0, 20, 5);	//Analyse sec 20-25 
}
		
function playSound(buffer) {
	sourceNode.buffer = buffer;
	sourceNode.start(0);
}
		
function onError(e) {
	console.log(e);
}
