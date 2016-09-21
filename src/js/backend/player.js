import fs from 'fs';
import events from 'events';
import path from 'path';

function player($video) {
    var that = new events.EventEmitter()
    var atEnd = false
    var lastUrl = null

    that.element = $video;
    that.width = 0
    that.height =  0
    that.ratio = 1.6
    that.duration = 0
    that.playing = false
    that.casting = false
    that.waitTimeOut = null;

    that.play = function(media){
        if (!media) {
            $video.play()
        }else{
            $video.style.display = "block";
            $video.src = media.path;
            $video.play();
        }
        that.playing = true
        that.emit('play') 

    }

    that.isPaused = function(){
        return $video.paused;
    }

    that.pause = function () {
        $video.pause()
        that.playing = false
        that.emit('pause')
    }

    that.time = function (time) {
        atEnd = false
        if (arguments.length) $video.currentTime = time
        return $video.currentTime
    }

    that.getSrc = function (){
        return $video.currentSrc
    }

    that.setSrc = function (value){
        $video.src = value
    }

    that.isPause = function(){
        return $video.paused;
    }

    that.volume = function (value) {
        $video.volume = value
    }

    that.currentTime = function(){
        return $video.currentTime;
    }

    that.setCurrentTime = function(value){
        $video.currentTime = value;
    }

    that.getFrameImage = function(canvas) {
        if(!canvas) canvas = document.createElement('canvas');
        canvas.width  = that.width;
        canvas.height = that.height;
        canvas.getContext('2d').drawImage($video, 0, 0, that.width, that.height);
        return canvas;
    }

    that.getDuration = function(canvas) {
        return that.duration;
    }

    $video.addEventListener('loadedmetadata', function () {
        that.width = $video.videoWidth
        that.height =  $video.videoHeight
        that.ratio = that.width / that.height
        that.duration = $video.duration
        that.emit('metadata')
    }, false)

    $video.addEventListener('seeked', function () {
        that.emit('seeked')
    }, false)

    $video.addEventListener('seeking', function () {
        that.emit('seeking')
    }, false)

    $video.addEventListener('waiting', function () {
        that.waitTimeOut = setTimeout(function(){
            that.emit('waiting')
            that.waitTimeOut = null
        }, 500)
    }, false)

    $video.addEventListener('playing', function () {
        if(that.waitTimeOut !== null){
            clearTimeout(that.waitTimeOut)
            that.waitTimeOut = null
        }else{
            that.emit('playing')
        }
    }, false)

    $video.addEventListener('ended', function () {
        atEnd = true
        that.playing = false
        that.emit('pause')
        that.emit('ended')
    }, false)

    
    return that
}

module.exports = player;
