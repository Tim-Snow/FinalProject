var halfOpen, hidden;

$(document).ready(function() {	
	hidden = true;
	$("#song1").click(function() {	loadSong("bensound-happyrock.mp3", 		false);	});
	$("#song2").click(function() {	loadSong("bensound-house.mp3", 			false);	});
	$("#song3").click(function() {	loadSong("bensound-jazzyfrenchy.mp3", 	false);	});
	$("#song4").click(function() {	loadSong("bensound-moose.mp3", 			false);	});
	$("#song5").click(function() {	loadSong("bensound-retrosoul.mp3", 		false);	});
	$("#song6").click(function() {	loadSong("bensound-rumble.mp3", 		false);	});
	
	$("#credits").click(function() {
		if(hidden){
			$(this).animate({ bottom: '20%', right: '40%', opacity: 1.0}, 500 );
			hidden = false;
		} else {
			$(this).animate({ bottom: '-120px', right: '-40px', opacity: 0.5}, 500 );
			hidden = true;
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
				playback 	= false;
				analysing 	= false;
				hasAnalysed = false;
				
				for ( var i = 0; i < (scoresJQ.length); i++ ) {
					scoresJQ[i].html( "0.0" );
					scoresJQ[i].css("background-color","#222222"); 
					updateBeatBoxes(false, false, false, false, false, false);
				}
			}
		}	
	});
		
	var file;
	var drop = document.getElementById("dragSongBox");
	if(window.FileReader){
	  function onDrop(evt) {
		evt.stopPropagation();
		evt.preventDefault();
		
		var reader = new FileReader();
		file = evt.dataTransfer.files.item(0);
		reader.readAsArrayBuffer(file);
		
		reader.addEventListener('loadend', function(){
			if(file.type.match(/audio\/(mp3|mpeg|ogg)/)){
				$("#mainDiv").animate({ opacity: 0.6, left: '-23%', top: '96%'}, 500 );
				loadSong(this.result, true);
			} else { console.log("Bad file type"); }
		}, false);
	  }
	  
	  function onDragOver(evt) {
		evt.stopPropagation();
		evt.preventDefault();
	  }

	  drop.addEventListener('dragover', onDragOver, false);
	  drop.addEventListener('drop', 	onDrop, 	false);
	} else { $("dragSongBox").hide(); }
});