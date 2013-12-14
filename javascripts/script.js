
BASE_URL = "http://traffix.local:3000/";

$(function() {
    $("nav#menu").mmenu({   position: "right",  zposition: "back"   });
    
    $(".page-links").on("click", "a", function(e){  e.preventDefault(); viewPage(null, this);   });

    viewPage("map");

    $(window).resize(fitContent);
    fitContent();
});


function viewPage(page, dom){   
    page = page || $(dom).data('page'); 
    page = page.toLowerCase();
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

function fitContent(){  var h = parseInt($("#traffix-nav").height());  $("#traffix-content").height(window.innerHeight - h - 1);   }
