const electron = require('electron');
const remote = electron.remote
const shell = electron.shell
const ipc = electron.ipcRenderer;
const Menu = remote.Menu
const MenuItem = remote.MenuItem
import path from 'path';
import $ from 'jquery';
import drag from 'drag-and-drop-files';
import classnames from 'classnames';
import React, { Component, PropTypes } from 'react';
import playlist from '../backend/playlist';
import player from '../backend/player';
import util from '../utils/util';
import live from '../backend/live';
import mouseidle from '../backend/mouseidle';


const channel = "selected-send-video";


var formatTime = function (secs) {
    var hours = (secs / 3600) | 0
    var mins = ((secs - hours * 3600) / 60) | 0
    secs = (secs - (3600 * hours + 60 * mins)) | 0
    if (mins < 10) mins = '0' + mins
    if (secs < 10) secs = '0' + secs
    return (hours ? hours + ':' : '') + mins + ':' + secs
}

class PlayPage extends Component {

    constructor(props) {
        super(props);
        this.state = {
            videoName: "",
            cutStartTime: 0,
            cutEndTime: 0,
            play: false,
            playlist: playlist,
            showPlaylist: false,
            showUploadPanel: false,
            udb: util.getUDB(),
            yyuid: util.getYYUID(),
            channel: "",
            title: "",
            tags: "",
            waiting: false,
            uploading: false,
            isFullscreen: false,
            linkInput: "",
            loop: false,  //ion-android-refresh/ion-android-sync
        };
        this.media = null;
        this.preview = null;
        this.isVolumeSliderClicked = false
        this.clickInterval = null;
        this.liveItem = null;
        this.video_id = 0;
        this.clickEventTimer = null;
        this.showMenu = false;
        this.imageSavePath = "./";

    }

    componentDidMount() {
        let self = this;
        let updateInterval;
        
        ipc.on("ready-play", function(event, options){
            self.liveItem = options.liveItem;
            self.video_id = options.video_id;
            playlist.add(options.file, self.printError, true)
        });
        ipc.on("pause", function(event, options){
            self.media.pause()
        });

        ipc.on("resize", function(event, options){
            if(self.media) self.winResize({width: options[0], height: options[1]});
        });

        ipc.on(channel, function(event, files){
            let length = files.length;
            files.map((file, index) => {
                playlist.add(file, self.printError, !index)
            })
        });

        playlist.on('update', function(file){
            self.setState({playlist: playlist})
            if(file) playlist.select(file.id)
        })
        /*playlist.once('update', function () {
            playlist.select(0)
        })*/
        let media = new player($('#player')[0]);
        this.preview = new player($('#preview')[0]);
        media.on('metadata', function () {
            if (!self.state.isFullscreen) {
                self.resize(self.media)
            }

            self.preview.setSrc(self.media.getSrc())
            self.initCutStart()
            self.initCutEnd()
            self.initForm()
            $('#controls-main')[0].style.display = 'block'
            $('#controls-time-total')[0].innerText = formatTime(media.duration)
            $('#controls-time-current')[0].innerText = formatTime(media.time())

            clearInterval(updateInterval)
            updateInterval = setInterval(function () {
                $('#controls-timeline-position')[0].style.width = (100 * (media.time() / media.duration)) + '%'
                $('#controls-time-current')[0].innerText = formatTime(media.time())
                self.isLoopPlay();
            }, 250)
        })
        media.on('ended', function () {
            self.isLoopPlay(true);
        })

        media.on('play', self.onPlay.bind(this))
        media.on('pause', self.onPause.bind(this))
        media.on('waiting', self.onWaiting.bind(this))
        media.on('playing', self.onPlaying.bind(this))

        $('#controls-timeline').on('click', function (e) {
            if($(e.target).data("item") == "controls-move"){
              var time = e.pageX / $('#controls-timeline')[0].offsetWidth * media.duration
              media.time(time)
            }
        })

        $('#controls-timeline').on('mousemove', function (e) {
            if($(e.target).data("item") == "controls-move"){
                self.updateTimelineTooltip(e)
                self.updateTimelinePreview(e)
            }
        })

        $('#controls-timeline').on('mouseover', function (e) {
            if($(e.target).data("item") == "controls-move"){
                $('#controls-timeline-tooltip')[0].style.opacity = 1
                $('#controls-timeline-preview')[0].style.opacity = 1
                self.updateTimelinePreview(e)
            }
        })
        
        let controlsCutStart = $('.controls-cut-start');
        let controlsCutTimeline = $('.controls-cut-timeline');
        controlsCutStart.on('mousedown', function (e) {
            controlsCutTimeline.on('mousemove', function (e) {
                self.updateCutStart(e)
            })
        }).on('mouseup', function( e) {
            controlsCutTimeline.unbind('mousemove')
        })

        let controlsCutEnd = $('.controls-cut-end');
        controlsCutEnd.on('mousedown', function (e) {
            controlsCutTimeline.on('mousemove', function (e) {
                self.updateCutEnd(e)
            })
        }).on('mouseup', function( e) {
            controlsCutTimeline.unbind('mousemove')
        })

        $('#controls-timeline').on('mouseout', function (e) {
            $('#controls-timeline-tooltip')[0].style.opacity = 0
            $('#controls-timeline-preview')[0].style.opacity = 0
        })

        $('#controls-volume-slider').on('mousemove', function (e) {
            if (self.isVolumeSliderClicked) {
                var volume = $('#controls-volume-slider')[0]
                self.updateAudioVolume(volume.value)
                self.updateVolumeSlider(volume)
            }
        })

        $('#controls-volume-slider').on('mousedown', function (e) {
            self.isVolumeSliderClicked = true
        })

        $('#controls-volume-slider').on('mouseup', function (e) {
            var volume = $('#controls-volume-slider')[0]
            self.updateAudioVolume(volume.value)
            self.updateVolumeSlider(volume)
            self.isVolumeSliderClicked = false
        })

        mouseidle($('#idle')[0], 3000, 'hide-cursor')
        
        this.media = media;
        self.initDrapWindow();
        self.initVilume();
        self.initImageSavePath()
        self.initContextMenuList();
        playlist.on('select', self.play.bind(self))
        $(document).keydown(this.handleKeyboardEvent.bind(this))

    }


    printError(err){
        let self = this;
        let hint = $("#video-error");
        if(err){
            console.error(err);
            hint.html("ERROR: " + err).show();
            setTimeout(function(){
                hint.html("").hide();
            }, 3000)
        }
    }

    initImageSavePath(){
        let self = this;
        util.getDataPath(function(p){
            let imageSavePath = path.join(p, "screenshot");
            util.mkdirsSync(imageSavePath)
            self.imageSavePath = imageSavePath;
        })
    }

    initContextMenuList(){
        let self = this;
        let menuItems = {};
        menuItems.play = new MenuItem({ 
            label: '播放', 
            accelerator: 'Space',
            click: self.onPlayToggle.bind(self),
        });
        menuItems.pause = new MenuItem({ 
            label: '暂停', 
            accelerator: 'Space',
            click: self.onPlayToggle.bind(self),
        });
        menuItems.forward = new MenuItem({ 
            label: '快进',  
            accelerator: 'Right',
            click: self.playForward.bind(self, 10),
        });
        menuItems.backward = new MenuItem({ 
            label: '快退', 
            accelerator: 'Left',
            click: self.playBackward.bind(self, 10),
        });
        menuItems.fullScreen = new MenuItem({ 
            label: '全屏',
            type: 'checkbox',
            accelerator: 'Enter',
            click: self.onFullScreenToggle.bind(self),
        });
        menuItems.loop = new MenuItem({ 
            label: '循环模式',
            type: 'checkbox',
            click: self.setPlayMode.bind(self),
        });
        menuItems.separator1 = new MenuItem({ 
            type: 'separator',
        });
        menuItems.cutStartTime = new MenuItem({ 
            label: '截取开始时间', 
            click: function(){
                self.setCutStart(self.media.currentTime())
            }.bind(self),
        });
        menuItems.cutEndTime = new MenuItem({ 
            label: '截取结束时间', 
            click: function(){
                self.setCutEnd(self.media.currentTime())
            }.bind(self),
        });
        menuItems.resetStartTime = new MenuItem({ 
            label: '重置开始时间', 
            click: self.initCutStart.bind(self),
        });
        menuItems.resetEndTime = new MenuItem({ 
            label: '重置结束时间', 
            click: self.initCutEnd.bind(self),
        });
        menuItems.separator2 = new MenuItem({ 
            type: 'separator',
        });
        menuItems.screenshot = new MenuItem({ 
            label: '截图', 
            click: self.screenshot.bind(self),
        });
        menuItems.upload = new MenuItem({ 
            label: '上传', 
            click: self.popUploadPanel.bind(self),
        });
        menuItems.screenshotFolder = new MenuItem({ 
            label: '打开截图文件夹', 
            click: self.openScreenshotFolder.bind(self),
        });
        menuItems.videoFolder = new MenuItem({ 
            label: '打开视频文件夹', 
            click: self.openVideoFolder.bind(self),
        });
        let menu = new Menu();
        Object.keys(menuItems).map((name, index) => {
            menu.append(menuItems[name])
        })
        self.menu = menu;
        self.menuItems = menuItems;
    }

    handleContextMenuList(){
        if(this.menu !== null){
            this.menuItems.play.visible = !this.state.play;
            this.menuItems.pause.visible = this.state.play;
            this.menuItems.fullScreen.checked = this.state.isFullscreen;
            this.menuItems.loop.checked = this.state.loop;

            this.menu.popup(remote.getCurrentWindow())
            this.showMenu = true;
        }
    }

    closeMenu(){
        this.showMenu = false;
    }

    resize(media){
        ipc.send('resize', {
            width: media.width,
            height: media.height,
            ratio: media.ratio,
        })
    }

    winResize(options){
        /*
        let self = this;
        if(options.width / options.height > self.media.ratio){
            self.media.height = options.height;
            self.media.width = (options.height * self.media.ratio) | 0
        }else{
            self.media.width = options.width;
            self.media.height = (options.width / (options.width / options.height)) | 0
        }*/
    }

    updateAudioVolume(value) {
        this.media.volume(value)
    }

    updateVolumeSlider(volume) {
        var val = volume.value * 100
        volume.style.background = '-webkit-gradient(linear, left top, right top, color-stop(' + val.toString() + '%, #31A357), color-stop(' + val.toString() + '%, #727374))'
    }

    onPlayToggle(){
        if(this.state.play) this.media.pause()
        else this.media.play();
    }

    onrepeatcycle(){

    }

    setCutTime(start, end){
        if(start > end){
            this.setState({cutStartTime: parseInt(end), cutEndTime: parseInt(start)})
            return true;
        }else if(start == end){
            return false
        }else{
            this.setState({cutStartTime: parseInt(start), cutEndTime: parseInt(end)})
            return true;
        }
    }

    initCutStart(){
        var tooltip = $('.controls-cut-start')[0]
        tooltip.innerHTML = "00:00"
        tooltip.style.left = 0
        this.setCutTime(0, this.media.duration);
    }

    getTimeLinePercentage(e){
        return e.pageX / $('#controls-timeline')[0].offsetWidth
    }

    getCurrTime(e){
        return this.getTimeLinePercentage(e) * this.media.duration
    }

    setCurrCutTime(key){
        if(key == 'start'){
            this.setCutStart(this.media.currentTime())
        }else{
            this.setCutEnd(this.media.currentTime())
        }
    }

    setCutStart(value){
        if(this.setCutTime(value, this.state.cutEndTime)){
            this.setCutPosition("cutStartTime", value)
        }
    }

    setCutEnd(value){
        if(this.setCutTime(this.state.cutStartTime, value)){
            this.setCutPosition("cutEndTime", value)
        }
    }

    setCutPosition(key, value){
        let map = {
            cutStartTime: ".controls-cut-start",
            cutEndTime: ".controls-cut-end",
        }
        let tooltip = $(map[key])[0];
        let offset = (value / this.media.duration)*100;
        tooltip.innerHTML = formatTime(value)
        if(parseInt(offset) > 96){
            tooltip.style.left = "96%";
        }else{
            tooltip.style.left =  offset + "%"
        }
    }

    updateCutStart(e){
        let tooltip = $('.controls-cut-start')[0]
        let currTime = this.getCurrTime(e)
        let time =  formatTime(currTime)
        tooltip.innerHTML = time
        tooltip.style.left = (e.pageX - tooltip.offsetWidth / 2) + "px"
        this.setCutTime(currTime, this.state.cutEndTime);
    }

    initCutEnd(){
        var tooltip = $('.controls-cut-end')[0]
        tooltip.innerHTML = formatTime(this.media.duration)
        tooltip.style.left = '96%'
    }

    updateCutEnd(e){
        let tooltip = $('.controls-cut-end')[0]
        let currTime = this.getCurrTime(e)
        let time =  formatTime(currTime)
        tooltip.innerHTML = time
        tooltip.style.left = (e.pageX - tooltip.offsetWidth / 2) + "px"
        this.setCutTime(this.state.cutStartTime, currTime);
    }

    updateTimelineTooltip(e) {
        var tooltip = $('#controls-timeline-tooltip')[0]
        var percentage = e.pageX / $('#controls-timeline')[0].offsetWidth
        var time =  formatTime(percentage * this.media.duration)
        tooltip.innerHTML = time
        tooltip.style.left = (e.pageX - tooltip.offsetWidth / 2) + "px"
    }

    updateTimelinePreview(e){
        var tooltip = $('#controls-timeline-preview')[0]
        var percentage = e.pageX / $('#controls-timeline')[0].offsetWidth
        this.preview.setCurrentTime(percentage * this.media.duration);
        tooltip.style.left = (e.pageX - tooltip.offsetWidth / 2) + "px"
    }

    onFullScreenToggle (e) {
        clearTimeout(this.clickEventTimer)
        if (!this.state.isFullscreen && e.shiftKey) {
            this.resize(this.media)
            return
        }

        if (this.state.isFullscreen) {
            this.exitFullScreen()
        } else {
            this.fullScreen()
        }
    }

    exitFullScreen(){
        /*var $icon = $('#controls-fullscreen .js-icon')
        this.isFullscreen = false
        $icon.removeClass('ion-arrow-shrink')
        ipc.send('exit-full-screen')
        $icon.addClass('ion-arrow-expand')*/
        $('#titlebar')[0].style.display = 'block'
        this.setState({"isFullscreen": false})
        ipc.send('exit-full-screen')
        ipc.send('allow-sleep')
    }

    fullScreen(){ 
        $('#titlebar')[0].style.display = 'none'
        this.setState({"isFullscreen": true})
        ipc.send('enter-full-screen')
        ipc.send('prevent-sleep')
        /*this.isFullscreen = true
        var $icon = $('#r5 .js-icon')
        $icon.removeClass('ion-arrow-expand')
        $icon.addClass('ion-arrow-shrink')
        ipc.send('enter-full-screen')*/
    }

    onPlay() {
        this.setState({play: true});
        //$('#controls-play .js-icon').removeClass('ion-play')
        //$('#controls-play .js-icon').addClass('ion-pause')
    }

    onPause() {
        this.setState({play: false});
    }

    onWaiting(){
        this.setState({waiting: true});
    }

    onPlaying(){
        this.setState({waiting: false});
    }
    
    play(){
        //this.setState({videoName: playlist.selected.name})
        this.media.play(playlist.selected)
        ipc.send('set-paly-title', playlist.selected.name)
        ipc.send('start-play')
        //this.initCutStart()
        //this.initCutEnd()
        //console.info(playlist.selected)
        //this.media.play('http://127.0.0.1:' + server.address().port + '/' + list.selected.id)
    }

    pause(){

    }

    screenshot(){
        let canvas = this.media.getFrameImage()
        let file = path.join(this.imageSavePath, util.md5(Math.random().toString() + new Date().getTime()) + ".jpg");
        let buffer = util.canvasToFile(canvas, file, function(err){
            if(err){
                console.info(err)
                alert("截图失败")
            }
            else shell.showItemInFolder(file)
        })
        
    }

    isLoopPlay(ended){
        if(this.state.loop === true){
            if(ended){
                this.media.setCurrentTime(this.state.cutStartTime);
                this.media.play();
            }else if(this.media.currentTime() > this.state.cutEndTime + 1){
                this.media.setCurrentTime(this.state.cutStartTime);
            }
        }
    }

    initForm(){
        this.setState({title: "", tags: ""});
    }

    initDrapWindow(){
        let self = this;
        drag($('body')[0], function(files){
            for (var i = 0; i < files.length; i++) {
                playlist.add(files[i].path, self.printError, !i)
            }
            self.setState({lastModified: new Date().getTime()})
        })
    }


    initVilume(){
        var volumeSlider = $('#controls-volume-slider')[0]
        volumeSlider.setAttribute("value", 0.5)
        volumeSlider.setAttribute("min", 0)
        volumeSlider.setAttribute("max", 1)
        volumeSlider.setAttribute("step", 0.05)
        this.updateAudioVolume(0.5)
        this.updateVolumeSlider(volumeSlider)
    }

    uploadVideo(){
        if(this.state.uploading){
            return 
        }
        let self = this;
        let video = playlist.selected;
        let form = {
            live_id: this.liveItem.id,
            video_id: this.video_id,
            filename: video.name,
            file: video.path,
            is_cut: 1,
            start: this.state.cutStartTime,
            end: this.state.cutEndTime,
            udb: this.state.udb,
            yyuid: this.state.yyuid,
            channel: this.state.channel,
            title: this.state.title,
            tags: this.state.tags,
        }
        if(form.start != 0 || form.end != parseInt(video.duration)){
            form.is_cut = 1;
        }
        this.setState({uploading: true})
        live.post(process.env.APP_PROXY_URL + '/upload', form, function(res){
            try{
                if(res.hasOwnProperty("code") &&  res.code == 1){
                    self.setState({uploading: false, showUploadPanel: false, title: ""})
                    alert(res.message)
                }else{
                    throw("上传失败！")
                }
            }catch(e){
                alert(e)
                self.setState({uploading: false})
            }
        })

    }

    openScreenshotFolder(){
        shell.showItemInFolder(this.imageSavePath)
    }

    openVideoFolder(){
        shell.showItemInFolder(this.media.getSrc())
    }

    setPlayMode(){
        let value = !this.state.loop;
        this.setState({"loop": value});
        if(value){
            this.media.setCurrentTime(this.state.cutStartTime);
        }
        if(this.media.isPause()){
            this.media.play();
        }
    }

    setUploadPanelState(value){
        this.setState({showUploadPanel: value});
    }

    setPlaylistState(value){
        this.setState({showPlaylist: value});
    }
   
    popPlayList(){
        this.setState({showPlaylist: !this.state.showPlaylist});
    }

    showVideoDialog(){
        ipc.send('open-file-dialog-video', channel);
    }

    clearPlaylist(){
        this.state.playlist.clear();
        this.setState({playlist: this.state.playlist});
    }

    popUploadPanel(){
        this.setState({showUploadPanel: !this.state.showUploadPanel});
    }

    handleChannelChange(event){
        this.setState({channel: event.target.value});
    }

    handleTitleChange(event){
        this.setState({title: event.target.value});
    }

    handleTagsChannelChange(event){
        this.setState({tags: event.target.value});
    }

    handleWheel(key, event){
        let state = {};
        let min = 0
        let max = this.media.duration;
        let otherKey = key == "cutStartTime" ? "cutEndTime" : "cutStartTime";
        let start = this.state[key];
        let end = this.state[otherKey];
        if(key == "cutStartTime") max = this.state.cutEndTime-1;
        else min = this.state.cutStartTime+1;
        state[key] = this.stepUp(start, this.getStep(start, end), event.deltaY < 0, min, max)
        this.setState(state);
        this.setCutPosition(key, state[key])
    }

    getStep(start, end){
        if(start > end){
            [start, end] = [end, start]
        }
        let value = parseInt((end - start) / 10)
        if(value < 1) value = 1;
        return value;
    }

    stepUp(value, step, up, min, max){
        if(up == true) value += step
        else value -= step
        if(value > max) value = max
        else if(value < min) value = min
        return value 
    }

    handleClickEvent(event){
        if(this.showMenu) return this.closeMenu()
        if(this.state.showPlaylist) return this.setPlaylistState(false)
        if(this.clickEventTimer !== null) clearTimeout(this.clickEventTimer);
        this.clickEventTimer = setTimeout(this.onPlayToggle.bind(this), 100);
    }

    playForward(value){
        let currTime = this.media.currentTime() + value;
        this.media.setCurrentTime(currTime > this.media.duration ? this.media.duration : currTime)
    }

    playBackward (value){
        let currTime = this.media.currentTime() - value;
        this.media.setCurrentTime(currTime < 0 ? 0 : currTime)
    }

    handleKeyboardEvent(event){
        if(event.target.tagName == "INPUT"){
            return
        }
        if(event.keyCode == 32){
            if(this.media.isPaused()) this.media.play()
            else this.media.pause();
        }else if(event.keyCode == 39){
            this.playForward(10)
        }else if(event.keyCode == 37){
            this.playBackward(10)
        }else if(event.keyCode == 27 && this.state.isFullscreen){
            this.exitFullScreen()
        }else if(event.keyCode == 13){
            this.onFullScreenToggle(event)
        }
    }

    playLink(link){
        if(link){
            playlist.add(link, this.printError, true)
        }
    }

    handleAddLinkInputChange(event){
        this.setState({linkInput: event.target.value});
    }

    handleKeyupByAddLink(event){
        if(event.keyCode === 13){
            this.playLink(event.target.value)
            this.setState({linkInput: ""});
        }
    }

    renderUploadPanel(){
        let item = this.state.playlist.selected;
        if(!item) return (<div></div>)
        return (
            <div>
                <div className="content-item">
                    <span className="content-title tip">视频: </span>
                    <span className="content-value">{item.name}</span>
                </div>
                <div className="content-item">
                    <span className="content-title tip">截取: </span>
                    <span className="content-value">
                        <span>{ formatTime(this.state.cutStartTime) }</span>
                        <span> / </span>
                        <span>{ formatTime(this.state.cutEndTime) }</span>
                    </span>
                </div>
                <div className="content-item">
                    <span className="content-title tip">UDB: </span>
                    <span className="content-value">
                        <input type="text" name="udb" value={ this.state.udb }/>
                    </span>
                </div>
                <div className="content-item">
                    <span className="content-title tip">专区: </span>
                    <span className="content-value">
                        <input type="text" name="channel" onChange={this.handleChannelChange.bind(this)} defaultValue={this.state.channel}/>
                    </span>
                </div>
                <div className="content-item">
                    <span className="content-title tip">标题: </span>
                    <span className="content-value">
                        <input type="text" name="title" onChange={this.handleTitleChange.bind(this)} defaultValue={this.state.title}/>
                    </span>
                </div>
                <div className="content-item">
                    <span className="content-title tip">标签: </span>
                    <span className="content-value">
                        <input type="text" name="tags" onChange={this.handleTagsChannelChange.bind(this)} defaultValue={this.state.tags}/>
                    </span>
                </div>
            </div>
        )
    }

    renderPlayList(){
        let playlist = this.state.playlist;
        return playlist.entries.map((entry, index) => {
            const itemClassName = classnames({
                'playlist-entry': true,
                'odd': index % 2,
                'selected': playlist.selected === entry,
            });
            return (
                <div onDoubleClick={ playlist.select.bind(playlist,entry.id) } className={itemClassName}  data-index={ index } data-id={ entry.id }>
                    <span> {entry.name} </span>
                    <span className="status"></span>
                </div>
            )
        })
    }
    
	render() {
        let playActive = this.state.play  ? "ion-pause" : "ion-play" ;
        let playModeActive = this.state.loop  ? "actived" : "";
        let playlistActive = this.state.showPlaylist  ? "actived" : "";
        let uploadPanelActive = this.state.showUploadPanel  ? "actived" : "";
        let uploadDisable = this.state.uploading  ? "disabled" : "";
        let fullScreenActive = this.state.isFullscreen  ?  "ion-arrow-shrink" : "ion-arrow-expand";
        let waiting = this.state.waiting  ?  "video-waiting" : "";
		return (
			<div className="">
                <div id="splash"></div>
                <video id="player" className="hidden"></video>
                <div id="video-error" className={`alert alert-error`}></div>
                <div className={`video-loading-spinner ${waiting}`}></div>
                <div id="overlay">
                    <div id="upload-panel" className={ uploadPanelActive }>
                        <div className="header">
                            上传视频
                            <span onClick={this.setUploadPanelState.bind(this, false)} className="js-icon ion-android-close close-button "></span>
                        </div>
                        <div id="upload-panel-content">
                            { this.renderUploadPanel() }
                        </div>
                        <div onClick={this.uploadVideo.bind(this)} id="upload-panel-handle" className={`playlist-handle button bottom ${uploadDisable}`}>
                            { this.state.uploading ? "上传中" : "上传"}
                        </div>
                    </div>
                    <div id="popup" className={ playlistActive }>
                        <div id="playlist-popup">
                            <div className="header">
                                播放记录
                                <span onClick={this.setPlaylistState.bind(this, false)} className="js-icon ion-android-close close-button"></span>
                            </div>
                            <div id="add-link">
                                <input type="text" onChange={this.handleAddLinkInputChange.bind(this)} value={this.state.linkInput} onKeyUp={this.handleKeyupByAddLink.bind(this)} placeholder="URL"/>
                            </div>
                            <div id="playlist-entries">
                                { this.renderPlayList() }
                            </div>
                            <div id="playlist-add-media" className="playlist-handle bottom">
                                <span onClick={ this.showVideoDialog.bind(this) } className="mega-ion ion-plus handle-button add-button"></span>
                                <span onClick={ this.clearPlaylist.bind(this) } className="mega-ion ion-trash-a handle-button remove-button"></span>
                            </div>
                        </div>
                    </div>
                    <div id="titlebar"></div>
                    <div id="idle" 
                        onDoubleClick={ this.onFullScreenToggle.bind(this) } 
                        onClick={ this.handleClickEvent.bind(this) } 
                        onContextMenu={ this.handleContextMenuList.bind(this) }
                    ></div>
                    <div id="controls">
                        <div id="controls-timeline" data-item="controls-move">
                            <div className="controls-cut-timeline">
                                <div className="controls-cut-start"></div>
                                <div className="controls-cut-end"></div>
                            </div>
                            <div id="controls-timeline-tooltip"></div>
                            <div id="controls-timeline-preview">
                                <video id="preview"></video>
                            </div>
                            <div id="controls-timeline-position"  data-item="controls-move"></div>
                        </div>
                        <div id="controls-main">
                            <div id="controls-play" onClick={ this.onPlayToggle.bind(this) }>
                                <span className={`js-icon mega-ion ${playActive}`}></span>
                            </div>
                            {/*<div id="controls-repeat">
                                                            <span className="js-icon mega-ion ion-ios-infinite"></span>
                                                        </div>*/}
                            {/*<div id="controls-volume" className="hidden-slider">*/}
                            <div id="controls-volume" className="">
                                <span className="mega-ion ion-volume-medium"></span>
                                <input type="range" id="controls-volume-slider" className="slider" />
                            </div>
                           {/* <div id="controls-pbrate" className="hidden-slider">
                                                           <span className="mega-ion ion-speedometer"></span>
                                                           <input type="range" id="controls-pbrate-slider" className="slider" /></div>*/}
                            <div id="controls-time" className="center">
                                <span id="controls-time-current">‒‒:‒‒</span>
                                <span id="controls-time-separator">/</span>
                                <span id="controls-time-total">‒‒:‒‒</span>
                            </div>

                            <div id="controls-screenshot" onClick={ this.setCurrCutTime.bind(this, "start") }>
                                <span title="截取开始时间" className="js-icon mega-ion ion-ios-skipbackward"></span>
                            </div>

                            <div id="controls-cut" className="center">
                                {/*<span className="tip">截取: </span>*/}
                                <span onWheel={ this.handleWheel.bind(this, "cutStartTime") }>{ formatTime(this.state.cutStartTime) }</span>
                                <span> / </span>
                                <span onWheel={ this.handleWheel.bind(this, "cutEndTime") }>{ formatTime(this.state.cutEndTime) }</span>
                            </div>
                            
                             <div id="controls-screenshot" onClick={ this.setCurrCutTime.bind(this, "end") }>
                                <span title="截取开始时间" className="js-icon mega-ion ion-ios-skipforward"></span>
                            </div>

                            <div onClick={ this.setPlayMode.bind(this) } id="controls-repeat">
                                <span  title="播放模式" className={ `js-icon mega-ion ion-android-sync ${playModeActive}` }></span>
                            </div>
                            
                            <div id="controls-screenshot" onClick={ this.screenshot.bind(this) }>
                                <span title="截图" className="js-icon mega-ion ion-aperture"></span>
                            </div>

                            <div id="controls-upload" onClick={ this.popUploadPanel.bind(this) }>
                                <span title="上传" className={`js-icon mega-ion ion-arrow-up-a ${uploadPanelActive}`}></span>
                            </div>
                            
                            <div id="controls-name" className="center">
                               
                            </div>
                        </div>
                        <div className="right controls-secondary">
                            <div onClick={ this.popPlayList.bind(this) } id="controls-playlist">
                                <span className="button">
                                    <span className={ `js-icon mega-ion ion-navicon ${playlistActive}` }></span>
                                </span>
                            </div>
                            {/*<div id="player-downloadspeed"></div>
                                                        <div id="controls-playlist">
                                                            <span className="button">
                                                                <span className="js-icon mega-ion ion-navicon"></span>
                                                            </span>
                                                        </div>
                                                        <div id="controls-chromecast">
                                                            <span className="button">
                                                                <span className="chromecast"></span>
                                                            </span>
                                                        </div>*/}
                            <div id="controls-fullscreen" onClick={ this.onFullScreenToggle.bind(this) }>
                                <span className="button">
                                    <span className={`js-icon mega-ion ${fullScreenActive}`}></span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
		);
	}

}

export default PlayPage;
