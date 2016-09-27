const fs = require('fs');
const path = require('path');
const {ipcRenderer, clipboard, remote} = require('electron')
const Menu = remote.Menu
const MenuItem = remote.MenuItem

import React, { Component, PropTypes } from 'react';
import config from '../../server/config';
import live from '../backend/live';
import moment from 'moment';
import drag from 'drag-and-drop-files';
import $ from 'jquery';
import VideoListPage from './VideoListPage';
import GuessPage from './GuessPage';
import RedPacketPage from './RedPacketPage';
import util from '../utils/util';
import EditorPage from './EditorPage';


const channel = "selected-send-image";


class LiveManagerPage extends Component {

    constructor(props) {
        super(props);
        this.state = {
            match_id: 0,
            list: [],
            html: "##TIME=00:00##",
            matchTime: 0,
            fixMatchTime: false,
            formatTime: "",
            activeTab: "video",
        };
        this.imageSavePath = "./";
        this.tabs = {
            video:{
                "title": "视频",
            },
            guess:{
                "title": "竞猜",
            },
            redpacket:{
                "title": "红包",
            }
        }
        ipcRenderer.on(channel, this.handlerSendImage.bind(this));
    }

    componentDidMount() {
        let self = this;
        ipcRenderer.on("send-live-mid", function(event, id){
            self.getMatchMessage(id);
        });
        ipcRenderer.on("live-window-resize", function(event, options){
            self.fixHeight(options[1]);
        });
        self.initDrapWindow()
        self.initImageSavePath()
        self.initContextMenu()
        self.initMatchTime()
    }

    componentDidUpdate(prevProps, prevState){
        if(this.state.list !== prevState.list){
            this.scrollBottom();
        }
    }

    initMatchTime(){
        let self = this;
        setInterval(function(){
            if(self.state.fixMatchTime == false){
                self.setState({matchTime: self.state.matchTime + 1});
            }
        }, 1000)
    }

    initDrapWindow(){
        let self = this;
        drag($('.live-content')[0], function(files){
            for (var i = 0; i < files.length; i++) {
                self.handlerSendImage(null, [files[i].path])
            }
        })
        drag($('.live-form')[0], function(files){
            for (var i = 0; i < files.length; i++) {
                self.imageToInput(files[i].path)
            }
        })
    }

    initImageSavePath(){
        let self = this;
        util.getDataPath(function(p){
            let imageSavePath = path.join(p, "screencapture");
            util.mkdirsSync(imageSavePath)
            self.imageSavePath = imageSavePath;
        })
    }

    fixHeight(winHeight){
        $('.live-list').height(winHeight - 200);
        $('.resource-video-box .box').height(winHeight - 200);
        $('.resource-guess-box .box').height(winHeight - 360);
        $('.resource-redpacket-box .box').height(winHeight - 280);
    }

    getMatchMessage(id){
        let self = this;
        this.setState({match_id: id});
        live.get(config.FRONTEND_HOST + '?r=match/getmatchmessage&create_time=1&match_id='+id, function(err, message, data){
            if(data.hasOwnProperty("code") && data.code==1){
                self.setState({
                    list: data.result.data,
                });
            }
        })  
    }

    handlerSendMessage(){
        let self = this;
        //let message = document.getElementById("message").value;
        let message = this.state.html;
        if(message.replace(/##TIME=[^#]*##\s*/, "")){
            live.sendMessage({
                r: "appapi/sendmessage",
                match_id: this.state.match_id,
                message: message,
            }, function(error, message, data){
                if(error){
                    alert(message);
                }else{
                    self.appendMessage(data)
                    self.clearInput();
                }
            });
        }
    }

    handlerSendImage(event, path){
        let self = this;
        path.map((image, index) => {
            live.sendMessage({
                r: "appapi/sendimage",
                match_id: self.state.match_id,
                screenshot: fs.createReadStream(image),
            }, function(error, message, data){
                if(error){
                    alert(message);
                }else{
                    self.appendMessage(data)
                }
            });
        })
    }

    handlerSelectImage(){
        ipcRenderer.send('open-file-dialog-image', channel);
    }

    handlerMatchTime(){
        let html = this.state.html.replace(/##TIME=(.*)##/, "");
        this.setState({"html": `##TIME=${util.formatTime(this.state.matchTime)}##${html}`})
    }

    appendMessage(item){
        let list = this.state.list
        list.push(item);
        this.setState({list: list});
        this.scrollBottom();
    }

    removeMessage(id){
        let list = this.state.list
        list.forEach(function(item, index) {
            if(item.message_id == id){
                delete list[index];
            }
        });
        this.setState({list: list});
    }

    scrollBottom(){
        $(".live-list").animate({scrollTop: $(".live-list")[0].scrollHeight}, 100);
    }

    clearInput(){
        //this.lastHtml = this.lastHtml === " " ? "" : " ";
        //this.setState({"html": this.lastHtml})
        this.setState({"html": `##TIME=${util.formatTime(this.state.matchTime)}##\n`})
        //document.getElementById("message").value = "";
    }

    handlerSendVideo(video){
        let self = this;
        if(!video) return alert("请选择一个视频");
        if(video.can_play!=1) return alert("视频还没有转码，请等待转码完成后再操作");
        let title = document.getElementById("video-title").value;
        live.sendMessage({
            r: "appapi/sendvideo",
            match_id: self.state.match_id,
            vid: video.vid,
            title: title,
        }, function(error, message, data){
            if(error){
                alert(message);
            }else{
                self.appendMessage(data)
            }
        });
    }

    handlerRemoveMessage(id){
        let self = this;
        if(!confirm("你确定要删除该信息吗?")){
            return false;
        }
        live.sendMessage({
            r: "appapi/delete",
            message_id: id,
        }, function(error, message, data){
            if(error){
                alert(message);
            }else{
                self.removeMessage(id)
            }
        });
    }

    handlerKeyUp(event){
        if(!event.shiftKey && event.keyCode == 13){
            this.handlerSendMessage();
            return event.preventDefault(); 
        }
    }

    pasteContent(event){
        let self = this;
        let clipboard = require("../backend/clipboard")
        let md5 = util.md5(Math.random().toString() + new Date().getTime());
        let file = path.join(this.imageSavePath, md5 + ".jpg");
        clipboard.getImageFromClipboard(event, file, function(err){
            if(err) console.error(err)
            else self.imageToInput(file)
        })
    }

    imageToInput(file){
        let self = this;
        live.sendMessage({
            r: "appapi/image",
            screenshot: fs.createReadStream(file),
        }, function(error, message, data){
            if(error) console.error(message) 
            else{
                self.setState({html: self.state.html + "<img src='"+data+"'/>"})
            }
        });
    }

    onEditorChange(event){
        this.setState({html: event.target.value});
    }

    initContextMenu(){
        let self = this;
        let menuItems = {};
        menuItems.play = new MenuItem({ 
            label: '更新时间', 
            click: self.handlerMatchTime.bind(self),
        });
        let menu = new Menu();
        Object.keys(menuItems).map((name, index) => {
            menu.append(menuItems[name])
        })
        self.menu = menu;
        self.menuItems = menuItems;
    }

    handleContextMenu(event){
        if(this.menu !== null){
            this.menu.popup(remote.getCurrentWindow())
            this.showMenu = true;
        }
    }

    handleFixMatchTime(event){
        this.setState({fixMatchTime: true});
    }

    handleInputMatchTime(event){
        this.setState({formatTime: event.target.value})
    }

    handleUpdateMatchTime(event){
        this.setState({fixMatchTime: false, matchTime: util.formatToTime(event.target.value), formatTime: ""});
    }

    matchTimeInput(input){
        if (input != null && this.state.fixMatchTime == true) {
            input.getDOMNode().focus();
        }
    }

    renderList(list){
        let self = this;
        return list.map((item, index) => {
            let time = moment(item.create_time * 1000).format("YYYY-MM-DD HH:mm:ss");
            let screenshot = item.screenshot ? <img src={item.screenshot}/> : "";
            let video = item.video_url ? (<video controls preload="meta"><source src={item.video_url} type="video/mp4"/></video>) : "";
            let content = item.content + item.title;
            return (
                <div className="live-item">
                    <div className="pre">
                        <button type="button"  className="close" onClick={this.handlerRemoveMessage.bind(this, item.message_id)}>×</button>
                        {/*<div className="live-time text-center"><code>{time}</code></div>*/}
                        <div className="live-time text-center">
                            {time} [<code>{item.match_time}</code>]
                        </div>
                        <div className="live-content"  dangerouslySetInnerHTML={{__html: content}}></div>
                        <div className="live-screenshot">{screenshot}</div>
                        <div className="live-video">{video}</div>
                    </div>
                </div>
            )
        });
    }

    renderInput(){
        return (
            <div className="live-input">
                <EditorPage 
                    className="editor" 
                    html={this.state.html} 
                    onChange={this.onEditorChange.bind(this)} 
                    onPaste={ this.pasteContent.bind(this) }
                    onContextMenu={ this.handleContextMenu.bind(this) }
                />
                {/*<textarea rows="6" id="message" onPaste={ this.pasteContent.bind(this) }></textarea>*/}
                <button className="btn btn-info" onClick={this.handlerSelectImage.bind(this)}>图片</button>&nbsp;
                <button className="btn btn-info" onClick={this.handlerMatchTime.bind(this)}>更新时间</button>&nbsp;
                <input ref={this.matchTimeInput.bind(this)} className="btn match-time" id="match-time" onChange={this.handleInputMatchTime.bind(this)} onBlur={this.handleUpdateMatchTime.bind(this)} onDoubleClick={this.handleFixMatchTime.bind(this)} disabled={!this.state.fixMatchTime} type="text" value={this.state.formatTime ? this.state.formatTime : util.formatTime(this.state.matchTime)}/>
                <button className="btn btn-info pull-right"  onClick={this.handlerSendMessage.bind(this)}>发送</button>
            </div>
        )
    }

    renderSidebar(){
        let self = this;
        let tabHtml = Object.keys(this.tabs).map((tab)=>{
            let item = self.tabs[tab];
            let active = self.state.activeTab == tab ? "active" : "";
            return <li onClick={((n)=>{self.setState({activeTab:n})}).bind(self, tab)} className={active}><a>{item.title}</a></li>
        })
        return (
            <div className="live-resource">
                <ul className="nav nav-tabs">
                    {tabHtml}
                </ul>
                <div className={this.state.activeTab == 'video' ? 'active' : ''}>
                    <VideoListPage 
                        parent={this} 
                        matchTime={ this.state.matchTime }
                        handlerSendVideo={this.handlerSendVideo}
                    />
                </div>
                <div className={this.state.activeTab == 'guess' ? 'active' : ''}>
                    <GuessPage 
                        matchId={this.state.match_id} 
                    />
                </div>
                <div className={this.state.activeTab == 'redpacket' ? 'active' : ''}>
                    <RedPacketPage 
                        matchId={this.state.match_id} 
                    />
                </div>
            </div>
        )
    }

	render() {
        const {list} = this.state;
		return (
			<div className="live-container">
                { this.renderSidebar() }
                <div className="live-manager">
                    <div className="live-content">
                        <div className="live-list">
                            { this.renderList(list) }
                        </div>
                    </div>
                    <div className="live-form">
                        { this.renderInput() }
                    </div>
                </div>
            </div>
		);
	}

}

LiveManagerPage.propTypes = {

};

export default LiveManagerPage;
