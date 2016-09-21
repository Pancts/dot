const electron = require('electron');
const shell = electron.shell;
const clipboard = electron.clipboard;
const ipcRenderer = electron.ipcRenderer;
import React, { Component, PropTypes } from 'react';
import moment from 'moment';
import filesize from 'filesize';
import config from '../../server/config';
import {SplitButton, MenuItem} from 'react-bootstrap';
import live from '../backend/live';

class MatchItemPage extends Component {

    constructor(props) {
        super(props);
        this.state = {
            item: null,
        };
        this.getMatchInfo(this.props.match_pid);
    }

    componentDidMount() {

    }

    componentWillReceiveProps(nextProps){
        this.getMatchInfo(nextProps.match_pid);
    }

    getMatchInfo(match_pid){
        match_pid = match_pid || this.props.match_pid;
        let self = this;
        fetch(config.FRONTEND_HOST + '?r=match/getmatchinfo&no_cache=1&match_pid='+match_pid)
        .then(function(res) {
            return res.json();
        }).then(function(data) {
            if(data.hasOwnProperty("code") && data.code==1){
                self.setState({
                    item: data.result.data,
                });
            }
        });
    }

    getStatusArr(){
        return {
            0: {name: "未开始", className:"", bsStyle:"default"},
            1: {name: "进行中", className:" label-info", bsStyle:"info"},
            9: {name: "已结束", className:" label-success", bsStyle:"success"},
            "-1": {name: "暂停中", className:" label-important", bsStyle:"warning"},
            "-9": {name: "已取消", className:" label-inverse", bsStyle:"danger"},
        }
    }

    getStatus(status){
        let statusArr = this.getStatusArr();
        if(statusArr.hasOwnProperty(status)){
            return statusArr[status];
        }else{
            return {};
        }

    }

    getResultArr(){
        return {
            0: {name: "  --  ", className:"", bsStyle:"default"},
            1: {name: "主队胜", className:" label-info", bsStyle:"info"},
            2: {name: "客队胜", className:" label-info", bsStyle:"info"},
        }
    }

    getResult(result){
        let resultArr = this.getResultArr();
        if(resultArr.hasOwnProperty(result)){
            return resultArr[result];
        }else{
            return {};
        }

    }

    handlerOpenLive(option){
        ipcRenderer.send("open-live-window", option);
    }

    update(data, callback){
        let self = this;
        live.sendMessage(data, function(error, message, data){
            if(error){
                alert(message);
            }else{
                if(callback){
                    callback(data);
                }else{
                    self.getMatchInfo();
                }
            }
        });
    }

    handlerSelectStatus(item, key, event){
        let self = this;
        self.update({
            r: "appapi/update",
            match_id: item.match_id,
            status: key,
        });
    }

    handlerSelectResult(item, key, event){
        let self = this;
        self.update({
            r: "appapi/update",
            match_id: item.match_id,
            result: key,
        });
    }

    handleOpenUrl(url){
        shell.openExternal(url)
    }

    handleCopyUrl(url){
        let slef = this;
        clipboard.writeText(url);
        alert(`复制成功: ${url}`)
    }

    renderMatchList(list){
        let self = this;
        return list.map((item, index) => {
            let button = "";
            let status = self.getStatus(item.status);
            let liveUrl = config.Live_HOST + "?match_pid=" + self.state.item.match_pid + "&match_id=" + item.match_id;
            return (
                <section>
                <span className="label-title">
                    <code>{item.match_id}</code>. 
                    <span onClick={ self.handleOpenUrl.bind(this, liveUrl) }>第 {index+1} 场</span>
                </span>
                <span className="">
                    <input type="text" className="input-file" disabled value={item.title}/>
                    {self.renderStatusButton(item)}
                    {self.renderResultButton(item)}
                    <button onClick={self.handlerOpenLive.bind(self, item)}>直播</button> 
                    <a className="label label-success" onClick={ self.handleCopyUrl.bind(this, liveUrl) }>复制直播间地址</a>
                </span>
                </section>
            );
        });
    }

    renderStatusButton(macthItem) {
        let self = this;
        let statusArr = self.getStatusArr();
        let activeStatus = self.getStatus(macthItem.status);
        let options = Object.keys(statusArr).map((i) => {
            let item = self.getStatus(i);
            return (<MenuItem eventKey={i}>{ item.name }</MenuItem>)
        })
        return (
            <SplitButton onSelect={this.handlerSelectStatus.bind(this, macthItem)} bsStyle={activeStatus.bsStyle} title={activeStatus.name} id={`dropdown-basic-${status}`}>
                {options}
            </SplitButton>
        );
    }

    renderResultButton(macthItem) {
        let self = this;
        let resultArr = self.getResultArr();
        let activeResult = self.getResult(macthItem.result);
        let options = Object.keys(resultArr).map((i) => {
            let item = self.getResult(i);
            return (<MenuItem eventKey={i}>{ item.name }</MenuItem>)
        })
        return (
            <SplitButton onSelect={this.handlerSelectResult.bind(this, macthItem)} bsStyle={activeResult.bsStyle} title={activeResult.name} id={`dropdown-basic-${status}`}>
                {options}
            </SplitButton>
        );
    }

	render() {
        const self = this;
        const {item} = this.state;
        if(!item) return (<div></div>);

		return (
			<div className="active-item">
                <div className="title">
                    <span>
                        <img src={item.home_team_info.logo}/>
                        {item.home_team_info.team_name}
                        &nbsp;&nbsp;&nbsp;&nbsp;VS&nbsp;&nbsp;&nbsp;&nbsp; 
                        {item.guest_team_info.team_name}
                        <img src={item.guest_team_info.logo}/>
                    </span>
                </div>
                <div className="title">
                    <span>
                        <code>{item.home_team_win}</code>
                        &nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;&nbsp;&nbsp; 
                        <code>{item.guest_team_win}</code>
                    </span>
                </div>
                <section>
                    <span className="label-title">赛事ID</span>
                    <span className="label-content"><code>{item.match_pid}</code></span>
                    <span className="label-title">赛事</span>
                    <span className="label-content">{item.match_info.match_full_name || item.match_info.match_name}</span>
                </section>
                <section>
                    <span className="label-title">比赛时间</span>
                    <span className="label-content"><code>{item.start_time}</code> - <code>{item.end_time}</code></span>
                </section>

                { self.renderMatchList(item.match_list) } 

            </div>
		);
	}

}

MatchItemPage.propTypes = {
    match_pid: PropTypes.string,
};

export default MatchItemPage;
