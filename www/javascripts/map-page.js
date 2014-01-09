/* Globals */
var MODES = {NORMAL: 1, SUGGEST: 2, REPORT: 3, FILTER: 4};
var MODE = MODES.NORMAL;

INTENSITIES_OFFICIAL = {};
INTENSITIES_UNOFFICIAL = {};
REPORT_MARKERS = {};
MAX_TI_VOTE = 3;
MAX_CREATE_REPORT = 3;
MAX_DOWNVOTE_REPORT = 1;
REPORT_MARKERS_COUNT=0;
ROAD_OFFICIAL = {};
ROAD_UNOFFICIAL = {};
MARKER_FILTER = "View All";
INIT_MAP_ZOOM = 15;

$(function(){
    CREATE_REPORT_LISTENER = null;
    MAXCHAR = 200;
    var sample = {};
    var x=0;
    MapHandler.setup({init_zoom: INIT_MAP_ZOOM}, function(map){
        seedTI('getNodeOfficial',INTENSITIES_OFFICIAL);
        seedTI('getNodeUnofficial',INTENSITIES_UNOFFICIAL);

        getRoadIntensity('getRoadIntensityUnofficial', ROAD_UNOFFICIAL);
        getRoadIntensity('getRoadIntensityOfficial', ROAD_OFFICIAL, function(){
            updateRoad('updateRoadOfficial', ROAD_OFFICIAL, function(){
                updateRoad('updateRoadUnofficial', ROAD_UNOFFICIAL);
            });
        });

        /*
        if(typeof(ROAD_UNOFFICIAL) != "undefined") updateRoad('updateRoadUnofficial', ROAD_UNOFFICIAL);
        if(typeof(ROAD_OFFICIAL) != "undefined") updateRoad('updateRoadOfficial', ROAD_OFFICIAL);
        updateRoad('updateRoadOfficial', ROAD_OFFICIAL);
        updateRoad('updateRoadUnofficial', ROAD_UNOFFICIAL);
        */
 
        
        if(typeof(TOGGLE_MARKERS_VISIBILITY) != "undefined") google.maps.event.removeListener(TOGGLE_MARKERS_VISIBILITY);
        TOGGLE_MARKERS_VISIBILITY = google.maps.event.addListener(MapHandler.MAP, 'zoom_changed', function() {
                toggleMarkersByFilter();
        });
        /*if(MARKER_FILTER == "View All" || MARKER_FILTER == "OFFICIAL"){
            MapHandler.addUIControl("OFFICIAL", 
                google.maps.ControlPosition.TOP_RIGHT
            );
        }else if(MARKER_FILTER == "Traffic Intensity - UnOfficial"){
            MapHandler.addUIControl("UNOFFCIAL", 
                google.maps.ControlPosition.TOP_RIGHT
            );
        }*/
        getReports();

    });

    $("body").on("click", "#addReport", _addReportHandler);
    $("body").on("click", "#plotRoute", _suggestRouteHandler);
    $(".mapnav").on("click", ".search", _gotoHandler);
    $(".mapnav").on("click", ".suggest", _suggestRoutePopop);
    $(".mapnav").on("click", ".report", _createReport);
    $(".mapnav").on("click", ".filter", function(){});
    $("#info").hide();
});


var Traffic_intensity_id, Click;

function _gotoHandler(){
    $('#name').val("");
    $("#SearchLandMark").modal({show:'true', backdrop: 'static', keyboard: true });
    $(".goSearch").on("click", "#go", function() {   
        var location = $('#name').val();
        $.ajax({
            url: BASE_URL + 'searchLandmark',
            type: 'POST',
            data: {place: location},
            success: function(response){
                if(response[0]){
                    var landmark = new google.maps.LatLng(response[0].x, response[0].y);
                    var keys = Object.keys(landmark);
                    var ob = (landmark[keys[0]].toFixed(3) == MapHandler.MAP.getCenter()[keys[0]].toFixed(3));
                    var pb = (landmark[keys[1]].toFixed(3) == MapHandler.MAP.getCenter()[keys[1]].toFixed(3));
                    if(ob && pb){
                    alert("You are already in that location");
                    }else{
                        MapHandler.MAP.panTo(landmark);    
                    }
                }else{
                    alert("Location was not found");
                }
            }
        });
        $("#SearchLandMark").modal("hide");
    });
}

function _suggestRouteHandler(){
    MARKER_FILTER = "Hide All";
    toggleMarkersByFilter();

    var expDay = $('#route-durationDays').val();
    var expHour = $('#route-durationHours').val();

    if(IS_OFFICIAL == 1){
        if(expDay == ""){       expDay = "0";   }
        if(expHour == ""){      expHour = "0";  }
    }
    if( ($('#origin').val() == "") || ($('#destination').val() == "")){
        $("#errorMsg span").text('Input origin and destination!');
        $("#errorMsg").show();
        setTimeout(function(){
            $("#errorMsg").hide("slow");
        }, 1000);
        return;
    }else if((expDay=="0") && (expHour=="0")){
        $("#errorMsg span").text('Invalid input of duration!');
        $("#errorMsg").show();
        setTimeout(function(){
            $("#errorMsg").hide("slow");
        }, 1000);
        return;
    }

        $("#suggestRoute").modal("hide");

        START = $("#origin").val();
        END = $("#destination").val();
        ROUTE_DURATION_DAYS = $("#route-durationDays").val() || 0;
        ROUTE_DURATION_HOURS = $("#route-durationHours").val() || 0;

        MapHandler.clearControls();

        var suggest_guide = "Click on map to place markers, drag markers to change route";
        MapHandler.addUIControl(suggest_guide, google.maps.ControlPosition.BOTTOM_CENTER);

        MapHandler.addUIControl("Done", google.maps.ControlPosition.TOP_RIGHT, _saveRoute);
        MapHandler.addUIControl("Clear Markers", google.maps.ControlPosition.TOP_RIGHT, Route.resetMarkers);
        MapHandler.addUIControl("Cancel", google.maps.ControlPosition.TOP_RIGHT, function(){ suggestToNormal();  });

        MapHandler.MAP.setZoom(16);
        Route.init(MapHandler.MAP, true); 
}

function getReports(){
    REPORT_MARKERS = {};
    
    $(".reports").each(function(){
        var myLatlng = new google.maps.LatLng($(this).data('lat'),$(this).data('lng'));
        var reportIcon = ($(this).data('type').replace(/\s+/g, '')).toLowerCase();

        var marker = new google.maps.Marker({
            position: myLatlng,
            map: MapHandler.MAP,
            title: $(this).data('type'),
            id: $(this).data('id'),
            icon: IMG_BASE + reportIcon + '.png'
        });

        REPORT_MARKERS[$(this).data('id')] = marker;
        REPORT_MARKERS_COUNT++;

        google.maps.event.addListener(marker, 'click', function(event) {
            var id = "#reports-" + this.id;
            var status = ($(id).data('official')) ? 'Official': 'Unofficial';
            var date = new Date($(id).data('created'));
            var createDate = (date.getMonth()+ parseInt(1)) + '-' + date.getDate() + '-' + date.getFullYear();
            $('#downvoteReport').removeAttr("disabled");
            $('#openReport').modal({show:'true', backdrop: 'static', keyboard: true });
            $('#displayReportInfo').html('Report Type: ' + $(id).data('type') + '<br/>Details: ' + $(id).data('details') + '<br/>Created At: '+ createDate + '<br/>Status: ' + status);
            $('#downvotes').html($(id).data('downvotes'));
            $('#downvotesAmt').val($(id).data('downvotes'));
            $('#reportId').val($(id).data('id'));
        });
    });
}

function getRoadIntensity(link,obj, cb){
    $.ajax({
        url: BASE_URL + link,
        type: 'POST',
        success: function(response){
            var flightPlanCoordinates = [];

            for(i in response){
                road = JSON.parse(response[i].road);
                flightPlanCoordinates = [];
                for(j in road){
                    var s = new google.maps.LatLng(road[j].lat, road[j].lng);
                    flightPlanCoordinates.push(s);
                }
                var flightPath = new google.maps.Polyline({
                    path: flightPlanCoordinates,
                    geodesic: true,
                    clickable: false,
                    strokeColor: '#33b100',
                    strokeOpacity: 1.0,
                    strokeWeight: 4,
                    id: response[i].id
                }); 

                obj[flightPath.id] = flightPath;
                flightPath.setMap(MapHandler.MAP);
            }

            if(typeof(cb) != "undefined"){
                cb();
            }else{
                MARKER_FILTER = "View All";
                toggleMarkersByFilter();
            }
            
        }
    });
}
function updateRoad(link,obj, cb){
    $.ajax({
        url: BASE_URL + link,
        type: 'POST',
        data: {},
        success: function(response){
            for(i in response){
              if(typeof(obj[ response[i].id ]) != "undefined"){
                if(response[i].status == "Light" && (response[i].lane == 1 || response[i].lane == 0)){
                  obj[response[i].id].setOptions({strokeColor: '#33b100'});
                }else if(response[i].status == "Medium" && (response[i].lane == 1 || response[i].lane == 0)){
                  obj[response[i].id].setOptions({strokeColor: '#ffcc00'});
                }else if(response[i].status == "Heavy" && (response[i].lane == 1 || response[i].lane == 0)){
                  obj[response[i].id].setOptions({strokeColor: '#990000'});
                }
              }

            }
            if(typeof(cb) != "undefined"){  cb();   }
        }
    });
}
function getUpdate(link,obj){
    $.ajax({
        url: BASE_URL + link,
        type: 'POST',
        success: function(response){
            for(i in response){
                if(obj[response[i].id] == INTENSITIES_UNOFFICIAL[response[i].id]){
                    if(obj[response[i].id]) obj[response[i].id].setVisible(false);
                }

                if(typeof(obj[ response[i].id ]) != "undefined")
                obj[ response[i].id ].setIcon( getIcon(response[i].lane_1, response[i].lane_2) );
            }
        }
    });
}

function seedTI(link,obj){
    var marker,mark;
    var x = 0;
    var marker_holder = {};
    
    IN = [];
    IN_E = [];
    $.ajax({
        url: BASE_URL + link,
        type: 'POST',
        success: function(response){
            for(i in response){
                if(!marker_holder[response[i].id]){
                    marker_holder[response[i].id] = [];
                    var _marker = new google.maps.Marker({
                        position: new google.maps.LatLng(response[i].lat , response[i].lng),
                        map: MapHandler.MAP,
                        title: 'Traffic' + response[i].id,
                        visible: true,
                        id: response[i].id,
                        icon: IMG_BASE + 'g1.png',
                        lane: response[i].lane_2,
                    });

                    obj[_marker.id] = _marker;
                    google.maps.event.addListener(_marker, 'click', function(event) {
                        var new_cookie = get_cookie("TI-"+ this.id);
                        if(new_cookie >= MAX_TI_VOTE){
                            alert("CAN'T VOTE");
                        }else{
                            Traffic_intensity_id = this.id;
                            if(this.lane != "NONE"){
                                $('#TwoWay').modal({show:'true', backdrop: 'static', keyboard: true });
                            }else{
                                $('#OneWay').modal({show:'true', backdrop: 'static', keyboard: true });
                            }
                        }
                    });
                    IN.push(_marker);
                }
                marker_holder[response[i].id].push(response[i]);

                if(obj == INTENSITIES_OFFICIAL){
                    getUpdate('getUpdateOfficial',INTENSITIES_OFFICIAL);
                }else{
                    getUpdate('getUpdateUnofficial',INTENSITIES_UNOFFICIAL);
                }
                
            }


        },
        error: function(){
            alert("ERROR");
        }
    });
}

function _saveRoute(){
    if(Route.MARKERS.length < 2){
        alert("Please plot a route");
        return;
    }
    var nodes = Route.getNodesStr(); //TRAP later

    var routes = {
        title: START + " " + END,
        start: START,
        end: END,
        days: ROUTE_DURATION_DAYS,
        hours: ROUTE_DURATION_HOURS,
        nodes: nodes
    };

    $.ajax({
        url: BASE_URL + 'addRoutes',
        type: 'POST',
        data: routes, 
        success: function(response){
            if(response == "TRUE"){
                suggestToNormal();
            }else{
                alert("Adding the suggested route has failed");
            }
        }
    });
}

function suggestToNormal(){
    MARKER_FILTER = "View All";
    toggleMarkersByFilter();

    MODE = MODES.NORMAL;
    MapHandler.MAP.setZoom(INIT_MAP_ZOOM); //ZOOM OUT
    Route.resetMarkers();
    MapHandler.MAP.controls[google.maps.ControlPosition.BOTTOM_CENTER].clear();
    MapHandler.MAP.controls[google.maps.ControlPosition.TOP_RIGHT].clear();
    MapHandler.MAP.setOptions({draggableCursor: "default"});
    
    google.maps.event.removeListener(Route.SUGGEST_ROUTE_LISTENER);
}
/* end of suggest route */

/* Start of 'Report Module' */
function _addReportHandler(){

    var expDay = $('#durationDays').val();
    var expHour = $('#durationHours').val();

    if(IS_OFFICIAL == 1){
        if(expDay==""){expDay = "0";}
        if(expHour==""){expHour = "0";}
    }

    if((expDay=="0") && (expHour=="0")){
        $("#info span#msg").text('Invalid input of duration!');
        $("#info").show();
        setTimeout(function(){  $("#info").hide("slow"); }, 1000);  
    }else{
        $("#reportSituation").modal('hide');
        var location_guide = "Click on map to select location";
        MapHandler.clearControls();
        MapHandler.addUIControl(location_guide, google.maps.ControlPosition.BOTTOM_CENTER);
        
        CREATE_REPORT_LISTENER = google.maps.event.addListener(MapHandler.MAP, "click", function(event) {
            var lat = event.latLng.lat();
            var lng = event.latLng.lng();
            MapHandler.MAP.controls[google.maps.ControlPosition.BOTTOM_CENTER].clear();

            $('#confirmReport').modal({show:'true', backdrop: 'static', keyboard: true });
            $('#lat').val(lat);
            $('#lng').val(lng);
            $('#days').val(expDay);
            $('#hours').val(expHour);
            $('#confirmDetails').html('Report Type: ' + $('#reportType').val() + '<br/>Report Details: '+ $('#reportDetails').val()+'<br/>Lat: '+lat+'<br/>Lng:'+lng);
        });
    }
}
    
function _createReport(){
    var create_report_cookie = get_cookie("Report-create");

    /* if refactored.. check condition if < or <=*/
    if(create_report_cookie < MAX_CREATE_REPORT){

         if(MODE == MODES.NORMAL){
            MODE = MODES.REPORT;

            $('#reportDetails').val("");
            $('#durationDays').val("");
            $('#durationHours').val("");
            $('#txtCount').val(MAXCHAR);
            $('#reportSituation').modal({show:'true', backdrop: 'static', keyboard: true });
        }
        else{
            alert('report - invalid action');
        }
    }
    else{
        alert("Can't create anymore report.");
    }
}

function _suggestRoutePopop(){
    if(MODE == MODES.NORMAL){
        MODE = MODES.SUGGEST;

        $('#origin').val("");
        $('#destination').val("");
        $('#route-durationDays').val("");
        $('#route-durationHours').val("");
        $("#suggestRoute #errorMsg").hide();
        $("#suggestRoute").modal({show:'true', backdrop: 'static', keyboard: true });
    }
    else{
        alert('suggest -invalid action');
        return;
    }
}
