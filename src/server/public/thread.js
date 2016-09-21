var child_process = require('child_process');
var fs = require('fs');
var path = require('path');
var util = require("./util");
var handler = require("./handler");
var Live = require('../models/live');
var THREAD_STATUS = require("./ENUM").THREAD_STATUS;
var config = require('../config');
var Video = require('../models/video');
var logger = require("../utils/log");
var ffmpeg = util.getFfmpegPath();


function Data(options){
    var time = new Date().getTime();
    options = typeof options == "object" ? options : {};
    var self = {
        id: options.id || 0,
        tabId: options.tabId || 0,
        url: options.url || "",
        title: options.title || "",
        createTime: time,
        fileDir: options.fileDir || "",
        tempDir: options.tempDir || "",
        startTime: time,
        updateTime: time,
        endTime: 0,
        status: THREAD_STATUS.WAIT,
        active: false,
        size: 0,
        expireTime: 10,
        status: "",
        files: {},
        cutFiles: {},
        streamData: [],
    };
    return self;
}

function Thread(socket, options){
    options = typeof options == "object" ? options : {};
    var self = {
        data: new Data(options),
        socket: socket,
        inited: false,
        closeStatus: false,
        runing: {},
        streams: [],
        events: {},
    };

    self.init = function(){
        var time = new Date().getTime();
        self.setActiveing();
        Live.create(self.toJson());
        handler.notice("active-list", handler.getActiveList(), true);
        self.setInit(true);
    }

    self.clone = function(object){
        Object.assign(self.data, object)
        return self;
    }

    self.isInit = function(){
        return self.inited;
    }

    self.setActiveing = function () {
        self.setStatus(THREAD_STATUS.RECORDING);
        self.setActive(true);
        self.runTimer();
    }

    self.setNotActive = function () {
        self.setStatus(THREAD_STATUS.END);
        self.setActive(false);
    }

    self.setInit = function(value){
        self.inited = value;
    }

    self.setCloseStatus = function(status){
        self.closeStatus = status;
    }

    self.isCloseStatus = function(){
        return self.closeStatus;
    }

    self.setStartTime = function(time){
        self.data.startTime = time;
    }

    self.getStartTime = function(){
        return self.data.startTime;
    }

    self.getTitle = function(){
        return self.data.title;
    }

    self.appendFile = function(id, file){
        self.data.files[id] = file;
    }

    self.getTabId = function(){
        return self.data.tabId;
    }

    self.getUpdateTime = function(){
        return self.data.updateTime;
    }

    self.setUpdateTime = function(time){
        self.data.updateTime = time;
    }

    self.pushCutFiles = function(id, file){
        self.data.cutFiles[id] = file;
        self.save();
    }


    self.setFileDir = function(file){
        self.data.fileDir = file;
    }

    self.getFileDir = function(){
        return self.data.fileDir;
    }

    self.setTempDir = function(file){
        self.data.tempDir = file;
    }

    self.getTempDir = function(){
        return self.data.tempDir;
    }

    self.getId = function(){
        return self.data.id;
    }

    self.wait = function(){
        self.setStatus(THREAD_STATUS.WAIT);
    }

    self.destruct = function(){
        self.setStatus(THREAD_STATUS.END);
    }

    self.appendStream = function(stream){
        self.streams.push(stream);
    }

    self.setStatus = function(status){
        self.status = status;
        self.updateData({status: status});
    }

    self.isActive = function(){
        return self.data.active;
    }

    self.setActive = function(active){
        self.data.active = active;
    }

    self.setEndTime = function(time){
        self.data.endTime = time;
    }

    self.getData = function(){
        var data = self.data;
        return data;
    }

    self.setData = function(data){
        self.data = data;
    }

    self.runTimer = function(){
        var t = setInterval(function(){
            if(self.isExpire()){
                self.emit("end", function(){
                    clearInterval(t);
                })
            }
        }, 10000)
    }

    self.toJson = function(){
        var data = self.data;
        for(index in self.streams){
            var stream = self.streams[index];
            //data.streamData.push(stream.toJson());
        }
        return data;
    }

    self.getExpireTime = function(){
        return self.data.expireTime;
    }

    self.isExpire = function(){
        var second = self.getExpireTime();
        if((new Date().getTime() - self.getUpdateTime()) >= second * 1000){
            return true;
        }
        return false;
    }

    self.addSize = function(size){
        self.data.size += size;
        self.updateData();
    }

    self.updateData = function(options){
        for(key in options){
            if(self.data.hasOwnProperty(key)){
                self.data[key] = options[key];
            }
        }
        self.setUpdateTime(new Date().getTime());
        handler.notice("active-list", handler.getActiveList());
    }

    self.on = function(e, callback){
        if(self.events.hasOwnProperty(e)){
            self.events[e].push(callback);
        }else{
            self.events[e] = [callback];
        }
        return self;
    }

    self.emit = function(e, message, callback){
        if(self.events.hasOwnProperty(e)){
            for(index in self.events[e]){
                var item = self.events[e][index];
                item(message, callback);
            }
        }
        return self;
    }

    self.off = function(e){
        if(self.events.hasOwnProperty(e)){
            delete self.events.e;
        }
        return self;
    }

    self.onSocket = function(event, callback){
        if(this.socket){
            this.socket.on(event, callback);
        }else{
            util.error("socket not bing event " + event);
        }
        return self;
    }

    self.emitSocket = function(event, message){
        if(this.socket){
            this.socket.emit(event, message);
        }else{
            util.error("socket not emit " + event);
        }
        return self;
    }

    self.notice = function(event, callback){
        if(self.isAllStreamEnd()){
            if(callback) callback(false);
        }
        for(index in self.streams){
            var stream = self.streams[index];
            stream.emit(event, callback);
        }
    }

    self.getSavePath = function(callback){
        var path = "";
        Setting.get(file_save_path_key, function(value){
            if(value) path = value;
            if(!path) path = Path.join(util.getHomePath(), "/Data");
            if(callback) callback(Path.normalize(path));
        });
    }

    self.isAllStreamEnd = function(){
        return Object.keys(self.streams).length > 0 ? false : true;
    }

    self.save = function(){
        Live.update(self.getId(), self.toJson());
    } 

    self.end = function(callback){
        self.setEndTime(new Date().getTime());
        self.setStatus(THREAD_STATUS.END);
        self.save();
        handler.notice("active-list", handler.getActiveList(), true);
        util.info("End thread ID: " + self.getId());
        if(callback) callback(self);
    }

    self.close = function(callback){
        util.info("close thread!")
        self.setActive(false);
        self.setStatus(THREAD_STATUS.END_RECORDING);
        self.save();
        self.notice("end", function(){
            if(self.isAllStreamEnd()){
                self.end(callback);
            }
        });
    }

    self.cut = function(file, start, duration, callback){
        var filename = util.md5(file + start + duration + new Date().getTime()) + ".mp4";
        var output =  path.dirname(file) + "/" + filename
        var command = ffmpeg + "  -ss " + start + " -i " + file + " -t " + duration + " -c copy -movflags +faststart -y " + output;
        child_process.exec(command, function(err, stderr, stdout){
            logger.debug(err);
            logger.debug(stderr);
            if(fs.existsSync(output)){
                Video.create({
                    file:output,
                    filename: filename,
                    duration: duration,
                }, function(id, video){
                    self.pushCutFiles(id, video);
                    callback(false, id)
                })
            }else{
                callback(true)
            }
        });
    }

    self.cutCurrentStream = function(options){
        if(self.isAllStreamEnd()){
            return self.emitSocket("live-error", "["+self.getTitle()+"]还没有进入录制，没法截取")
        }else{
            self.notice("live-start-cut", options);
        }
    }

    self.on("remove-stream", function(stream){
        var id = stream.id;
        //delete self.runing[id];
        for(index in self.streams){
            if(self.streams[index].id == id){
                delete self.streams[index];
            }
        }
    });

    self.on("restart", function(callback){
        self.setStatus(THREAD_STATUS.RECORDING);
        self.save();
        self.setActive(true);
    });

    self.on("end", function(callback){
        self.close(callback);
    });

    self.on("close", function(callback){
        self.emitSocket("close-connect", self.getTabId());
        self.close(callback);
    });

    self.on("stream-run", function(stream){
        var id = stream.id;
        //self.runing[id] = stream;
    });

    /*self.on("stream-end", function(stream){
        var id = stream.id;
        //if(self.runing.hasOwnProperty(id)){
            //delete self.runing[id];
        //}
        self.emit("remove-stream", stream)
        if(self.isAllStreamEnd()){
            self.end();
        }
    });*/

    self.onSocket("record-end", self.close);

    self.onSocket("record-start", function(){
        util.info("record-start!")
        self.setActive(true);
        self.setStatus(THREAD_STATUS.RECORDING);
        self.save();
        self.notice("start");
    });

    return self;
}


module.exports = Thread;
