var fs = require('fs');
var moment = require('moment');
var path = require('path');
var child_process = require('child_process');
var handler = require("./handler");
var util = require("../utils/util");
var logger = require("../utils/log");
var Video = require('../models/video');
var STREAM_STATUS = require("./ENUM").THREAD_STATUS;
var ffmpeg = util.getFfmpegPath();

function Data(options){
    options = typeof options == "object" ? options : {};
    var self = {
        url: options.url || "",
        title: options.title || "",
        streamUrlMd5: options.streamUrlMd5 || "",
        createTime: new Date().getTime(),
        updateTime: 0,
        streamUrl: options.streamUrl || "",
        connect: true,
        active: true,
        cuting: false,
        size: 0,
        status: STREAM_STATUS.WAIT,
        filename: "",
        fileDir: options.fileDir || "",
        tempDir: options.tempDir || "",
        tempFile: "",
        cutFiles: {},
        suffix: options.suffix || "mp4",
        recordStartTime: 0,
        recordEndTime: 0,
    };
    return self;
}

function Stream(socket, thread, options){
    options = typeof options == "object" ? options : {};
    var self = {
        id: options.id || 0,
        data: new Data(options),
        counter: 0,
        socket: socket,
        thread: thread,
        events: {},
        tempFileFd: null,
    };

    self.init = function(){
        var time = new Date().getTime();
        if(!self.thread.isInit()){
            self.thread.init();
        }else{
            self.thread.setActiveing();
        }
        self.thread.appendStream(self);
        self.setActive(true);
        self.setFilename(util.md5(self.getStreamUrlMd5() + time));
        //self.setFilename(self.getTitle() + "-" + moment().format("YYMMDDHHmmss").toString());
        self.setTempFile(path.join(self.getTempDir(), self.getFilename() + "." + self.getSuffix()));
        self.setRecordStartTime(time);
        self.setStatus(STREAM_STATUS.RECORDING);
        self.thread.emit("stream-run", self);
        self.thread.updateData({"file": self.getTempFile()});
        self.emitSocket("live-record-start");
        util.mkdirsSync(self.getFileDir());
        util.mkdirsSync(self.getTempDir());
        this.tempFileFd = fs.openSync(self.getTempFile(), "w+")
    }

    self.getTitle = function(){
        return self.data.title;
    }

    self.setUpdateTime = function(time){
        self.data.updateTime = time;
    }

    self.setRecordEndTime = function(time){
        self.data.recordEndTime = time;
    }

    self.getRecordEndTime = function(){
        return self.data.recordEndTime;
    }

    self.getRecordStartTime = function(){
        return self.data.recordStartTime;
    }

    self.setRecordStartTime = function(time){
        self.data.recordStartTime = time;
    }

    self.getFileDir = function(){
        return self.thread.getFileDir();
    }

    self.appendFile = function(id, file){
        self.thread.appendFile(id, file);
    }

    self.getTempDir = function(){
        return self.thread.getTempDir();
    }

    self.getSuffix = function(){
        return self.data.suffix;
    }

    self.getStreamUrlMd5 = function(){
        return self.data.streamUrlMd5;
    }

    self.setFilename = function(filename){
        self.data.filename = filename;
    }

    self.getFilename = function(){
        return self.data.filename;
    }

    self.setTempFile = function(filename){
        self.data.tempFile = filename;
    }

    self.getTempFile = function(){
        return self.data.tempFile;
    }

    self.setStatus = function(status){
        self.data.status = status;
    }

    self.isActive = function(){
        return self.data.active;
    }

    self.setActive = function(active){
        self.data.active = active;
    }

    self.isCuting = function(){
        return self.data.cuting;
    }

    self.setCuting = function(active){
        self.data.cuting = active;
    }

    self.addSize = function(size){
        self.data.size += size;
        self.thread.addSize(size);
    }

    self.getSize = function(){
        return self.data.size;
    }

    self.setData = function(data){
        self.data = data;
    }

    self.pushCutFiles = function(id, file){
        self.data.cutFiles[id] = file;
        self.thread.pushCutFiles(id, file);
    }

    self.getCutFilesCount = function(file){
        return self.counter++;
    }

    self.deleteCutFile = function(index){
        delete self.data.cutFiles[index];
    }

    self.close = function(){
        self.setConnect(false);
    }

    self.setConnect = function(value){
        self.data.connect = value;
    }

    self.isConnect = function(){
        return self.data.connect;
    }

    self.updateData = function(options){
        for(key in options){
            if(self.data.hasOwnProperty(key)){
                self.data[key] = options[key];
            }
        }
    }

    self.toJson = function(){
        return self.data;
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
            logger.debug("socket not bing event " + event);
        }
    }

    self.emitSocket = function(event, message){
        if(this.socket){
            this.socket.emit(event, message);
        }else{
            logger.debug("socket not emit " + event);
        }
    }

    self.recording = function(chunk){
        if(self.isActive()){
            //console.info(new Buffer(chunk))
            fs.writeSync(this.tempFileFd, new Buffer(chunk), 0, chunk.length, self.getSize());
            //fs.appendFileSync(this.getTempFile() + ".mp4", chunk);
            var size = chunk.length;
            self.addSize(size);
            self.setUpdateTime(new Date().getTime());
        }
    }

    self.closeRecord = function(callback){
        callback = callback || function(){}
        try{
            self.emitSocket("live-record-end");
            self.setActive(false);
            self.setRecordEndTime(new Date().getTime());

            if(!fs.existsSync(this.getTempFile())){
                return callback();
            }
            fs.closeSync(this.tempFileFd);
            var filename = self.getFilename() + "." + self.getSuffix();
            var file = path.join(self.getFileDir(), filename);
            var tempFile = self.getTempFile();
            var command = ffmpeg + " -i " + tempFile + " -c copy -movflags +faststart -y " + file;
            logger.debug(command);
            self.exec(command, function(err, stderr, stdout){
                logger.debug(stderr);
                self.thread.updateData({"file": file});
                fs.unlink(tempFile);
                var success = fs.existsSync(file);
                if(!success){
                    self.emitSocket("live-error", "录制失败！");
                }else{
                    Video.create({
                        file:file,
                        filename: filename,
                    }, function(id, video){
                        self.appendFile(id, video);
                    })
                }
                self.thread.emit("remove-stream", self);
                callback(success);
            });
        }catch(e){
            logger.debug(e)
            self.thread.emit("remove-stream", self);
            callback(false);
        }
    }

    self.cutEvent = function(options){
        logger.debug("cut [", self.thread.getTitle(), "]", options)
        if(!self.isActive()){
            return self.emitSocket("live-error", "["+self.thread.getTitle()+"]还没有进入录制，没法截取")
        }else if(self.isCuting()){
            return self.emitSocket("live-error", "已经有任务在截取中，请等待上一个任务完成后再进行截取...")
        }
        var currentTime = options.currentTime || new Date().getTime();
        var forward = options.forward || 30;
        var backward = (options.backward && options.backward <60) ? options.backward : 0;
        var duration = parseInt(forward) + parseInt(backward);
        var diffTime = parseInt((currentTime-self.getRecordStartTime())/1000);
        var start = diffTime - forward > 0 ? diffTime - forward : 0;
        if((currentTime + backward * 1000) > new Date().getTime()){
            setTimeout(function(){
                self.cut(start, duration);
            }, (currentTime + backward * 1000) - new Date().getTime());
        }else{
            self.cut(start, duration)
        }
    }

    self.onSocket("live-start-cut", self.cutEvent)
    self.on("live-start-cut", self.cutEvent)

    self.cut = function(start, duration){
        try{
            var length = self.getCutFilesCount();
            var filename = self.getFilename() + "-" + length.toString() + "." + self.getSuffix();
            var file = path.join(self.getFileDir(), filename);
            var tempFile = self.getTempFile();
            if(!tempFile){
                return false;
            }
            var command = ffmpeg + "  -ss " + start + " -i " + self.getTempFile() + " -t " + duration + " -c copy -movflags +faststart -y " + file;
            logger.debug(command);
            self.exec(command, function(err, stderr, stdout){
                logger.debug(stderr);
                self.setCuting(false);
                self.setStatus(STREAM_STATUS.END);
                if(fs.existsSync(file)){
                    Video.create({
                        file:file,
                        filename: filename,
                        duration: duration,
                    }, function(id, video){
                        self.pushCutFiles(id, video);
                        handler.notice("cut-result", {code: 1, message: "截取成功！", file:file, video_id:id}, true);
                        self.emitSocket("live-success", "截取成功！");
                    })
                }else{
                    self.deleteCutFile(length-1)
                    handler.notice("cut-result", {code: "-1", message: "截取失败！"}, true);
                    self.emitSocket("live-error", "截取失败！");
                }
                self.emit("cut-end");
            });
        }catch(e){
            logger.debug(e);
        }
    }

    self.exec = function(command, callback){
        child_process.exec(command, function(err, stderr, stdout){
            if(err){
                logger.debug(err);
            }
            if(stderr){
                logger.debug(stderr);
            }else{
                //util.info(stdout);
            }
            callback(err, stderr, stdout);
        });
    }


    self.on("start", function(callback){
        if(self.isConnect()){
            self.setActive(true);
        }
    })

    self.on("end", function(callback){
        callback = callback || function(){}
        logger.debug("remove-stream");
        self.setStatus(STREAM_STATUS.END_RECORDING);
        if(!self.isActive()){
            self.thread.emit("remove-stream", self);
            return callback(); 
        }else if(self.isCuting()){
            self.on("cut-end", function(){
                self.off("cut-end");
                self.closeRecord(callback);
            })
        }else{
            self.closeRecord(callback);
        }
    })

    return self;
}


module.exports = Stream;
