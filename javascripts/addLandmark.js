$(function(){

	MapHandler.setup({init_zoom: 14}, function(map){
		MapHandler.MAP.setOptions({draggableCursor: "crosshair"});
		
		google.maps.event.addListener(map, "click", function(event) {
			var lat = event.latLng.lat();
			var lng = event.latLng.lng();


			// populate yor box/field with lat, lng
			$('#confirmLandmark').modal('show');
			$('#lat').val(lat);
			$('#lng').val(lng);
			$('#landmarkDetails').html('Landmark name:'+$('#landmarkName').val()+'<br/>Lat: '+lat+'<br/>Lng:'+lng);

		});//end of click event 
	});//end of setup
});

