if (typeof AudioContext !== "undefined") {
	context = new AudioContext();
} else if (typeof webkitAudioContext !== "undefined") {
	context = new webkitAudioContext();
} else {
	$(".hideIfNoApi").hide();
	$(".showIfNoApi").show();
}
	
var assetPath = "assets/";
var prevPath; //to reload song at start after initial analysis
var context,  audioBuffer, sourceNode,  analyser, 
	playback, analysing,   hasAnalysed, halfOpen;	
var javascriptNode = context.createScriptProcessor(0, 1, 1);
//store old values for fadeout
var avgStore;
var fBankStore = new Array(0, 0, 0, 0, 0, 0);
//store arrays for beat analysis
var band0Avg = new Array(), band1Avg = new Array(), band2Avg = new Array(),
	band3Avg = new Array(), band4Avg = new Array(), band5Avg = new Array();
var band0AvgFinal = 0, band1AvgFinal = 0, band2AvgFinal = 0,
	band3AvgFinal = 0, band4AvgFinal = 0, band5AvgFinal = 0;
var bandBeats = new Array(false, false, false, false, false, false);
//will not register another beat before dropping below avg amp
var band0prev = false, band1prev = false, band2prev = false,
	band3prev = false, band4prev = false, band5prev = false;
//scores for each agent
var bandScores = new Array(0, 0, 0, 0, 0, 0);
var band0sAr = new Array(), band1sAr = new Array(), band2sAr = new Array(),
	band3sAr = new Array(), band4sAr = new Array(), band5sAr = new Array();
var bandScoresHistory = new Array();

$(document).ready(function() {		
	playback 	= false; 	analysing = false;
	hasAnalysed = false; 	halfOpen  = false;	
					
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
			$("#loadBar").stop();
			$("#analysingDisplay").stop();
			$("#analysingDisplay").animate({ top: '-20%', left: '40%'}, 250 );
			$("#loadBar").animate({ bottom: '-10%'}, 250 );
			$(this).animate({ opacity: 0.8, left: '50%',  top: '10%'}, 500 );
			if (sourceNode)	{
				sourceNode.disconnect();
				playback = false;
				analysing = false;
				hasAnalysed = false;
			}
		}	
	});
		
	$("#bandDetails").click(function() {
		if($(this).offset().left > 0 && !halfOpen){
			$(this).animate({ left: '21%'}, 500 );
			halfOpen = true;
		} else if(halfOpen){
			$(this).animate({ left: '15%'}, 500 );
			halfOpen = false;
		} else {
			$(this).animate({ left: '26%'}, 500 );	
		}
	});
	window.addEventListener( 'resize', onWindowResize, false );
	
	init(); //For webGL context
	animate();
});

function loadSong(path){
	if(!hasAnalysed){
		$("#analysingDisplay").animate({ left: '25%', top: '40%'}, 1500 );
		$("#loadBar").animate({ bottom: '48%'}, 1500 );	
		prevPath = path;
		analysing = true;
	} else {
		$("#analysingDisplay").animate({ top: '-20%', left: '40%'}, 750 );
		$("#loadBar").animate({ bottom: '-10%'}, 750 );
	}
	
	playback = true;
	var request = new XMLHttpRequest();		
	request.open('GET', assetPath + path, true);
	request.responseType = 'arraybuffer';
	
	javascriptNode.connect(context.destination);
	
	analyser = context.createAnalyser();
	analyser.smoothingTimeConstant = 0;
	analyser.fftSize = 256;
	
	sourceNode = context.createBufferSource();
	sourceNode.connect(analyser);
	analyser.connect(javascriptNode);
	sourceNode.connect(context.destination);
		
	request.onload = function() { 
		context.decodeAudioData(request.response, 
		function(buffer){
			if(!hasAnalysed){
				precalcBandAvgAmp(buffer);
				console.log("Sample Rate: ", context.sampleRate);
			} else {
				playSound(buffer);
			}
		}, onError);
	}
	request.send();
}

javascriptNode.onaudioprocess = function () {
	var fBank, average;
	var array = new Uint8Array(analyser.frequencyBinCount);
	
	sourceNode.onended = function() {
		if (analysing){
			hasAnalysed = true;
			analysing 	= false;
			console.log("Finished Analysing");
			storeBandAvgs();

			loadSong(prevPath);
			bandScores 	= new Array(0, 0, 0, 0, 0, 0);
			bandBeats 	= new Array(false, false, false, false, false, false);
			band0sAr 	= new Array(), band1sAr = new Array(), band2sAr = new Array(),
			band3sAr 	= new Array(), band4sAr = new Array(), band5sAr = new Array();
			bandScoresHistory = new Array();
			bandScoresHistory =[band0sAr, band1sAr, band2sAr, band3sAr, band4sAr, band5sAr];
		} else { 
			$("#mainDiv").animate({ opacity: 0.8, left: '50%',  top: '10%'}, 500 );
		}
	}
	
	if (playback) {
		analyser.getByteFrequencyData(array);
		fBank 	 = scheirerFilterBank(array, fBankStore);
		average  = checkAvgAmp(array);
		if (hasAnalysed) { scoreAgents(bandBeats, fBank, average); }
				
		changeLight(average);
		updateEqPlatforms(fBank);
		avgStore 	= average;
		fBankStore  = fBank;
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

function scheirerFilterBank(freqData, prevFreqData){
	var band0  = 0, band1  = 0, band2  = 0, 
		band3  = 0, band4  = 0, band5  = 0,
		band2c = 0, band3c = 0, band4c = 0;
	//48000 sample rate, 256 fft size = 128 brackets = 187.5 hz per bracket
	//48000 sample rate, 512 fft size = 256 brackets = 93.75 hz per bracket
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
		band0Avg.push(band0);	band1Avg.push(band1);	band2Avg.push(band2);
		band3Avg.push(band3);	band4Avg.push(band4);	band5Avg.push(band5);
	} else {
		bandBeats[0] = detectBeats(band0, prevFreqData[0], band0AvgFinal, band0prev);
		bandBeats[1] = detectBeats(band1, prevFreqData[1], band1AvgFinal, band1prev);
		bandBeats[2] = detectBeats(band2, prevFreqData[2], band2AvgFinal, band2prev);
		bandBeats[3] = detectBeats(band3, prevFreqData[3], band3AvgFinal, band3prev);
		bandBeats[4] = detectBeats(band4, prevFreqData[4], band4AvgFinal, band4prev);
		bandBeats[5] = detectBeats(band5, prevFreqData[5], band5AvgFinal, band5prev);
		
		if (bandBeats[0]){ 
			$("#beatBox1").css("background-color","#33cc33"); 
			band0prev = true; 
		} else { 
			$("#beatBox1").css("background-color","#cc3333"); 		
			band0prev = false; 
		}
		if (bandBeats[1]){
			$("#beatBox2").css("background-color","#33cc33"); 
			band1prev = true; 
		} else { 
			$("#beatBox2").css("background-color","#cc3333"); 
			band1prev = false; 
		}
		if (bandBeats[2]){
			$("#beatBox3").css("background-color","#33cc33"); 
			band2prev = true; 
		} else { 
			$("#beatBox3").css("background-color","#cc3333"); 
			band2prev = false; 
		}
		if (bandBeats[3]){
			$("#beatBox4").css("background-color","#33cc33"); 
			band3prev = true; 
		} else { 
			$("#beatBox4").css("background-color","#cc3333"); 
			band3prev = false; 
		}
		if (bandBeats[4]){
			$("#beatBox5").css("background-color","#33cc33"); 
			band4prev = true; 
		} else { 
			$("#beatBox5").css("background-color","#cc3333"); 
			band4prev = false; 
		}
		if (bandBeats[5]){
			$("#beatBox6").css("background-color","#33cc33");  
			band5prev = true; 
		} else { 
			$("#beatBox6").css("background-color","#cc3333"); 
			band5prev = false; 
		}
	}
	var fBank = new Array(band0, band1, band2, band3, band4, band5);
	return fBank;
}

function detectBeats(currentAmp, lastAmp, avgAmp, prevDetect){
//if getting louder ignore, if at peak (was louder now getting quieter + still louder then average) = beat
	if ( currentAmp > avgAmp ){
		if ( lastAmp > currentAmp ){
			if (prevDetect == false ){
				this.prevDetect = true;
				return true;
			}
		}
	} else {
		this.prevDetect = false;
		return false;	
	}
}

function scoreAgents(beatBool, bandAmp, average){
	var topScore = 0; var topID = 0;
	var scoresJQ = new Array ( $("#score1"), $("#score2"), $("#score3"), 
						       $("#score4"), $("#score5"), $("#score6") );

	for(var i = 0; i < (beatBool.length); i++){
		if(beatBool[i]){
			addToArrayLimited( (average / bandAmp[i]), bandScoresHistory[i], 100);
			bandScores[i] = checkAvgAmp(bandScoresHistory[i]);
		}
		if (bandScores[i] >= topScore) {
			topScore = bandScores[i];
			topID = i;
		}
	}
	for(var i = 0; i < (scoresJQ.length); i++){
		scoresJQ[i].html(bandScores[i].toFixed(2));
		if( i == topID ){
			scoresJQ[i].css("background-color","#33cc33"); 
		} else {
			scoresJQ[i].css("background-color","#aaaaaa"); 
		}
	}
}

function addToArrayLimited(value, array, length){
	if(array.length >= length){
		array.pop();
		array.unshift(value);
	} else {
		array.unshift(value);
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
	$("#loadBar").animate({ bottom: '48%'}, 5000 );
	$("#analysingDisplay").animate({ left: '55%'}, 5000 );
	band0Avg = new Array(); band1Avg = new Array(); band2Avg = new Array();
	band3Avg = new Array(); band4Avg = new Array(); band5Avg = new Array();
	sourceNode.buffer = buffer;
	sourceNode.start(0, 20, 5);	//Analyse sec 20-25
}
		
function playSound(buffer) {
	sourceNode.buffer = buffer;
	sourceNode.start(0);
}
		
function onError(e) {
	console.log(e);
}
