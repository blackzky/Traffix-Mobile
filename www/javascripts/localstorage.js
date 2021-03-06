//-------------------------Localstorage-------------------------//

if(hasStorage()){
    function removeHtmlStorage(name) {
        localStorage.removeItem(name);
        localStorage.removeItem(name+'_time');
    }

    function setHtmlStorage(name, value, expires) {

        if (expires==undefined || expires=='null') { var expires = 3600; } // default: 1h

        var date = new Date();
        var schedule = Math.round((date.setSeconds(date.getSeconds()+expires))/1000);

        localStorage.setItem(name, value);
        localStorage.setItem(name+'_time', schedule);
    }

    function statusHtmlStorage(name) {
        var date = new Date();
        var current = Math.round(+date/1000);

        var stored_time = localStorage.getItem(name+'_time');
        if (stored_time==undefined || stored_time=='null') { var stored_time = 0; }

        if (stored_time < current) {
            removeHtmlStorage(name);
            return 0;
        } else {
            return 1;
        }
    }
}else{
   alert("Sorry! Web storage is not supported..");
}


//----------sample usage (to be deleted)----------//
/*// Status
var cache_status = statusHtmlStorage('cache_name');

// Has Data
if (cache_status == 1) {

    // Get Cache
    var data = localStorage.getItem('cache_name');
    alert(data);

// Expired or Empty Cache
} else {

    // Get Data
    var data = 'Pay in cash :)';
    alert(data);

    // Set Cache (30 seconds)
    if (cache) { setHtmlStorage('cache_name', data, 30); }

}
*/