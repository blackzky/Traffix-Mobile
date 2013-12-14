/* Globals */
var MODES = {NORMAL: 1, SUGGEST: 2, REPORT: 3};
var MODE = MODES.NORMAL;

INTENSITIES = {};
REPORT_MARKERS = {};
MAX_TI_VOTE = 3;
$(function(){
    CREATE_REPORT_LISTENER = null;
    MAXCHAR = 200;

    MapHandler.setup({init_zoom: 15}, function(map){
        //for adding marker to DB
        /*MapHandler.MAP.setOptions({draggableCursor: "crosshair"});
        google.maps.event.addListener(map, "click", function(event) {
            var lat = event.latLng.lat();
            var lng = event.latLng.lng();
            $.ajax({
                url: '/saveNode',
                type: 'POST',
                data: {lat:lat, lng:lng},
                success: function(response){
                    alert("SAVE!");
                },
                error: function(){
                    alert("ERROR");
                }
            });
        });//end of click event */
       
        seedTI();
        getReports();

        $.ajax({
            url: BASE_URL + 'getUpdate',
            type: 'POST',
            data: {},
            success: function(response){
                for(i in response){
                    if(typeof(INTENSITIES[ response[i].id ]) != "undefined")
                    INTENSITIES[ response[i].id ].setIcon( getIcon(response[i].lane_1, response[i].lane_2) );
                }
            }
        });
    });

    $("body").on("click", "#addReport", _addReportHandler);
    $("body").on("click", "#plotRoute", _suggestRouteHandler);
    $(".mapnav").on("click", ".search", _gotoHandler);
    $(".mapnav").on("click", ".suggest", _suggestRoutePopop);
    $(".mapnav").on("click", ".report", _createReport);
    $(".mapnav").on("click", ".filter", function(){console.log("filter")});
    $("#info").hide();
});


var Traffic_intensity_id, Click;

function _gotoHandler(){
    var location = prompt("Enter a location");
    $.ajax({
        url: BASE_URL + 'searchLandmark',
        type: 'POST',
        data: {place: location},
        success: function(response){
            console.log();
            if(response[0]){
                var landmark = new google.maps.LatLng(response[0].x, response[0].y);
                var ob = (landmark.ob.toFixed(3) == MapHandler.MAP.getCenter().ob.toFixed(3));
                var pb = (landmark.pb.toFixed(3) == MapHandler.MAP.getCenter().pb.toFixed(3));
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
}

function _suggestRouteHandler(){
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

        var suggest_guide = "<h3>Click on map to place markers, drag markers to change route</h3>";
        MapHandler.addUIControl(suggest_guide, google.maps.ControlPosition.BOTTOM_CENTER);

        MapHandler.addUIControl("Done", google.maps.ControlPosition.TOP_RIGHT, _saveRoute);
        MapHandler.addUIControl("Clear Markers", google.maps.ControlPosition.TOP_RIGHT, Route.resetMarkers);
        MapHandler.addUIControl("Cancel", google.maps.ControlPosition.TOP_RIGHT, function(){ suggestToNormal();  });

        MapHandler.MAP.setZoom(15);
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
            icon: '../img/' + reportIcon + '.png'
        });

        REPORT_MARKERS[$(this).data('id')] = marker;

        google.maps.event.addListener(marker, 'click', function(event) {
            var id = "#reports-" + this.id;
            var status = ($(id).data('official')) ? 'Official': 'Unofficial';
            var date = new Date($(id).data('created'));
            var createDate = (date.getMonth()+ parseInt(1)) + '-' + date.getDate() + '-' + date.getFullYear();
            $('#downvoteReport').removeAttr("disabled");
            $('#openReport').modal('show');
            $('#displayReportInfo').html('Report Type: ' + $(id).data('type') + '<br/>Details: ' + $(id).data('details') + '<br/>Created At: '+ createDate + '<br/>Status: ' + status);
            $('#downvotes').html($(id).data('downvotes'));
            $('#downvotesAmt').val($(id).data('downvotes'));
            $('#reportId').val($(id).data('id'));
        });
    });
}


function seedTI(){
    var marker,mark;
    var x = 0;
    var marker_holder = {};
    
    IN = [];
    IN_E = [];
    $.ajax({
        url: BASE_URL + 'getNode',
        type: 'POST',
        data: {},
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
                        icon: '../img/g1.png',
                        lane: response[i].lane_2
                    });

                    INTENSITIES[_marker.id] = _marker;
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
            }
            google.maps.event.addListener(MapHandler.MAP, 'zoom_changed', function() {
                var zoomLevel = MapHandler.MAP.getZoom();
                console.log('Zoom Level: ' + zoomLevel);
                for(i in IN){
                    if(typeof(IN[i]) != "undefined" ){
                        IN[i].setVisible(zoomLevel > 14);
                    }
                }
            });
                
        },
        error: function(){
            alert("ERROR");
        }
    });
}

function _saveRoute(){
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
    MODE = MODES.NORMAL;
    MapHandler.MAP.setZoom(13); //ZOOM OUT
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
        console.log("aa");
        $("#info span#msg").text('Invalid input of duration!');
        $("#info").show();
        setTimeout(function(){  $("#info").hide("slow"); }, 1000);  
    }else{
        $("#reportSituation").modal('hide');
        var location_guide = "<h3>Click on map to select location</h3>";
        MapHandler.addUIControl(location_guide, google.maps.ControlPosition.BOTTOM_CENTER);
        
        CREATE_REPORT_LISTENER = google.maps.event.addListener(MapHandler.MAP, "click", function(event) {
            var lat = event.latLng.lat();
            var lng = event.latLng.lng();
            MapHandler.MAP.controls[google.maps.ControlPosition.BOTTOM_CENTER].clear();

            $('#confirmReport').modal('show');
            $('#lat').val(lat);
            $('#lng').val(lng);
            $('#days').val(expDay);
            $('#hours').val(expHour);
            $('#confirmDetails').html('Report Type: ' + $('#reportType').val() + '<br/>Report Details: '+ $('#reportDetails').val()+'<br/>Lat: '+lat+'<br/>Lng:'+lng);
        });
    }
}
    
function _createReport(){
     if(MODE == MODES.NORMAL){
        MODE = MODES.REPORT;

        $('#reportDetails').val("");
        $('#durationDays').val("");
        $('#durationHours').val("");
        $('#txtCount').val(MAXCHAR);
        $('#reportSituation').modal('show');
    }
    else{
        alert('report - invalid action');
        return;
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
        $("#suggestRoute").modal("show");
    }
    else{
        alert('suggest -invalid action');
        return;
    }
}
