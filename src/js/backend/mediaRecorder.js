import fs from 'fs';
import events from 'events';

function mediaRecorder(stream, options) {
    var that = new events.EventEmitter()
    that.stream = stream;

    try{
        that.mediaRecorder = new MediaRecorder(stream, options);
    }catch(e){
        throw(e);
    }

    that.getStream = function(){
        return that.mediaRecorder.stream
    }

    that.getState = function(){
        return that.mediaRecorder.state
    }

    that.getMimeType = function(){
        return that.mediaRecorder.mimeTyp
    }

    that.getIgnoreMutedMedia = function(){
        return that.mediaRecorder.ignoreMutedMedia
    }

    that.getVideoBitsPerSecond  = function(){
        return that.mediaRecorder.videoBitsPerSecond 
    }

    that.getAudioBitsPerSecond = function(){
        return that.mediaRecorder.audioBitsPerSecond
    }

    that.isTypeSupported = function(type){
        return that.mediaRecorder.isTypeSupported(type)
    }

    that.start = function(time){
        that.emit("start");
        return that.mediaRecorder.start(10)
    }

    that.pause = function(){
        that.emit("pause")
        return that.mediaRecorder.pause()
    }

    that.resume = function(){
        that.emit("resume")
        return that.mediaRecorder.resume()
    }

    that.requestData = function(){
        that.emit("requestData")
        return that.mediaRecorder.requestData()
    }

    that.stop = function(){
        that.emit("stop");
        return that.mediaRecorder.stop()
    }

    that.mediaRecorder.ondataavailable = function(e){
        that.emit('ondataavailable', e);
    }

    that.mediaRecorder.onerror = function(e){
        that.emit('onerror', e);
    }

    that.mediaRecorder.onpause = function(e){
        that.emit('onpause', e);
    }

    that.mediaRecorder.onresume = function(e){
        that.emit('onresume', e);
    }

    that.mediaRecorder.onstart = function(e){
        that.emit('onstart', e);
    }

    that.mediaRecorder.onstop = function(e){
        that.emit('onstop', e);
    }

    that.blobToBuffer = function(blob, cb) {
        if (typeof Blob === 'undefined' || !(blob instanceof Blob)) {
            throw new Error('first argument must be a Blob')
        }
        if (typeof cb !== 'function') {
            throw new Error('second argument must be a function')
        }

        var reader = new FileReader()

        function onLoadEnd (e) {
            reader.removeEventListener('loadend', onLoadEnd, false)
            if (e.error) cb(e.error)
            else cb(null, new Buffer(reader.result))
        }

        reader.addEventListener('loadend', onLoadEnd, false)
        reader.readAsArrayBuffer(blob)
    }

    return that
}

module.exports = mediaRecorder;
