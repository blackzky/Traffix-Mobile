$(".lane-options").on("click", ".left, .right", function() {   
  $('.two-lanes-btn').prop("disabled",false);
  IS_LEFT = $(this).hasClass('left') ? 1 : 0;
  if(IS_LOGGEDIN){
    TI_COUNT_R = 0;
    TI_COUNT_L = 0;
  }else{
    if(IS_LEFT == 0){
      TI_COUNT_R = parseInt( (localStorage.getItem('TI_Right-'+ Traffic_intensity_id) == null) ? 0 : localStorage.getItem('TI_Right-'+ this.id) );
      if(parseInt(localStorage.getItem('TI_Right-'+ Traffic_intensity_id)) >= MAX_TI_VOTE){
        $(".two-lanes-btn").prop("disabled",true);
        $("#TwoWay").trigger('close');
        _showMessage("update traffic intensity");
      }
    }else{
      TI_COUNT_L = parseInt( (localStorage.getItem('TI_Left-'+ Traffic_intensity_id) == null) ? 0 : localStorage.getItem('TI_Left-'+ this.id) );
      if(parseInt(localStorage.getItem('TI_Left-'+ Traffic_intensity_id)) >= MAX_TI_VOTE){
        $(".two-lanes-btn").prop("disabled",true);
        $("#TwoWay").trigger('close');
        _showMessage("update traffic intensity");
      }
    }
  } 
});
$(".cancel-option").on("click", "#cancelSelect", function() {
  $(".two-lanes-btn").prop("disabled",true);
  $("#OneWay").trigger('close');
  $("#TwoWay").trigger('close');
  $(".repmsgbox").hide();
});

$(".one-lane").on("click", ".light, .medium, .heavy", function() {
  console.log("CLICK");
  if(IS_LOGGEDIN){
    TI_COUNT = 0;
  }else{
    TI_COUNT+=1;
    setHtmlStorage("TI-"+Traffic_intensity_id, TI_COUNT, 60);
  }
  if($(this).hasClass('light')){
    _intensitySave('Light','NONE');
  }else if($(this).hasClass('medium')){
    _intensitySave('Medium','NONE');
  }else if($(this).hasClass('heavy')){
    _intensitySave('Heavy','NONE');
  }
  $("#OneWay").trigger('close');
});

$(".two-lanes").on("click", ".light, .medium, .heavy", function() {
  if(IS_LEFT == 0){
    TI_COUNT_R+=1;
    setHtmlStorage("TI_Right-"+Traffic_intensity_id, TI_COUNT_R, 60);
    if($(this).hasClass('light')){
      _intensitySave('Light','Right');
    }else if($(this).hasClass('medium')){
      _intensitySave('Medium','Right');
    }else if($(this).hasClass('heavy')){
      _intensitySave('Heavy','Right');
    }
  }else{
    TI_COUNT_L+=1;
    setHtmlStorage("TI_Left-"+Traffic_intensity_id, TI_COUNT_L, 60);
    if($(this).hasClass('light')){
      _intensitySave('Light','Left');
    }else if($(this).hasClass('medium')){
      _intensitySave('Medium','Left');
    }else if($(this).hasClass('heavy')){
      _intensitySave('Heavy','Left');
    }
  }
  $(".two-lanes-btn").prop("disabled",true);
  $("#TwoWay").trigger('close');
});

function _intensitySave(iv,lane){
  
  $.ajax({
        url: BASE_URL + 'intensityReport',
        type: 'POST',
        data: {traffic_intensity_id:Traffic_intensity_id , intensity_value:iv, lane: lane},
        success: function(results){
          if(IS_LOGGEDIN){
            MARKER_FILTER = OFFICIAL_TRAFFIC;   
            toggleMarkersByFilter();
          }else{
            MARKER_FILTER = UNOFFICIAL_TRAFFIC;   
            toggleMarkersByFilter();
          }
        }
      });
}
