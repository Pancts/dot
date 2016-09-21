import React, { Component, PropTypes } from 'react';
import electron, { shell, remote } from 'electron';
const Menu = remote.Menu
const MenuItem = remote.MenuItem
import fetch from 'node-fetch';
import config from '../../server/config';
import classnames from 'classnames';
import $ from 'jquery';
import util from "../utils/util";


class VideoListPage extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            list: [],
            title: "",
            active: 0,
            activeItem: null,
        };
        this.udb = util.getUDB();
        this.yyuid = util.getYYUID();
        this.matchTime = props.matchTime;
    }

    componentDidMount() {
        this.getUploadList();
        this.timer();
    }

    timer(){
        setInterval(this.getUploadList.bind(this), 2 * 1000)
    }

    getUploadList(){
        let self = this;
        fetch(config.MANAGER_HOST + `?r=appapi/getuploadlist&yyuid=`+self.yyuid)
        .then(function(res) {
            return res.json();
        }).then(function(json) {
            if(json.hasOwnProperty("code") && json.code==1){
                let activeItem = self.state.activeItem;
                if(activeItem != null){
                    json.result.map((item, index)=>{
                        if(item.vid == activeItem.vid){
                            activeItem = item;
                        }
                    })
                }
                self.setState({list: json.result, activeItem: activeItem});
            }
        });
    }


    shouldComponentUpdate(nextProps, nextState){
        this.matchTime = nextProps.matchTime;
        return this.state !== nextState
    }

    handlerSelectVideo(item, event){
        this.setState({
            active: item.vid, 
            activeItem: item, 
            title: `##TIME=${util.formatTime(this.matchTime)}##${item.video_title}` 
        })
    }

    handlerPlayVideo(vid){
        let url = `http://v.huya.com/play/${vid}.html`;
        shell.openExternal(url)
    }


    handleChange(event) {
        this.setState({title: event.target.value});
    }

    renderInfo(){
        let item = this.state.activeItem;
        if(item == null) return "";
        let statusButton, submitButton, playButton = ""; 
        if(item.can_play == 1 ){
            submitButton = <button onClick={this.props.handlerSendVideo.bind(this.props.parent, item)} className="btn btn-info pull-right">插入</button>;
            statusButton = <span className="label label-large label-success">已转码</span>;
            playButton = <a onClick={this.handlerPlayVideo.bind(this, item.vid)} className="label label-large label-inverse">播放</a>;
        }else{
            submitButton = <button onClick={this.props.handlerSendVideo.bind(this.props.parent, item)} disabled className="btn btn-info pull-right disabled">插入</button>;
            statusButton = <span className="label label-inverse">未转码</span>;
        }
        return (
            <div className="video-info">
                <div className="video-info-id">VID: <code>{item.vid}</code> { statusButton } { playButton } </div>
                <div className="video-info-title"> <textarea ref="textarea" rows="4" id="video-title" value={this.state.title} onChange={this.handleChange.bind(this)}></textarea> </div>
                <div className="video-info-button"> {submitButton} </div>
            </div>
        )
    }
    renderList(list){
        let self = this;
        return list.map((item, index) => {
            let title = item.video_title || item.video_name;
            const classNames = classnames({
                'active': self.state.active == item.vid ? true : false,
            });
            return (
                <div className="video-item">
                    <a className={classNames} title={title} onClick={self.handlerSelectVideo.bind(this, item)} href="#">{ item.vid }. {title} </a>
                </div>
            )
        });
    } 

    render() {
        const {list} = this.state;
        return (
            <div className="resource-video-box">
                <div className="box-title">视频列表 <i onClick={this.getUploadList.bind(this)} className="fa fa-refresh" aria-hidden="true"></i> </div>
                <div className="box">
                    <div className="box-list">
                        { this.renderList(list) }
                    </div>
                </div>
                <div className="box-info">
                    { this.renderInfo() }
                </div>
            </div>
        );
    }

}

VideoListPage.propTypes = {
    parent: PropTypes.object,
    handlerSendVideo: PropTypes.func,
};

export default VideoListPage;
