import React, { Component, PropTypes } from 'react';
import electron, { shell, remote } from 'electron';
const Menu = remote.Menu
const MenuItem = remote.MenuItem
import fetch from 'node-fetch';
import config from '../../server/config';
import classnames from 'classnames';
import $ from 'jquery';
import util from "../utils/util";
import live from '../backend/live';

class RedPacketPage extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            type: "random",
            score_max: 200,
            score_min: 200,
            score_single: 100,
            score_count: 100,
            list: [],
        };
        this.match_id = 0;
    }

    componentDidMount() {
        this.timer();
    }

    timer(){
        setInterval(this.getRedpacketInfo.bind(this), 5 * 1000)
    }

    getTypeArr(){
        return {
            "random": {name: "随机积分", className:"label-important"},
            "fixed": {name: "固定积分", className:"label-success"},
        }
    }

    getType(value){
        let arr = this.getTypeArr();
        if(arr.hasOwnProperty(value)){
            return arr[value];
        }else{
            return {};
        }
    }

    getStatusArr(){
        return {
            0: {name: "未开始", className:"label-info", bsStyle:"default"},
            1: {name: "进行中", className:" label-success", bsStyle:"info"},
            9: {name: "已结束", className:" label-inverse", bsStyle:"success"},
        }
    }

    getScore(value){
        let arr = this.getScoreArr();
        if(arr.hasOwnProperty(value)){
            return arr[value];
        }else{
            return {};
        }
    }

    getScoreArr(){
        return {
            10: {name: "10", className:"", bsStyle:"default"},
            20: {name: "20", className:"", bsStyle:"info"},
            50: {name: "50", className:"", bsStyle:"success"},
        }
    }

    getStatus(value){
        let arr = this.getStatusArr();
        if(arr.hasOwnProperty(value)){
            return arr[value];
        }else{
            return {};
        }

    }

    getRedpacketInfo(match_id, callback){
        let self = this;
        if(!callback) callback = (redpacket) => self.setState({list: redpacket})
        live.sendMessage({
            r: "appredpacketapi/list",
            match_id: self.match_id,
        }, function(error, message, data){
            if(error){
                alert(message)
            }else{
                callback(data.data)
            }
        });
    }

    shouldComponentUpdate(nextProps, nextState){
        let bool = this.match_id != nextProps.matchId || this.state !== nextState
        if(this.match_id != nextProps.matchId){
            let self = this;
            this.match_id = nextProps.matchId;
            this.getRedpacketInfo(this.match_id)
        }
        return bool
    }

    sendRedpacket(data, callback){
        data.r = "appredpacketapi/add"
        data.match_id = this.match_id
        live.sendMessage(data, function(error, message, data){
            callback(error ? null : message)
        });
    }

    handlerDeleteRedpacket(redpacket_id){
        let self = this;
        if(!confirm("你确定要删除该信息吗?")){
            return false;
        }
        live.sendMessage({
            r: "appredpacketapi/delete",
            redpacket_id: redpacket_id,
        }, function(error, message, data){
            if(error)alert(message);
            else{
                self.getRedpacketInfo(self.match_id)
            }
        });
    }

    handlerSelectResult(redpacket_id, e){
        let self = this;
        live.sendMessage({
            r: "appredpacketapi/update",
            redpacket_id: redpacket_id,
            result_id: e.target.value,
            status: 9,
        }, function(error, message, data){
            if(error)alert(message);
            else{
                self.getRedpacketInfo(self.match_id)
            }
        });
    }

    handlerUpdateStatus(redpacket_id, e){
        let self = this;
        let data = {
            r: "appredpacketapi/update",
            redpacket_id: redpacket_id,
            status: e.target.value,
        }
        if(data.status == 1) data.start_time = parseInt(new Date().getTime() / 1000)
        if(data.status == 9) data.end_time = parseInt(new Date().getTime() / 1000)
        live.sendMessage(data, function(error, message, data){
            if(error)alert(message);
            else{
                self.getRedpacketInfo(self.match_id)
            }
        });
    }

    handlerSubmitRedpacket(e){
        let self = this;
        let data = {}
        data.title = this.refs.redpacket_title.getDOMNode().value
        data.type = this.refs.redpacket_type.getDOMNode().value
        data.score_count = this.state.score_count
        if(data.type == 'fixed'){
            data.score_single = this.state.score_single
        }else{
            data.score_max = this.state.score_max
        }
        
        self.sendRedpacket(data, function(err){
            if(err) alert(err)
            else{
                self.getRedpacketInfo(self.match_id)
            }
        })
    }

    handlerSelectType(e){
        let type = e.target.value;
        this.setState({type: type});
    }

    handleChange(key, e){
        let data = {}
        let value = parseInt(e.target.value)
        data[key] = value >= 0 && value < 99999 ? value : this.state.value;
        this.setState(data);
    }

    renderListType(item){
        if(item.type == "fixed"){
            return (
                <ul className="redpacket-list-type">
                    <li>
                        <span className="option-title">固定积分</span>
                        <span className="option-value"><code>{item.score_single}</code></span>
                    </li>
                    <li>
                        <span className="option-title">数量</span>
                        <span className="option-value"><code>{item.score_count}</code></span>
                    </li>
                    <li>
                        <span className="option-title">剩余数量</span>
                        <span className="option-value"><code>{item.score_surplus_count}</code></span>
                    </li>
                </ul>
            )
        }else{
            return (
                <ul className="redpacket-list-type">
                    <li>
                        <span className="redpacket-title">最大积分</span>
                        <span className="option-value"><code>{item.score_max}</code></span>
                    </li>
                    <li>
                        <span className="option-title">数量</span>
                        <span className="option-value"><code>{item.score_count}</code></span>
                    </li>
                    <li>
                        <span className="option-title">剩余数量</span>
                        <span className="option-value"><code>{item.score_surplus_count}</code></span>
                    </li>
                </ul>
            )
        }
    }

    renderList(list){
        let self = this;
        return list.map((item, index) => {
            let typeItem = self.getType(item.type)
            let activeStatus = self.getStatus(item.status);
            let statusOption = Object.keys(self.getStatusArr()).map((status) => {
                let statusItem = self.getStatus(status);
                let selected = status == item.status ? "selected" : false;
                return <option selected={selected} value={status}>{statusItem.name}</option>
            })
            return (
                <div className="redpacket-item pre">
                    <button type="button"  className="close" onClick={this.handlerDeleteRedpacket.bind(this, item.redpacket_id)}>×</button>
                    <div className="redpacket-title">
                       {item.title}
                    </div>
                    {this.renderListType(item)}
                    <span className={`label label-type ${typeItem.className}`}>{typeItem.name}</span>
                    <select className={`label label-status ${activeStatus.className}`} onChange={this.handlerUpdateStatus.bind(this, item.redpacket_id)}>{statusOption}</select>
                    <span className="label label-sorce"></span>
                </div>
            )
        });
    }

    renderFormType(type){
        if(type == "fixed"){
            return (
                <div className="redpacket-info-option">
                    <span className="option-title">积分</span>
                    <input type="text" value={this.state.score_single} className="redpacket-option" onChange={this.handleChange.bind(this, "score_single")}/>
                    <span className="option-title">数量</span>
                    <input type="text" value={this.state.score_count} className="redpacket-option" onChange={this.handleChange.bind(this, "score_count")}/>
                </div>
            )
        }else{
            return (
                <div className="redpacket-info-option">
                    <span className="redpacket-title">最大</span>
                    <input type="text" value={this.state.score_max} className="redpacket-option" onChange={this.handleChange.bind(this, "score_max")}/>
                    <span className="redpacket-title">数量</span>
                    <input type="text" value={this.state.score_count} className="redpacket-option" onChange={this.handleChange.bind(this, "score_count")}/>
                </div>
            )
        }
    }

    renderForm(){
        let self = this;
        let submitButton = <button className="btn btn-info pull-right ">提交</button>;
        return (
            <div className="redpacket-form">
                <div className="redpacket-info-title"> 
                    <textarea ref="redpacket_title" rows="3" id="redpacket-title"  placeholder="竞猜红包描述" ></textarea> 
                </div>
                <div className="redpacket-info-type">
                    类型：
                    <select ref="redpacket_type" onChange={this.handlerSelectType.bind(this)} className="redpacket-type">
                        {
                            Object.keys(this.getTypeArr()).map((type, index) => {
                                if(type != 'redpacket_result'){
                                    let item = self.getType(type)
                                    return <option value={type}>{item.name}</option>
                                }
                            })
                        }
                    </select>
                </div>
                { this.renderFormType(this.state.type) }
                <div className="redpacket-info-button" onClick={this.handlerSubmitRedpacket.bind(this)}> {submitButton} </div>
            </div>
        )
    }

    render() {
        const {list} = this.state;
        return (
            <div className="resource-redpacket-box">
                <div className="box-title" onClick={this.getRedpacketInfo.bind(this, this.match_id, null)}>红包列表 <i className="fa fa-refresh" aria-hidden="true"></i></div>
                <div className="box">
                    <div className="box-list">
                        { this.renderList(this.state.list) }
                    </div>
                </div>
                <div className="box-info">
                    { this.renderForm() }
                </div>
            </div>
        );
    }

}

RedPacketPage.propTypes = {
    matchId: PropTypes.string,
};

export default RedPacketPage;
