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
        console.time("loadedmetadata")
        var playPromise = null;
        if (!media) {
            playPromise = $video.play()
        }else{
            $video.style.display = "block";
            $video.src = media.path;
            playPromise = $video.play();
        }
        that.playing = true
        that.emit('play') 
        if (playPromise !== undefined) {
            playPromise.then(function() {
                that.emit('started')
            }).catch(function(error) {
                that.emit('rejected', error)
            });
        }
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

    $video.addEventListener('loadstart', function (event) {
        that.emit('loadstart', event)
    }, false)

    $video.addEventListener('durationchange', function (event) {
        that.emit('durationchange', event)
    }, false)

    $video.addEventListener('loadeddata', function (event) {
        that.emit('loadeddata', event)
    }, false)

    $video.addEventListener('loadedmetadata', function (event) {
        console.timeEnd('loadedmetadata');
        that.width = $video.videoWidth
        that.height =  $video.videoHeight
        that.ratio = that.width / that.height
        that.duration = $video.duration
        that.emit('metadata', event)
    }, false)

    $video.addEventListener('progress', function (event) {
        that.emit('progress', event);
        //console.info(event.target.webkitVideoDecodedByteCount)
    }, false)

    $video.addEventListener('seeked', function (event) {
        that.emit('seeked', event)
    }, false)

    $video.addEventListener('seeking', function (event) {
        that.emit('seeking', event)
    }, false)

    $video.addEventListener('waiting', function (event) {
        that.waitTimeOut = setTimeout(function(event){
            that.emit('waiting', event)
            that.waitTimeOut = null
        }, 500)
    }, false)

    $video.addEventListener('playing', function (event) {
        if(that.waitTimeOut !== null){
            clearTimeout(that.waitTimeOut)
            that.waitTimeOut = null
        }else{
            that.emit('playing', event)
        }
    }, false)

    $video.addEventListener('ended', function (event) {
        atEnd = true
        that.playing = false
        that.emit('pause', event)
        that.emit('ended', event)
    }, false)

    $video.addEventListener('suspend', function (event) {
        that.emit('suspend', event)
    }, false)

    $video.addEventListener('abort', function (event) {
        that.emit('abort', event)
    }, false)

    $video.addEventListener('emptied', function (event) {
        that.emit('emptied', event)
    }, false)

    $video.addEventListener('play', function (event) {
        that.emit('play', event)
    }, false)

    $video.addEventListener('pause', function (event) {
        that.emit('pause', event)
    }, false)

    $video.addEventListener('canplay', function (event) {
        that.emit('canplay', event)
    }, false)

    $video.addEventListener('canplaythrough', function (event) {
        that.emit('canplaythrough', event)
    }, false)

    $video.addEventListener('timeupdate', function (event) {
        that.emit('timeupdate', event)
    }, false)
    
    return that
}

module.exports = player;
