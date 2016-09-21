import fs from 'fs';
import events from 'events';
import mediaRecorder from './mediaRecorder';

function mediaRecorderVideo(stream, audio, options) {
    var that = new events.EventEmitter()
    if(audio){
        that.type = {'type': 'audio/mp3'}
        that.options = options || {videoBitsPerSecond : 2000000, audioBitsPerSecond: 128000}
    }else{
        that.type = {'type': 'video/webm'}
        that.options = options || {mimeType: 'video/webm', videoBitsPerSecond : 2000000, audioBitsPerSecond: 128000}
    }

    that.mediaRecorder = new mediaRecorder(stream, that.options)

    that.mediaRecorder.on("ondataavailable", function(e){
        that.emit("ondataavailable", e);
    })

    that.mediaRecorder.on("onstop", function(e){
        that.emit("onstop", e);
    })

    that.mediaRecorder.on("onstart", function(e){
        that.emit("onstart", e);
    })

    that.getStream = function(){
        that.mediaRecorder.getStream();
    }

    that.getFileInfo = function(file){
        if(!file){
            throw("file not settng!")
        }
        let fd = null;
        try{
            fd = fs.openSync(file, "w+");
        }catch(e){
            throw(`file [${file}] create fail`, e)
        }
        return {
            fd: fd,
            status: 1,
            size: 0,
            path: file,
        }
    }

    that.start = function(time){
        that.mediaRecorder.start(time);
    }

    that.save = function(file, type, callback){
        callback = callback || function(){}
        let info = that.getFileInfo(file)
        that.mediaRecorder.on("ondataavailable", that.toFile.bind(that, info, type))
        that.mediaRecorder.on("onstop", function(e){
            try{
                info.status = 0
                fs.closeSync(info.fd)
                callback(null, info)
            }catch(e){
                callback(`file [${file}] close fail` + e, null)
            }
        })
    }

    that.toFile = function(info, type, e){
        type = type || that.type
        if (e.data && e.data.size > 0) {
            var blob = new Blob([e.data], type);
            that.mediaRecorder.blobToBuffer(blob, function(err, buffer){
                if(info.status == 1){
                    let length = buffer.length;
                    fs.writeSync(info.fd, buffer, 0, buffer.length, info.size);
                    info.size += length;
                    that.emit("onprogress", length, info.size)
                }
            })
        }
    }

    that.stop = function(){
        that.mediaRecorder.stop();
    }
    return that
}

module.exports = mediaRecorderVideo;
