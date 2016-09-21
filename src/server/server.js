var http = require('http');
var proxy = require("./public/httpProxy");
var logger = require("./utils/log");
var handler = require("./public/handler");
var route = require("./public/route");

var proxy_port = process.env.APP_PROXY_PORT ? process.env.APP_PROXY_PORT : 11223;
var socket_port = process.env.APP_SOCKET_PORT ? process.env.APP_SOCKET_PORT : 11224;
var io = require("socket.io")(); 

var server = require('http').createServer(function(req, res) {
    var local = '127.0.0.1:'+proxy_port;
    var host = req.headers.host, ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    switch(host){
        case local:
            route.runAction(req, res);
        break;
        default:
            proxy.web(req, res, { 
                target: 'http://' + host 
            });
  }
});

proxy.on('proxyRes', handler.filterHandler);


io.on('connection', function(socket){
    socket.on("init-thread", handler.initThread);
    socket.on("close-record", handler.closeRecord);
    socket.on("cut-record", handler.cutRecord);
    //socket.on("upload-video", handler.uploadVideo);
    socket.on("remove-thread", handler.removeThread);
    socket.on("delete-thread", handler.deleteThread);
    socket.on("init-stream", handler.initStream);
    socket.on("update-file-save-path", handler.setSavePath);

    socket.on("add-listener", handler.addListener);
    socket.on('disconnect', handler.removeListener);
});



module.exports.run = function(){
    logger.debug(proxy_port)
    server.listen(proxy_port);
    logger.debug("http server listening on port " + proxy_port);
    io.listen(socket_port);
    logger.debug("socket server listening on port " + socket_port);
};

module.exports.stop = function(callback){
    handler.stop();
    if(Object.keys(handler.threads).length == 0){
        if(callback) callback(true);
    }else{
        for(index in handler.threads){
            var thread = handler.threads[index];
            thread.emit("close", function(currThread){
                logger.debug("delete " + currThread.getId())
                delete handler.threads[currThread.getId()];
                if(Object.keys(handler.threads).length == 0){
                    logger.debug("http server close listen on port " + proxy_port);
                    logger.debug("socket server close listen on port " + socket_port);
                    if(callback) callback(true)
                }
            })
        }
    }
    
};

