const electron = require('electron');
const shell = electron.shell;
const clipboard = electron.clipboard;
const ipcRenderer = electron.ipcRenderer;

import React, { Component, PropTypes } from 'react';
import path from 'path';
import moment from 'moment';
import fetch from 'node-fetch';
import filesize from 'filesize';
import config from '../../server/config';
import util from '../utils/util';
import live from '../backend/live';

class LiveItemPage extends Component {

    constructor(props) {
        super(props);
        this.state = {
            //matchs: [],
            match_pid: 0,
            copyMessage: "",
            forward: 30,
            backward: 0,
        };
        if(props.socket){
            props.socket.off("cut-result").on("cut-result", this.cutResult.bind(this))  //这里会重复绑定
        }
    }

    componentDidMount() {
        let self = this;
        util.getRemoteSetting("forward", function(value){
            self.setState({forward: value !== null ? value : 30})
        });
        util.getRemoteSetting("backward", function(value){
            self.setState({backward: value !== null ? value : 0})
        });
        ipcRenderer.removeAllListeners("cut").on("cut", self.handleCut.bind(self));
        //this.getMatchList();
    }

    /*getMatchList(){
        let self = this;
        fetch(config.FRONTEND_HOST + '?r=match/getlist')
        .then(function(res) {
            return res.json();
        }).then(function(data) {
            if(data.hasOwnProperty("code") && data.code==1){
                self.setState({
                    matchs: data.result.data,
                });
            }
        });
    }*/

    /*setMatchPid(match_pid){
        this.setState({match_pid: match_pid});
    }
*/
    handleCopyUrl(url){
        let slef = this;
        clipboard.writeText(url);
        slef.setState({copyMessage: "复制成功!"});
        setTimeout(function(){
            slef.setState({copyMessage: ""});
        }, 3000);
    }

    handleOpenUrl(url){
        shell.openExternal(url)
    }

    handleOpenFile(file){
        shell.showItemInFolder(file)
    }

    handlePlayFile(file, video_id){
        //shell.openItem(file)
        ipcRenderer.send('open-play-window', {
            liveItem: this.props.item,
            video_id: video_id,
            title: file,
            file: file,
        });
    }

    handleCut(){
        let self = this;
        console.info(self.props.item.id, self.state.forward, self.state.backward)
        self.handleEmitEvent("cut-record", {
            id: self.props.item.id, 
            options:{
                forward: self.state.forward, 
                backward : self.state.backward
            } 
        })
    }

    cutResult(result){
        let self = this;
        if(result.code == 1){
            util.getRemoteSetting("autoUpload", function(value){
                if(value == 1){
                    self.handleUpload({id: result.video_id, filename: path.basename(result.file)})
                }
            });
            util.getRemoteSetting("autoPlay", function(value){
                if(value == 1){
                    self.handlePlayFile(result.file, result.video_id)
                }
            });

        }else{
            alert(result.message)
        }

    }

    handleEmitEvent(event, data){
        let socket = this.props.socket;
        if(socket && typeof socket.emit == "function"){
            socket.emit(event, data);
        }
    }
    handleEmitEventCallback(event, data, callback){
        let socket = this.props.socket;
        if(socket && typeof socket.emit == "function"){
            socket.emit(event, data, callback);
        }
    }

    /*handleRelateMatch(){
        let match_pid = document.getElementById("match_pid").value;
        if(match_pid && match_pid != this.state.match_pid){
            this.setMatchPid(match_pid);
        }
    }*/

    handleUpload(file){
        let self = this;
        let form = {
            live_id: self.props.item.id, 
            video_id: file.id,
            filename: file.filename,
            is_cut: 0,
            channel: "lol",
            udb: util.getUDB(),
            yyuid: util.getYYUID(),
        }
        live.post(process.env.APP_PROXY_URL + '/upload', form, function(res){
            alert(res.message)
        })
        /*let form = {
            id: self.props.item.id, 
            file_id: file.id,
            udb: util.getUDB(),
        }
        self.handleEmitEventCallback("upload-video", data, function(message){
            if(typeof message  == "string"){
                alert(message);
            }else{
                alert("上传失败");
                console.info(message)
            }
        })*/
    }

    renderDoneFile(files, title){
        let self = this;
        let data = [];
        return Object.keys(files).map((id, index) => {
            let file = files[id];
            let button = "";
            if(file.status == 1){
                button = <button disabled>已上传</button> 
            }else{
                button = <button onClick={ self.handleUpload.bind(this, file) }>上传</button> 
            }
            return (
                <section>
                    <span className="label-title">{index == 0 ? title : ""}</span>
                    <span className="">
                        <input type="text" className="input-file" disabled value={file.title || file.filename}/>
                        <button onClick={ self.handleOpenFile.bind(this, file.file) }>打开</button> 
                        <button onClick={ self.handlePlayFile.bind(this, file.file, id) }>编辑</button> 
                        { button }
                    </span>
                </section>
            );
        });
    }

    /*renderMatchList(){
        let self = this;
        let options = this.state.matchs.map((item, index) => {
            return (
                <option value={ item.match_pid } >{ item.title }</option>
            )
        });
        return (
            <select id="match_pid" onChange={ this.handleRelateMatch.bind(this) }>
                <option value=""> --请选择比赛进行关联直播-- </option>
                { options }
            </select>
        );
    }*/

    renderVideoList(){
        return (
            <div className="video-list-container">
                {/*<ul id="files">
                                    <div className="file">
                                        <div className="icon">
                                            <img src="./assets/images/icon.png" />
                                        </div>
                                        <div className="name">about.html</div>
                                    </div>
                                    <div className="file">
                                        <div className="icon">
                                            <video>
                                                <source src="D:/hot-data/ffmpeg/4527567d49604f124a68d1e3851a3116.mp4" />
                                            </video>
                                        </div>
                                        <div className="name">4527567d49604f124a68d1e3851a3116.mp4</div>
                                    </div>
                                </ul>*/}
            </div>
        );
    }

	render() {
        const self = this;
        const item = this.props.item;
        const endTime = item.updateTime || new Date().getTime();
        const size = filesize(item.size, {round: 2}); 
        const startTimeFormat = moment(item.createTime).format("YYYY-MM-DD HH:mm:ss");
        const endTimeFormat = moment(endTime).format("YYYY-MM-DD HH:mm:ss");
        const diff = endTime - item.createTime;
        const second = diff > 60*1000 ? (moment.duration(diff).minutes() + "分钟") : (moment.duration(diff).seconds() + "秒");
        let updateStatus = "";
        if(self.props.active && item.status.code == 1){
            updateStatus = (
                <span>
                    <button onClick={ self.handleEmitEvent.bind(self, "cut-record", {id: item.id, options:{forward: this.state.forward, backward : this.state.backward} }) }>截取</button>
                    <button onClick={ self.handleEmitEvent.bind(this, "close-record", {id: item.id }) }>结束录制</button>
                </span>
            );
        }

		return (
			<div className="active-item">
                <div className="title">
                    <span>{item.title}</span>
                </div>
                <section>
                    <span className="label-title">开始时间</span>
                    <span className="label-content"><code>{startTimeFormat}</code></span>
                    <span className="label-title">结束时间</span>
                    <span className="label-content"><code>{endTimeFormat}</code></span>
                </section>
                <section>
                    <span className="label-title">已经录制大小</span>
                    <span className="label-content"><code>{size}</code></span>
                    <span className="label-title">已经录制时间</span>
                    <span className="label-content"><code>{second} </code></span>
                </section>
                {/*<section>
                                    <span className="label-title">关联比赛</span>
                                    <span className="">
                                        { self.renderMatchList() }
                                    </span>
                                </section>*/}
                { self.renderVideoList() }
                <section>
                    <span className="label-title">播放地址</span>
                    <span className="">
                        <input type="text" className="input-file" disabled value={item.url}/>
                        <button onClick={ self.handleOpenUrl.bind(this, item.url) }>打开</button>
                        <button onClick={ self.handleCopyUrl.bind(this, item.url) }>复制</button>
                        <span className="text-success">{this.state.copyMessage}</span> 
                    </span>
                </section>
                
                { self.renderDoneFile(item.files, "已经录制文件") } 
                
                { self.renderDoneFile(item.cutFiles, "已经截取文件") } 
                    
                <section>
                    <span className="label-title">任务状态</span>
                    <span className="status-code">
                        <button className={"disabled " + item.status.label}>{item.status.name}</button>
                        {updateStatus}
                    </span>
                </section>
            </div>
		);
	}

}

LiveItemPage.propTypes = {
    item: PropTypes.object,
    socket: PropTypes.object,
    active: PropTypes.bool,
};

export default LiveItemPage;
