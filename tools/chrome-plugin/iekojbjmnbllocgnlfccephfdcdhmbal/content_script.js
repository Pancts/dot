var domains = {
    "twitch": {
        "match": /.*\.twitch\.tv.*/,
    },
    "huya": {
        "match": /.*\.huya\.com.*/,
    },
    "douyutv": {
        "match": /.*\.douyu\.com.*/,
    },
    "longzhu": {
        "match": /.*\.longzhu\.com.*/,
    },
    "pandatv": {
        "match": /.*\.panda\.tv.*/,
    },
    "zhanqitv": {
        "match": /.*\.zhanqi\.tv.*/,
    }
}

chrome.runtime.sendMessage({command: 'showIcon', data: {}});

var config = null;
var url = window.location.href;
for (var platform in domains) {
    if(url.match(domains[platform].match)){
        config = domains[platform];
        chrome.runtime.sendMessage({command: 'init', data: {
            platform: platform, 
            config: config
        }});
        break;
    }
}

function getRequest(url) {   
   var theRequest = new Object();   
   if (url.indexOf("?") != -1) {   
      var str = url.substr(1);   
      strs = str.split("&");   
      for(var i = 0; i < strs.length; i ++) {   
         theRequest[strs[i].split("=")[0]]=unescape(strs[i].split("=")[1]);   
      }   
   }   
   return theRequest;   
}   
