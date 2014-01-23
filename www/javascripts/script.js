BASE_URL = window.location.origin + "/";
USE_REMOTE = true; /* Modify this before deployment. Value depends on device type. */
IMG_BASE = USE_REMOTE ? "img/" : "../img/";
REPORTS_CONFIG={};
ROUTES_CONFIG={};
REPORTS_CONFIG={};
TRAFFIC_CONFIG={};
UNOFFICIAL_TRAFFIC ="UnOfficial Traffic";
OFFICIAL_TRAFFIC ="Official Traffic";
//LIVE_URL = "http://cbtafcc.herokuapp.com/"; /*Modify this later to the production url */
LIVE_URL = "http://10.10.33.64:3000/"; /*Modify this later to the production url */
SOCKET = null;

IS_LOGGEDIN=false;

$(function() {
    var origin = (window.location.port == "" ? (window.location.origin + ":3000") : window.location.origin) + "/";
    //BASE_URL = isMobile() ? LIVE_URL : origin;
    BASE_URL = LIVE_URL;
    if(hasStorage()){
        if(localStorage.getItem("BASE_URL")){
            BASE_URL = localStorage.getItem("BASE_URL");
        }else{
            BASE_URL = LIVE_URL;  
        }
    }
    SOCKET = io.connect(BASE_URL);

    initConfig();
    $("nav#menu").mmenu({   position: "right",  zposition: "back"   });
    

    $("#traffix-nav").on("click", "#menu-bars", function(){ 
        $("#loading").hide();
    });
    
    $(".page-links").on("click", "a", function(e){ 
        e.preventDefault(); 
        viewPage(null, this);   
    });
    if(hasStorage() && !isMobile()){
        if(localStorage.getItem("CUR_PAGE")){
            viewPage(localStorage.getItem("CUR_PAGE"));
        }else{
            viewPage("map");
        }
    }else{
        viewPage("map");
    }

    $(window).resize(fitContent);
    fitContent();
    checkStats();

    $("#traffix-content").on("click", "#change_live_url, #yellow-box", function(e){
        e.preventDefault();
        BASE_URL = prompt('Enter URL', LIVE_URL) || LIVE_URL;
        if(hasStorage()) localStorage.setItem("BASE_URL", BASE_URL);
        location.reload();
    });

    if(SOCKET){
        SOCKET.on('route-added', function (route) {
            if($('#listdiv').length > 0){
                $("#no-routes-info").hide();

                var content = "<div class='" + (route.is_Official == 1 ? 'official' : 'unofficial') + "-routes'>"
                content += "<a href='#' class='list-group-item alternative-route' data-id='" + route.id + "' id='route-item-" + route.id + "'>" + route.title;

                if(route.is_Official == 1){
                    content += "<span class='badge'>Official</span>";
                }

                content += "</a>";
                content += createHiddenDom("route-" + route.id + "-title", route.title);
                content += createHiddenDom("route-" + route.id + "-start", route.start);
                content += createHiddenDom("route-" + route.id + "-end", route.end);
                content += createHiddenDom("route-" + route.id + "-nodes", route.nodes);
                content += createHiddenDom("route-" + route.id + "-is_Official", route.is_Official);
                content += "</div>";

                $('#listdiv').append(content);
            }
        });
    
        SOCKET.on('route-removed', function (id) {
            if($('#listdiv').length > 0){
                $("#route-item-" + id).remove();
            }
        });

        SOCKET.on('report-added', function (report) {
            var updated_report = '<input type="hidden" class="reports" value="' + report.id + '"id="reports-' + report.id + '" data-id="' + report.id + '" data-type="' + report.type + '"data-details="' + escape(report.details) + '" data-lat="' + report.lat + '" data-lng="' + report.lng + '" data-official="' + report.is_official + '" data-created="' + report.created_at + '" data-downvotes="0" />';
            $("#reports-list").append(updated_report);

            var myLatlng = new google.maps.LatLng(report.lat ,report.lng);
            var reportIcon = (report.type.replace(/\s+/g, '')).toLowerCase();

            var marker = new google.maps.Marker({
                position: myLatlng,
                map: MapHandler.MAP,
                title: report.type,
                id: report.id,
                icon: IMG_BASE + reportIcon + '.png'
            });

            REPORT_MARKERS[report.id] = marker;

            google.maps.event.addListener(marker, 'click', function(event) {
                var id = "#reports-" + this.id;
                var status = ($(id).data('official')) ? 'Verified': 'Not Verified';
                var d = $(id).data('created').split("-");
                d[1] = parseInt(d[1]) + 1;
                var date = new Date(d.join("-"));
                var createDate = (date.getMonth()+ parseInt(1)) + '-' + date.getDate() + '-' + date.getFullYear();
                $('#downvoteReport').removeAttr("disabled");
                $('#openReport').trigger('open');
                $('.displayReportInfo').html('<div class="form-group"><label>Report Type:</label> <div class="form-control">' + $(id).data('type') + '</div> </div> <div class="form-group"> <label>Details:</label> <div class="form-control" style="overflow: auto; height: 100%;">' + unescape($(id).data('details')) + '</div> </div>');
                $('.datestamp').html('<label><em>Created at:</em> '+ createDate + ' </label>');
                $('.statstamp').html(status);
                if(status == 'Verified'){
                    $('.statstamp').addClass('verified');
                }else
                    $('.statstamp').removeClass('verified');

                $('#downvotes').html($(id).data('downvotes'));
                $('#downvotesAmt').val($(id).data('downvotes'));
                $('#reportId').val($(id).data('id'));
            });

            if(MapHandler.MAP) toggleMarkersByFilter();
        });

        SOCKET.on('report-removed', function (id) {
            REPORT_MARKERS[id].setMap(null);
            delete REPORT_MARKERS[id];
            $("#reports-" + id).replaceWith("");

            if(MapHandler.MAP) toggleMarkersByFilter();
        });

        SOCKET.on('report-downvote', function (report) {
            var r = $("#reports-" + report.id); 
            r.data("downvotes", parseInt( report.votes ) );
            $("#openReport #downvotes").text(parseInt( report.votes ));
            $("#openReport #downvotesAmt").val( parseInt( report.votes ));
        });

        SOCKET.on('intensity-update', function(intensity) {
            if(intensity){
                if(intensity.is_official == 1){
                    if(INTENSITIES_OFFICIAL[intensity.id].getIcon() != getIcon(intensity.lane_1, intensity.lane_2)){
                        INTENSITIES_OFFICIAL[intensity.id].setIcon( getIcon(intensity.lane_1, intensity.lane_2) );
                    }
                }
                if(intensity.is_official == 0){
                    if(INTENSITIES_UNOFFICIAL[intensity.id].getIcon() != getIcon(intensity.lane_1, intensity.lane_2)){
                        INTENSITIES_UNOFFICIAL[intensity.id].setIcon( getIcon(intensity.lane_1, intensity.lane_2) );
                    }
                }
            }
        });

        SOCKET.on('road-update', function(road) {
            if(road.is_official == 1){
                if(typeof(ROAD_OFFICIAL[road.id ]) != "undefined"){
                    if(road.status == "Light" && (road.lane == 1 || road.lane == 0)){
                        ROAD_OFFICIAL[road.id].setOptions({strokeColor: '#33b100'});
                    }else if(road.status == "Medium" && (road.lane == 1 || road.lane == 0)){
                        ROAD_OFFICIAL[road.id].setOptions({strokeColor: '#ffcc00'});
                    }else if(road.status == "Heavy" && (road.lane == 1 ||road.lane == 0)){
                        ROAD_OFFICIAL[road.id].setOptions({strokeColor: '#990000'});
                    }
                }
            }
            if(road.is_official == 0){
                if(typeof(ROAD_UNOFFICIAL[road.id ]) != "undefined"){
                    if(road.status == "Light" && (road.lane == 1 || road.lane == 0)){
                        ROAD_UNOFFICIAL[road.id].setOptions({strokeColor: '#33b100'});
                    }else if(road.status == "Medium" && (road.lane == 1 || road.lane == 0)){
                        ROAD_UNOFFICIAL[road.id].setOptions({strokeColor: '#ffcc00'});
                    }else if(road.status == "Heavy" && (road.lane == 1 ||road.lane == 0)){
                        ROAD_UNOFFICIAL[road.id].setOptions({strokeColor: '#990000'});
                    }
                }
            }

        });

    }

});

window.isMobile = function(){
    return (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase()));
}

window.hasStorage = function(){  return (typeof(Storage)!=="undefined"); }

function viewPage(page, dom){
    $("#loading").show();
    initConfig();
    page = page || $(dom).data('page');
    if(page=="options"||page=="routes")
        MARKER_FILTER="";
    if(page){
        page = page.toLowerCase();
    }else{
        return;
    }
    if(hasStorage()) localStorage.setItem("CUR_PAGE", page);
    var path = BASE_URL + page;
    if(page){
        $("nav#menu").trigger("close");
    }else{
       path = BASE_URL;
    }
    $.ajax({
        url: path,
        type: 'GET',
        success: function(response){
            $("#loading").hide();
            $('#page-container').html(response);
            
            $("body").off("input","textarea, input[type='text'], input[type='password']").on("input","textarea, input[type='text'], input[type='password']", function (event){ 
                this.value = this.value.replace(/[^A-Za-z0-9\'\",.?!@#\- ]/g, '');
            });
        }
    });

    return;
}

function changeStatus(){
    if(IS_LOGGEDIN){
        if($(window).width()<850)
            $('#acctStatus').html('<span class="menu-icon glyphicon glyphicon-user"></span>');
        else
             $('#acctStatus').html('<span class="menu-icon glyphicon glyphicon-user"></span>Logout');
        $('#status_1').html('<span class="menu-icon glyphicon glyphicon-user"></span>Logout');
        $('#acctOptions').html('<a href="/options" data-page="options"><span class="menu-icon glyphicon glyphicon-cog"></span>Options</a>');
        $('#acctOptions1').html('<a href="/options" data-page="options"><span class="menu-icon glyphicon glyphicon-cog"></span>Options<span class="navbar-unread">.</span></a>');
     
    }else{
        $('#acctStatus').html('<span class="menu-icon glyphicon glyphicon-user"></span>Login');
        $('#status_1').html('<span class="menu-icon glyphicon glyphicon-user"></span>Login');
        $('#acctOptions1').html('.');
         $('#acctOptions').html('');
    }
}

function checkStats(){
    $.ajax({
    url: BASE_URL + 'checkifloggedin',
    type: 'POST',
    data: {},
    success: function(response){
       if(response=='1'){
            IS_LOGGEDIN=true;
            changeStatus();

        }else{
            IS_LOGGEDIN=false;
            changeStatus();
        }
    }
    });

}


function logout(){
    if(IS_LOGGEDIN){
        $.ajax({
        url: BASE_URL + 'logout',
        type: 'GET',
        data: {},
        success: function(response){
            IS_LOGGEDIN=false;
            changeStatus();
            viewPage("options");
        }
        });
    }
}

function fitContent(){  
    var h = parseInt($("#traffix-nav").height());  
    $("#traffix-content").height(window.innerHeight - h - 1); 

    var x = ($("#loading").width()/2) - ($("#loading img").width()/2);
}

function closeModal(e){
   $(e).trigger("close");
}

function initConfig(){
    $.ajax({
        url: BASE_URL + 'getConfig',
        type: 'POST',
        data: {}, 
        success: function(response){
            for(var i=0; i<response.length; i++) {
                if(response[i].element=="report")
                    REPORTS_CONFIG=response[i];
                else if(response[i].element=="route")
                    ROUTES_CONFIG=response[i];
                else if(response[i].element=="intensity")
                    TRAFFIC_CONFIG=response[i];
            }
        }
    });
}

function createHiddenDom(id, value){
    return "<input type='hidden' id='" + id + "' value='" + value + "' />";
}