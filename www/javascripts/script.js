BASE_URL = window.location.origin + "/";

USE_REMOTE = true; /* Modify this before deployment. Value depends on device type. */
IMG_BASE = USE_REMOTE ? "img/" : "../img/";

//LIVE_URL = "http://cbtafcc.herokuapp.com/"; /*Modify this later to the production url */
LIVE_URL = "http://10.10.33.64:3000/"; /*Modify this later to the production url */

IS_LOGGEDIN=false;

$(function() {
    var origin = (window.location.port == "" ? (window.location.origin + ":3000") : window.location.origin) + "/";
    //BASE_URL = isMobile() ? LIVE_URL : origin;
    BASE_URL = LIVE_URL;

    $("nav#menu").mmenu({   position: "right",  zposition: "back"   });
    

    $("#traffix-nav").on("click", "#menu-bars", function(){ 
        $("#loading").hide();
    });
    
    $(".page-links").on("click", "a", function(e){ 
        e.preventDefault(); 
        viewPage(null, this);   
    });
    viewPage("map");

    $(window).resize(fitContent);
    fitContent();
    checkStats();
});

window.isMobile = function(){
    return (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase()));
}

function viewPage(page, dom){
    $("#loading").show();
    page = page || $(dom).data('page');
    if(page){
        page = page.toLowerCase();
    }else{
        return;
    }
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
        }
        });
    }
}

function fitContent(){  
    var h = parseInt($("#traffix-nav").height());  
    $("#traffix-content").height(window.innerHeight - h - 1); 

    var x = ($("#loading").width()/2) - ($("#loading img").width()/2);
    $("#loading img").css({
        "position": "fixed",
        "left": x + "px"
    });
    $("#loading").css({
        "background":"white",
        "height": $("#traffix-content").height() + "px",
        "display": "none"
    });  
}
