function createStream(data, tab, socket){
    return new Stream(data, tab, socket);
};

function Stream(data, tab, socket){
    var self = this;
    self.id = "";
    self.tab = tab;
    self.tabId = tab.id;
    self.status = 0;
    self.socket = socket;
    self.platform = null;

    self.init = function(){
        self.socket.emit("init-thread", {id: self.tabId, url: self.tab.url, title:self.tab.title}, function(id){
            self.id = id;
        });
    }

    self.handlerListenerRequest = function(details){
        if(details.tabId != -1){
            var message = {id: self.id,  streamUrl: details.url};
            self.socket.emit("init-stream", message);
        }
    }

    self.init();
}
