const path = require('path');
const ipc = require('electron').ipcRenderer
import socket from '../backend/socket';

import React, { Component, PropTypes } from 'react';
import Select from 'react-select';
import Lang from '../backend/language';
import util from '../utils/util';

const channel = "selected-save-file-path-directory";

class SettingPage extends Component {
    constructor(props) {
        super(props);
        this.state = {
            fileSavePath: "",
            forward: 60,
            backward: 0,
            autoPlay: 0,
            autoUpload: 0,
            activeIndex: 0,
            updateStatus: "applying",
            locale: {
                label: "语言",
                value: "zh-CN",
            }
        };
    }

    componentDidMount () {
        var self = this;
        ipc.removeAllListeners(channel).on(channel, this.setFileSavePath.bind(this));
        //ipc.on(channel, this.setFileSavePath.bind(this));
        util.getRemoteSettingPath(function(value){
            self.setState({fileSavePath: value})
        });
        util.getRemoteSetting("forward", function(value){
            if(value !== null) self.setState({forward: value})
        });
        util.getRemoteSetting("backward", function(value){
            if(value !== null) self.setState({backward: value})
        });
        util.getRemoteSetting("autoPlay", function(value){
            if(value !== null) self.setState({autoPlay: value==1 ? 1 : 0})
        });
        util.getRemoteSetting("autoUpload", function(value){
            if(value !== null) self.setState({autoUpload: value==1 ? 1 : 0})
        });
    }

    setFileSavePath(event, path){
        if(path[0]){
            //util.setRemoteSetting("file-save-path", path[0])
            socket.emit("update-file-save-path", path[0]);
            this.setState({fileSavePath: path[0]});
        }
    }

    handleSelectFileSavePath(filePath){
        console.info("select file save path!")
        ipc.send('open-file-dialog', channel);
    }

    handleSetCutSection(key, event){
        let state = {}
        let value = parseInt(event.target.value);
        if(value > 300){
            alert("设置的值不能大于300")
            value = this.state[key]
        }else if (value < 0){
            alert("设置的值不能小于0")
            value = this.state[key]
        }
        state[key] = value
        this.setState(state);
    }

    handleSaveSetting(list){
        let self = this;
        list.map((name, index) => {
            if(self.state.hasOwnProperty(name)){
                util.setRemoteSetting(name, self.state[name])
            }
        })
    }

    handleCheckSetting(key, event){
        let state = {}
        let value = event.target.checked ? 1 : 0;
        state[key] = value
        this.setState(state);
        util.setRemoteSetting(key, value)
    }

    render() {
        const { activeIndex, updateStatus, locale } = this.state;
        const items = [
            { name: 'setting',   label: "设置" },
        ];
        const links = items.map((item, index) => {
            return (<li key={ index }
                        className={ activeIndex === index ? 'active' : '' }
                    ><a>{ item.label }</a></li>);
        });
        let updateText;
        if (updateStatus === 'checking') {
            updateText = Lang.get('settings.checking_update');
        } else if (updateStatus === 'downloading') {
            updateText = Lang.get('settings.downloading_update');
        } else if (updateStatus === 'applying') {
            updateText = Lang.get('settings.applying_update');
        } else {
            updateText = Lang.get('settings.check_update');
        }
        return (
            <div className="settings-container">
                <div className="settings">
                    <ul className="links">
                        { links }
                    </ul>
                    <div className="contents">
                        <section id="">
                            <span className="section-title inline">截取快捷键</span>
                            <kbd><kbd>ctrl</kbd> + <kbd>shift</kbd> + <kbd>x</kbd> </kbd>
                        </section>
                        <section id="">
                            <span className="section-title inline">截取后自动播放</span>
                            <input type="checkbox" onChange={this.handleCheckSetting.bind(this, "autoPlay")} checked={this.state.autoPlay} name="autoPlay"/> 
                        </section>
                        <section id="">
                            <span className="section-title inline">截取后自动上传</span>
                            <input type="checkbox" onChange={this.handleCheckSetting.bind(this, "autoUpload")} checked={this.state.autoUpload} name="autoUpload"/> (这个功能现在还有很多问题，尽量不要用)
                        </section>
                        <section id="">
                            <span className="section-title inline">截取区间</span>
                            <input type="text" className="short" name="forward" onChange={this.handleSetCutSection.bind(this, "forward")} value={this.state.forward}/> 
                                - 
                            <input type="text" className="short" name="backward" onChange={this.handleSetCutSection.bind(this, "backward")}  value={this.state.backward}/> 
                           <button onClick={this.handleSaveSetting.bind(this, ['forward', 'backward'])}>
                               保存
                           </button>
                        </section>
                        <section id="">
                            <span className="section-title inline">文件保存路径</span>
                            <input type="text" className="input-file" disabled value={this.state.fileSavePath} name="fileSavePath"/> 
                            <button onClick={this.handleSelectFileSavePath.bind(this, this.state.fileSavePath)}>
                                选择路径
                            </button>
                        </section>
                    </div>
                </div>
            </div>
        );
    }
}

SettingPage.propTypes = {
    manifest: PropTypes.object,
};

export default SettingPage;
