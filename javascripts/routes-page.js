$(function(){
	MapHandler.setup({init_zoom: 13}, function(map){
		var route = {};
		route.title = $("#route-title").val();
        route.nodes = $("#route-nodes").val();
        route.is_Official = $("#route-is_Official").val();

		MapHandler.addUIControl("Back", 
			google.maps.ControlPosition.TOP_LEFT, 
			function(){
				window.location = "/routes"; //TEMP solution  --back should load the routes page using ajax
			}
		);

		MapHandler.addUIControl(route.title, 
			google.maps.ControlPosition.TOP_CENTER
		);


		//load route
		Route.init(MapHandler.MAP, false);
		Route.loadRoute(JSON.parse(route.nodes));
	});
	$(".desktop-nav").css("margin-left", "-1000px");
});