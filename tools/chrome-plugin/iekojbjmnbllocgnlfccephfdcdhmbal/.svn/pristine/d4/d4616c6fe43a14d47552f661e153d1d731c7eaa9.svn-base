document.addEventListener('DOMContentLoaded', function() {
    $("#capture_live").on("click", function() {
        chrome.runtime.sendMessage({command: 'capture', data: {}});
    });
    $("#capture_video").on("click", function() {
        chrome.runtime.sendMessage({command: 'captureVideo', data: {"platform": "video", "open":true}});
    });
    $("#backend_manager").on("click", function() {
        chrome.tabs.create({url: this.href}, function (tab) {});
    });

    autoCaptureSetting();
    backendOpenSetting();
    forwardSetting();
    backwardSetting(); 
});

function autoCaptureSetting(){
    var dom = document.getElementById("options-auto-capture");
    dom.onchange = function() {
        chrome.storage.local.set({'options_auto_capture': this.checked});
    };
    chrome.storage.local.get({'options_auto_capture': true}, function(storage){
        dom.checked = storage.options_auto_capture;
    });
}

function backendOpenSetting(){
    var dom = document.getElementById("options-backend-open");
    dom.onchange = function() {
        chrome.storage.local.set({'options_backend_open': this.checked});
    };
    chrome.storage.local.get({'options_backend_open': false}, function(storage){
        dom.checked = storage.options_backend_open;
    });
}

function forwardSetting(){
    var dom = document.getElementById("options-forward");
    dom.onchange = function() {
        chrome.storage.local.set({'options_forward': this.value});
    };
    chrome.storage.local.get({'options_forward': 30}, function(storage){
        var value = storage.options_forward;
        if(value < 0){
            alert("不能小于0");
            return
        }else if(value > 180){
            alert("不能大于180");
            return
        }
        dom.value = value;
    });
}
function backwardSetting(){
    var dom = document.getElementById("options-backward");
    dom.onchange = function() {
        chrome.storage.local.set({'options_backward': this.value});
    };
    chrome.storage.local.get({'options_backward': 30}, function(storage){
        var value = storage.options_backward;
        if(value < 0){
            alert("不能小于0");
            return
        }else if(value > 180){
            alert("不能大于180");
            return
        }
        dom.value = value;
    });
}

