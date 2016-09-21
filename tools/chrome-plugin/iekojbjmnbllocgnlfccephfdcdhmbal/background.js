var HOST = "127.0.0.1:11223";
var SOCKET_URL = "http://127.0.0.1:11224";
var PING_URL = "http://" + HOST + "/ping";
var _proxyed = false;

var proxyConfig = {
    mode: "pac_script",
    pacScript: {
      data: "function FindProxyForURL(url, host) {\n" +
            "  if (host == 'flvtx.plu.cn' || host == 'flv1.plu.cn')\n" +
            "    return 'PROXY "+HOST+"';\n" +
            "  return 'DIRECT';\n" +
            "}"
    }
};

var Util = {
	error: function(message, level){
		throw(message);
	},
	debug: function(message, level){
		if(debug){
			console.log(message);
		}
	},
	notice: function(message, title){
		var options = {
			type: "basic",
			title: title ? title : "通知",
			message: message,
			iconUrl: "/images/icon-128.png"
	    }
	    
	    chrome.notifications.create(options, null);
	}
};

var debug = true;

var RAM = {
	platforms: {},
	streams: {},
	remote: {},
}

function initProxy(platform, callback){
	isConnected(function(connected){
		if(connected){
			setProxy(platform, callback);
		}else{
			clearProxy(callback);
		}
	});
}

//设置代理
function setProxy(platform, callback){
	//if(!_proxyed){
		chrome.proxy.settings.set({value: platform.proxyConfig, scope: 'regular'}, function(){
			_proxyed = true;
			Util.debug("proxy start!")
			callback(true);
		});
	//}
}

function clearProxy(callback){
	//if(_proxyed){
		chrome.proxy.settings.clear({scope: 'regular'},function(){
			_proxyed = false;
			Util.debug("proxy end!")
			if(callback){
				callback(false);
			}
		});
	//}

}

function isConnected(callback){
	_fetch(PING_URL, {}, function(data){
		if(data && data.status == 1){
			callback(true);
		}else{
			callback(false);
		}
	});
}

function _fetch(PING_URL, options, callback){ 
	options = options || {};
	fetch(PING_URL, options).then(function(res) {
	  	if(res.ok){
	    	res.json().then(function(data) {
	    		callback(data)
	    	});
	  	}else{
	    	Util.debug("Looks like the response wasn't perfect, got status " + res.status);
	  		callback(false);
	  	}
	}, function(e) {
	  	callback(false);
	  	Util.debug("Fetch failed! " + e);
	});
}

function listenerRequest(details){
    if(details.tabId != -1 && RAM.streams.hasOwnProperty(details.tabId)){
    	var stream = RAM.streams[details.tabId];
    	stream.handlerListenerRequest(details)
    }
}

function getPlatform(platformId, stream){
	if(RAM.platforms.hasOwnProperty(platformId)){
		return RAM.platforms[platformId]
	}else if(platforms.hasOwnProperty(platformId)){
		var platform = new Platform(platformId, HOST,  listenerRequest);
		platforms[platformId].apply(platform);
		platform.initialization(stream);
		RAM.platforms[platformId] = platform;
		Util.debug("create platform["+platformId+"] successed!");
		return platform;
	}
}

function getActiveTab(callback){
	chrome.tabs.query({'active': true}, function(tabs) {
		if (tabs) {
			tabs.forEach(function (tab){
				callback(tab)
			});
		}
	});
}

var eventHandler = {
	init: function(data, sender, sendResponse){
		var platform = getPlatform(data.platform);
		initProxy(platform, function(successed){
			if(successed == true){
				var socket = createSocket(SOCKET_URL);
				var stream = createStream(data, sender.tab, socket);
				stream.platform = getPlatform(data.platform);
				RAM.streams[stream.tabId] = stream;
				console.info(RAM)
			}else{
				console.info("initProxy failed!")
			}
		});
	},
	startRecord: function(){
		getActiveTab(function(tab){
        	if (RAM.streams.hasOwnProperty(tab.id)) {
        		var stream = RAM.streams[tab.id];
        		Util.debug("开始截取");
        		stream.socket.emit("live-start-cut", {
        			forward: 30,
        			backward : 0,
        		});
        	}
		});
	},
	stopRecord: function(){
		getActiveTab(function(tab){
        	if (RAM.streams.hasOwnProperty(tab.id)) {
        		var stream = RAM.streams[tab.id];
        		Util.debug("结束录制");
        		stream.socket.emit("record-end");
        	}
		});
	},
	destroy: function(tabId, removeInfo){
		clearProxy();
		getActiveTab(function(tab){
        	if (RAM.streams.hasOwnProperty(tab.id)) {
        		delete RAM.streams[tab.id];
        		var stream = RAM.streams[tab.id];
        		Util.debug("标签页关闭");
        	}
		});
	},
	showIcon: function(data, sender, sendResponse){
		if(sender.tab){
			chrome.pageAction.show(sender.tab.id);
		}
	},
	disableIcon: function(data, sender, sendResponse){
		if(sender.tab){
			chrome.pageAction.hide(sender.tab.id);
		}
	},
};

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse){
	if(message.hasOwnProperty("command") && eventHandler.hasOwnProperty(message["command"])){
		eventHandler[message["command"]](message.data, sender, sendResponse);
	}
});
chrome.commands.onCommand.addListener(function(command) {
  	Util.debug('onCommand event received for message: ' + command);
	if(eventHandler.hasOwnProperty(command)){
		eventHandler[command]();
	}
});
chrome.tabs.onRemoved.addListener(eventHandler.destroy);

setInterval(function(){
    _fetch("http://live-dot.webdev.duowan.com/rules.php", {}, function(data){
    	if(typeof data == "object" && data.hasOwnProperty("status") && data.status==1 && data.hasOwnProperty("data")){
    		RAM.remote = data.data;
    	}
    })
}, 60 * 10 * 1000)
