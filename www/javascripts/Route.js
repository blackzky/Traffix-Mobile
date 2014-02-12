var Route = {
    MARKERS: [],
    SEGMENTS: [],
    ALPHAS: 'abcdefghijklmnopqrstuvwxyz'.split(''),
    ALPHA_IDX: 0,
    MAP: null, 
    SERVICE: null,
    POLY: null, 
    SUGGEST_ROUTE_LISTENER: null,
    NODE_LIMIT: 10,
    SUGGEST_GUIDE : "Click on map to place markers, drag markers to change route",
    OUT_BOUNDS_GUIDE: "Cannot place/drag marker there. Place/drag the marker inside the RED area.",
    GUIDE_TIMER: null,

    init: function(map, suggest_mode){
        Route.MARKERS = [];
        Route.SEGMENTS = [];
        Route.ALPHA_IDX = 0;
        Route.MAP = map;
        Route.SERVICE = new google.maps.DirectionsService();
        Route.POLY = new google.maps.Polyline({
            map: map,
            strokeColor: '#de5842',
            strokeOpacity: 0.6,
            strokeWeight: 5
        });
        
        if(suggest_mode){
            hidePoi();
            Route.MAP.setOptions({draggableCursor: "crosshair"});
            Route.MARKERS = [];
            google.maps.event.removeListener(Route.SUGGEST_ROUTE_LISTENER);
            Route.SUGGEST_ROUTE_LISTENER = google.maps.event.addListener(Route.MAP, "click", Route._suggestClickHandler);
        }
    },

    resetMarkers: function(){
        for (i in Route.MARKERS) {
            Route.MARKERS[i].setMap(null);
        }
        Route.ALPHA_IDX = 0;
        Route.SEGMENTS = [];
        Route.MARKERS = [];
        if(Route.POLY != null) Route.POLY.setPath([]);
    },

    _createMarkers: function(nodes){
        var pos = null,
            c = null;
            options = null,
            marker = null;

        Route.MARKERS = [];
        var _icon = "";
        var _count = 0;
        var _len = size(nodes) - 1;
        for(i in nodes){
            pos = new google.maps.LatLng(nodes[i].lat, nodes[i].lng);
            _icon = IMG_BASE + (_count == 0 ? 'st.png' : (_count == _len ? 'en.png' : 'empty.png') );
            
            options = { 
                map: Route.MAP,
                position: pos,
                draggable: false,
                icon: _icon
            };
            marker = new google.maps.Marker(options);
            marker.segmentIndex = Route.MARKERS.length - 1;
            google.maps.event.addListener(marker, 'dragend', Route._updateSegments);
        
            Route.MARKERS.push(marker);

            if (Route.MARKERS.length > 1) {
                Route._addSegment(Route.MARKERS[Route.MARKERS.length - 2].getPosition(), pos, marker.segmentIndex);
            }

            _count++;
        }
    },

    _addSegment: function(start, end, segIdx) {
        Route.SERVICE.route(
            {
                origin: start,
                destination: end,
                travelMode: google.maps.DirectionsTravelMode.DRIVING
            },
            function (result, status) {
                if (status == google.maps.DirectionsStatus.OK) {
                    //store the entire result, as we may at some time want
                    //other data from it, such as the actual directions
                    Route.SEGMENTS[segIdx] = result;
                    Route.POLY.setPath(Route._getSegmentsPath());
                }
            }
        );
    },
    _getSegmentsPath: function() {
        var a, i,
            len = Route.SEGMENTS.length,
            arr = [];
        for (i = 0; i < len; i++) {
            a = Route.SEGMENTS[i];
            if (a && a.routes) {
                arr = arr.concat(a.routes[0].overview_path);
            }
        }
        return arr;
    },

    _updateSegments: function() {       
        var start, end, inserts, i,
            idx = this.segmentIndex,
            segLen = Route.SEGMENTS.length, //segLen will always be 1 shorter than markers.length
            myPos = this.getPosition();
        if (segLen === 0) { //nothing to do, this is the only marker
            return;
        }
        if (idx == -1) { //this is the first marker
            start = [myPos];
            end = [Route.MARKERS[1].getPosition()];
            inserts = [0];
        } else if (idx == segLen - 1) { //this is the last marker
            start = [Route.MARKERS[Route.MARKERS.length - 2].getPosition()];
            end = [myPos];
            inserts = [idx];
        } else {//there are markers both behind and ahead of this one in the 'markers' array
            start = [Route.MARKERS[idx].getPosition(), myPos];
            end = [myPos, Route.MARKERS[idx + 2].getPosition()];
            inserts = [idx, idx + 1];
        }
        for (i = 0; i < start.length; i++) {
            Route._addSegment(start[i], end[i], inserts[i]);
        }
    },

    _latLngInBounds: function(lat, lng){
        var slat  = MapHandler.startBounds.lat();
        var slng  = MapHandler.startBounds.lng();

        var elat  = MapHandler.endBounds.lat();
        var elng  = MapHandler.endBounds.lng();

        if(lat < slat && lng > slng && lat > elat && lng < elng){
            return true;
        }else{
            return false;
        }
    },

    _showGuide: function(msg, showBounds, time){
        $(".msgbox").html("<p style='margin: 0 !important;'> " + msg + "</p>").show();
        if(showBounds && !MapHandler._boundsShown) MapHandler.showBounds();
        Route.GUIDE_TIMER = setTimeout(function(){
            if(showBounds && MapHandler._boundsShown){
                MapHandler.hideBounds();
                $(".msgbox").html("<p style='margin: 0 !important;'> " + Route.SUGGEST_GUIDE + "</p>").show();
            }else{
                $(".msgbox").hide();
            }
        }, time || 2000);
    },

    _suggestClickHandler: function (e) {
        if(Route.ALPHA_IDX >= Route.NODE_LIMIT) { 
            Route._showGuide("<span style='color:black'>You are only allowed to add " + Route.NODE_LIMIT + " nodes</span>", false, 5000);
            return; 
        }else if(!Route._latLngInBounds(e.latLng.lat(), e.latLng.lng())){
            Route._showGuide(Route.OUT_BOUNDS_GUIDE, true);
            return;
        }

        var evtPos = e.latLng,
            c = Route.ALPHAS[Route.ALPHA_IDX++],
            marker = new google.maps.Marker({
                map: Route.MAP,
                position: evtPos,
                draggable: true,
                icon: IMG_BASE + c + '.png' 
            });
        marker.segmentIndex = Route.MARKERS.length - 1;
        marker.iconChar = c;
        
        google.maps.event.addListener(marker, 'drag', function(event){
            var keys = Object.keys(marker.position);

            var slat  = MapHandler.startBounds.lat();
            var slng  = MapHandler.startBounds.lng();
            var elat  = MapHandler.endBounds.lat();
            var elng  = MapHandler.endBounds.lng();

            var lat = marker.position.lat();
            var lng = marker.position.lng();

            var rlat = event.latLng.lat(),
                rlng = event.latLng.lng();

            if(!Route._latLngInBounds(lat, lng)){
                if(lat >= slat){ rlat = slat;    }
                if(lat <= elat){ rlat = elat;    }

                if(lng <= slng){ rlng = slng;    }
                if(lng >= elng){ rlng = elng;    }

                Route._showGuide(Route.OUT_BOUNDS_GUIDE, true);
                MapHandler.MAP.setCenter(marker.position);
            }

            marker.setPosition(new google.maps.LatLng(rlat, rlng));
        });
        
        google.maps.event.addListener(marker, 'dragend', Route._updateSegments);
        
        Route.MARKERS.push(marker);

        if (Route.MARKERS.length > 1) {
            Route._addSegment(Route.MARKERS[Route.MARKERS.length - 2].getPosition(), evtPos, marker.segmentIndex);
        }

    },

    getNodesStr: function(){
        var nodes = "{";
        var keys;
        for(i in Route.MARKERS){
            keys = Object.keys(Route.MARKERS[i].position)
            nodes += "\"node" + i + "\": {\"lat\": " + Route.MARKERS[i].position[keys[0]] + ", ";
            nodes += "\"lng\": " + Route.MARKERS[i].position[keys[1]] + "}";
            if(i < Route.MARKERS.length - 1) nodes += ", ";
        }
        nodes += "}";
        return nodes;
    },

    loadRoute: function(nodes){
        Route._createMarkers(nodes);
        MapHandler.MAP.setCenter(nodes[Object.keys(nodes)[0]]);
        MapHandler.MAP.setZoom(15);
    },

    createList: function(routes){
        var content = "";
        var _link_class = "alternative-route";
        var _now = new Date();
        var ca, ea;
        for(var i in routes) {
            content += "<div id='route-item-" + routes[i].id + "' class='" + (routes[i].is_Official == 1 ? 'official' : 'unofficial') + "-routes list-group-item route-item' \
            style='overflow: auto;' > \
            <a href='#' class='" + _link_class + "' data-id='" + routes[i].id + "'>" + htmlEntities(routes[i].title);

            content += "<span style='float:right;'" + (routes[i].is_Official == 1 ? "class='badge verified'>Official": "class='badge'>Unofficial")+ "</span>";

            ca =  Route._createDate(routes[i].created_at);
            ea =  Route._createDate(routes[i].expire_at);

            tea = Route.timeDifference(_now, ea);
            exp_at = (tea == "") ? "Expires in less than a minute" : "Expires after " + tea;
            content += "<br /> \
                        <span class='route-ca' style='color: gray'>Created " + Route.timeDifference(_now, ca) + "</span>\
                        <span class='route-ea' style='float:right; color: gray'>" + exp_at + "</span></a>";

            content += "\
            <input type='hidden' value='" + routes[i].created_at + "' class='route-created_at' /> \
            <input type='hidden' value='" + routes[i].expire_at + "' class='route-expire_at' /> \
            <input type='hidden' value='" + htmlEntities(routes[i].title) + "' id='route-"+routes[i].id+"-title' />\
            <input type='hidden' value='" + htmlEntities(routes[i].start) + "' id='route-"+routes[i].id+"-start' />\
            <input type='hidden' value='" + htmlEntities(routes[i].end) + "' id='route-"+routes[i].id+"-end' />\
            <input type='hidden' value='" + routes[i].nodes + "' id='route-"+routes[i].id+"-nodes' /> \
            <input type='hidden' value='" + routes[i].is_Official + "' id='route-" + routes[i].id + "-is_Official' /></div>";
        }
        return content;
    },

    _createDate: function(date){
        try{
            var d =  new Date(date);
            if(d.getTime() === d.getTime()){
                d.setMonth(d.getMonth() + 1);
                return d;
            }else{
                throw(err);
            }
            
        }catch(err){
            d = date.split("-");
            d[1] = parseInt(d[1]) + 1;
            return (new Date(d.join("-")));
        }
    },

    timeDifference: function(current, previous) {
        var msPerMinute = 60 * 1000;
        var msPerHour = msPerMinute * 60;
        var msPerDay = msPerHour * 24;
        var msPerMonth = msPerDay * 30;
        var msPerYear = msPerDay * 365;
        
        var elapsed = current - previous;
        
        if(elapsed >= 0){
            if (elapsed < msPerMinute){     
                return (elapsed < 2000 ? "just now" : Math.round(elapsed/1000) + ' seconds ago');   
            }
            else if (elapsed < msPerHour){  return Math.round(elapsed/msPerMinute) + ' minutes ago';   }
            else if (elapsed < msPerDay ){  return Math.round(elapsed/msPerHour ) + ' hours ago';   }
            else if (elapsed < msPerMonth){ return 'approximately ' + Math.round(elapsed/msPerDay) + ' days ago';   }
            else if (elapsed < msPerYear) { return 'approximately ' + Math.round(elapsed/msPerMonth) + ' months ago';   }
            else {return 'approximately ' + Math.round(elapsed/msPerYear ) + ' years ago';   }
        }else{
            now = current;
            y2k = previous;
            days = (y2k - now) / 1000 / 60 / 60 / 24;
            daysRound = Math.floor(days);
            hours = (y2k - now) / 1000 / 60 / 60 - (24 * daysRound);
            hoursRound = Math.floor(hours);
            minutes = (y2k - now) / 1000 /60 - (24 * 60 * daysRound) - (60 * hoursRound);
            minutesRound = Math.floor(minutes);
            seconds = (y2k - now) / 1000 - (24 * 60 * 60 * daysRound) - (60 * 60 * hoursRound) - (60 * minutesRound);
            secondsRound = Math.round(seconds);
            min = (minutesRound == 1) ? " minute" : " minutes.";
            hr = (hoursRound == 1) ? " hour" : " hours";
            dy = (daysRound == 1)  ? " day" : " days";

            return (daysRound == 0 ? "" : daysRound + dy) + 
            (hoursRound == 0 ? "" : ( (daysRound == 0 ? "" : ", ") + hoursRound + hr) ) + 
            (minutesRound == 0 ? "" :( (hoursRound == 0 ? "" : ", ") + minutesRound + min) );
        }
        
    }

};

function size(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};