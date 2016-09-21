var fs = require('fs');
var path = require('path');
var request = require('request');
var fetch = require('node-fetch');
var util = require("../utils/util");
var logger = require("../utils/log");
var Stream = require("./stream");
var Thread = require("./thread");
var Live = require('../models/live');
var Video = require('../models/video');
var Setting = require('../models/setting');
var config = require('../config');


var saveDir = "";
var file_save_path_key = "file-save-path";

var actived = true;
var threads = {};
var streams = {};
var listeners = {}; 
var noticeInterval = 1000;
var noticeTime = new Date().getTime();

function getSavePath(callback){
    var filePath = "";
    Setting.get(file_save_path_key, function(value){
        if(value) filePath = value;
        if(!filePath) filePath = path.join(util.getHomePath(), "Data");
        if(callback) callback(path.normalize(filePath));
    });
}

function liveHandler(proxyRes, req, res, options){
    logger.debug("proxy " + req.url);
    var md5 = util.md5(req.url);
    var time = new Date().getTime();
    var referer = req.headers.referer || "";
    var stream;
    logger.debug("Fount stream: ", md5)
    if(streams.hasOwnProperty(md5)){
        stream = streams[md5];
        delete streams[md5];
    }else{
        return logger.debug("not fount stream :" + req.url)
    }
    if(!proxyRes.headers.hasOwnProperty("content-type") || (proxyRes.headers["content-type"].indexOf("video") == -1 && proxyRes.headers["content-type"].indexOf("Flash") == -1)){
        logger.debug("type error: content-type= " + proxyRes.headers["content-type"]);
        stream.thread.emit("remove-stream", stream);
        return false;
    }
    stream.init();
    proxyRes.on('data',function(chunk){
        try{
            if(stream){
                stream.recording(chunk);
            }else if(streams.hasOwnProperty(md5)){
                stream = streams[md5];
                stream.init();
            }
        }catch(e){
            logger.debug(e);
        }

    });

    res.on("close", function(){
        if(stream){
            stream.emit("end");
            stream.close();
        }
    });
}


module.exports.filterHandler = function(proxyRes, req, res, options){
    liveHandler(proxyRes, req, res, options);
}

module.exports.initThread = function(data, callback){
    if(!module.exports.isActived()) return logger.debug("服务正在退出!")
    var time = new Date().getTime();
    var id = util.md5(data.id + data.url);
    if(!threads.hasOwnProperty(id)){
        var socket = this;
        var options = {
            id: id,
            tabId: data.id,
            url: data.url,
            title: data.title,
        };
        threads[id] = new Thread(socket, options);
        getSavePath(function(p){
            threads[id].setFileDir(path.join(p, "ffmpeg"));
            threads[id].setTempDir(path.join(p, "live"));
        })
        logger.debug("create thread ID: " + id);
        logger.debug("url: " + data.url);
    }else{
        threads[id].emit("restart");
    }
    callback(id);
}

module.exports.initStream = function(data){
    if(!module.exports.isActived()) return logger.debug("服务正在退出!")
    logger.debug("listener " + data.streamUrl)
    var id = data.id;
    if(threads.hasOwnProperty(id)){
        var thread = threads[id];
        var md5 = util.md5(data.streamUrl);
        var time = new Date().getTime();
        var id = util.md5(data.id + data.url + time);
        var socket = this;
        var options = {
            id: id,
            title: thread.getTitle(),
            thread: thread,
            streamUrlMd5: md5,
            streamUrl: data.streamUrl,
        };
        var stream = new Stream(socket, thread, options);
        streams[md5] = stream;
        logger.debug("Append stream: ", md5)
        //thread.appendStream(stream);
    }else{
        logger.debug("not fount thread ID: " + id);
    }
}

module.exports.getActiveList = function (){
    var list = [];
    for(index in threads){
        var thread = threads[index];
        if(thread.isInit()){
            list.push(thread.getData());
        }else if(thread.isExpire()){
            delete threads[index];
        }
    }
    return list.reverse();
}

module.exports.closeRecord = function (options){
    var id = options.id;
    if(threads.hasOwnProperty(id)){
        threads[id].emit("end");
    }
}

module.exports.startRecord = function (options){
    var id = options.id;
    if(threads.hasOwnProperty(id)){
    }
}

module.exports.cutRecord = function (options){
    var id = options.id;
    if(threads.hasOwnProperty(id)){
        threads[id].cutCurrentStream(options.options);
        //threads[id].notice("live-start-cut", options.options);
    }
}

module.exports.cutAndUpload = function(options, callback){
    getThread(options.live_id, function(thread){
    logger.debug("=======================")
    logger.debug(options)
        if(thread){
            if(options.is_cut == 1){
                thread.cut(options.file, options.start, options.end-options.start, function(err, video_id){
                    if(err){
                        callback({code: -1, message: "截取失败"});
                    }else{
                        uploadFile(video_id, thread, options, function(message){
                            callback({code: 1, message: message});
                        })
                    }
                })
            }else{
                logger.debug(options)
                uploadFile(options.video_id, thread, options, function(message){
                     callback({code: 1, message: message});
                })
            }
        }else{
            callback({code: -1, message: "记者录不存在"});
        }
        module.exports.notice("active-list", module.exports.getActiveList(), true);
    })
}

/*module.exports.uploadVideo = function(options, callback){
    var id = options.id;
    var file_id = options.file_id;
    var udb = options.udb;
    var thread = null;
    getThread(id, function(thread){
        if(thread){
            uploadFile(file_id, thread, {udb:udb}, function(message){
                callback(message)
            });
            module.exports.notice("active-list", module.exports.getActiveList(), true);
        }else{
            callback("记者录不存在");
        }
    })
}*/


module.exports.removeThread = function (id){
    if(threads.hasOwnProperty(id)){
        threads[id].emit("end", function(){
            delete threads[id];
            logger.debug("remove id = " + id);
        });
    }
}

module.exports.deleteThread = function (id){
    delete threads[id];
    Live.deleteById(id)
    logger.debug("delete id = " + id);
}

module.exports.addListener = function(){
    logger.debug("add-listener" + this.id);
    listeners[this.id] = this;
}

module.exports.removeListener = function(){
    logger.debug("remove-listener" + this.id);
    delete listeners[this.id];
}

module.exports.setSavePath = function(p){
    Setting.set(file_save_path_key, path.normalize(p))
}

module.exports.setUpdateSetting = function(options){
    Setting.set(options.key, options.value)
}

module.exports.notice = function (event, message, force){
    var time = new Date().getTime();
    if(!force && (time - noticeTime < noticeInterval)){
        return false;
    }
    noticeTime = time;
    for(index in listeners){
        var socket = listeners[index];
        socket.emit(event, message);
    }
}

module.exports.threads = threads;

module.exports.isActived = function isActived(){
    return actived;
};

module.exports.stop = function stop(){
    actived = false;
};

function uploadFile(id, thread, options, callback){
    logger.debug(options)
    callback = callback || function(){}
    var item = null;
    var itemKey = null;
    var maps = ['cutFiles', 'files']
    for(key in maps){
        var value = maps[key];
        if(thread.data[value].hasOwnProperty(id)){
            item = thread.data[value][id];
            itemKey = value;
            break;
        }
    }
    if(item && item.uploaded==0 && item.vid==0){
        var FormData = require('form-data');
        var form = new FormData();
        form.append('r', "appapi/post");
        form.append('udb', options.udb ? options.udb : "");
        form.append('yyuid', options.yyuid ? options.yyuid : "");
        form.append('channel', options.channel ? options.channel : "");
        form.append('title', options.title ? options.title : "");
        form.append('tags', options.tags ? options.tags : "");
        form.append('filename', item.filename);
        form.append('video', fs.createReadStream(item.file));
        fetch(config.MANAGER_HOST, { method: 'POST', body: form })
        .then(function(res) {
            return res.text();
        }).then(function(body) {
            try{
                logger.debug(body);
                var data = JSON.parse(body);
                if(data.hasOwnProperty("code") && data.code==1){
                    thread.data[itemKey][id].vid = data.vid ? data.vid : 0;
                    thread.data[itemKey][id].status =  data.code == 1 ? 1 : -1;
                    thread.data[itemKey][id].title = options.title ? options.title : "";
                    thread.save();
                    callback(data.message)
                }else{
                    callback("上传失败")
                }
            }catch(e){
                callback("上传失败")
            }
        });

        /*
        var formData = {
            r: "appapi/post",
            udb: options.udb ? options.udb : "",
            channel: options.channel ? options.channel : "test",
            title: options.title ? options.title : "",
            tags: options.tags ? options.tags : "",
            video: fs.createReadStream(item.file),
            filename: item.filename,
        }
        request.post({
           url: config.MANAGER_HOST,
           formData: formData
        }, (err, response, body) => {
            if(response.statusCode == 200){
                try{
                    var data = JSON.parse(body);
                    thread.data[itemKey][id].vid = data.vid ? data.vid : 0;
                    thread.data[itemKey][id].status =  data.code == 1 ? 1 : -1;
                    thread.data[itemKey][id].title = options.title ? options.title : "";
                    thread.save();
                    callback(data.message)
                }catch(e){
                    callback(body)
                }
            }else{
                callback("上传失败!")
            } 
        })*/
    }
}


function getThread(id, callback){
    if(threads.hasOwnProperty(id)){
        callback(threads[id]);
    }else{
        Live.get(id, function(thread){
            if(thread){
                thread = new Thread(null, {}).clone(thread);
            }
            callback(thread);
        })
    }
}
