$(function(){
	MapHandler.setup({init_zoom: 13}, function(map){
		var route = {};
		route.title = htmlEntities($("#route-title").val());
		route.start = ($("#route-start").val());
		route.end = ($("#route-end").val());
        route.nodes = unescape($("#route-nodes").val());
        route.is_Official = $("#route-is_Official").val();

        $("#page-container").on("click", ".roback", function(){
        	viewPage("routes");
			$(".mapnav").show();
        });

        MapHandler.addUIControl((route.is_Official == 1 ? "Official": "Unofficial") + " Route", google.maps.ControlPosition.TOP_LEFT);
        var msg = "<p style=\"margin: 0 !important; \"> " + htmlEntities(route.start) + " - " + htmlEntities(route.end) + "</p>";
        $(".msgbox").html(msg);

		//load route
		Route.init(MapHandler.MAP, false);
		Route.loadRoute(JSON.parse(route.nodes));
	});
	$(".mapnav").hide();
});