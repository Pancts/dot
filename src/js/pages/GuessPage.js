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

class GuessPage extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            list: [],
        };
        this.match_id = 0;
    }

    componentDidMount() {
    }

    getTypeArr(){
        return {
            "guess_result": {name: "赛果竞猜", className:"label-important"},
            "guess_award": {name: "有奖预测", className:"label-success"},
            "guess_interact": {name: "互动竞猜", className:" label-info"},
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

    getGuessInfo(match_id, callback){
        let self = this;
        if(!callback) callback = (guess) => self.setState({list: guess})
        fetch(config.FRONTEND_HOST + '?r=guess/getguess&no_cache=1&match_id='+match_id)
        .then(function(res) {
            return res.json();
        }).then(function(data) {
            if(data.hasOwnProperty("code") && data.code==1){
                callback(data.result.data)
            }else{
                callback([], data.message)
            }
        });
    }

    shouldComponentUpdate(nextProps, nextState){
        let bool = this.match_id != nextProps.matchId || this.state !== nextState
        if(this.match_id != nextProps.matchId){
            let self = this;
            this.match_id = nextProps.matchId;
            this.getGuessInfo(this.match_id)
        }
        return bool
    }

    sendGuess(data, callback){
        data.r = "appguessapi/addguess"
        data.match_id = this.match_id
        live.sendMessage(data, function(error, message, data){
            callback(error ? null : message)
        });
    }

    handlerDeleteGuess(guess_id){
        let self = this;
        if(!confirm("你确定要删除该信息吗?")){
            return false;
        }
        live.sendMessage({
            r: "appguessapi/delete",
            guess_id: guess_id,
        }, function(error, message, data){
            if(error)alert(message);
            else{
                self.getGuessInfo(self.match_id)
            }
        });
    }

    handlerSelectResult(guess_id, e){
        let self = this;
        live.sendMessage({
            r: "appguessapi/update",
            guess_id: guess_id,
            result_id: e.target.value,
            status: 9,
        }, function(error, message, data){
            if(error)alert(message);
            else{
                self.getGuessInfo(self.match_id)
            }
        });
    }

    handlerUpdateStatus(guess_id, e){
        let self = this;
        let data = {
            r: "appguessapi/update",
            guess_id: guess_id,
            status: e.target.value,
        }
        if(data.status == 1) data.start_time = parseInt(new Date().getTime() / 1000)
        if(data.status == 9) data.end_time = parseInt(new Date().getTime() / 1000)
        live.sendMessage(data, function(error, message, data){
            if(error)alert(message);
            else{
                self.getGuessInfo(self.match_id)
            }
        });
    }

    handlerSubmitGuess(e){
        let self = this;
        let inputTitle = this.refs.guess_textarea.getDOMNode()
        let inputType = this.refs.guess_type.getDOMNode()
        let inputScore = this.refs.guess_score.getDOMNode()
        let inputOption1 = this.refs.guess_option_1.getDOMNode()
        let inputOption2 = this.refs.guess_option_2.getDOMNode()
        let inputOption3 = this.refs.guess_option_3.getDOMNode()
        let inputOption4 = this.refs.guess_option_4.getDOMNode()
        let inputOption5 = this.refs.guess_option_5.getDOMNode()
        if(!inputTitle.value){
            return alert("竞猜描述必须填写")
        }
        if(!inputOption1.value || !inputOption2.value){
            return alert("前二项竞猜选项必须填写")
        }
        let data = {options: []}
        data.title = inputTitle.value
        data.type = inputType.value
        data.score = inputScore.value
        data.options.push(inputOption1.value)
        data.options.push(inputOption2.value)
        if(inputOption3.value) data.options.push(inputOption3.value)
        if(inputOption4.value) data.options.push(inputOption4.value)
        if(inputOption4.value) data.options.push(inputOption4.value)

        self.sendGuess(data, function(err){
            if(err) alert(err)
            else{
                self.getGuessInfo(self.match_id)
                inputTitle.value = "";
                inputOption1.value = "";
                inputOption2.value = "";
                inputOption3.value = "";
                inputOption4.value = "";
                inputOption5.value = "";
            }
        })
    }

    renderList(list){
        let self = this;
        return list.map((item, index) => {
            let typeItem = self.getType(item.type)
            let activeStatus = self.getStatus(item.status);
            let title = item.type == 'guess_result' ? "谁将取得比赛胜利？" : item.title
            let optionHtml = item.options.map((option, n) => {
                let checked = item.result_id == option.option_id ? true : false;
                let right = checked ? <span className="option-right-result">√</span> : ""
                let input = item.status == 9 ? <input type="radio" onClick={self.handlerSelectResult.bind(this, item.guess_id)} checked={checked} value={option.option_id} name={`option_${index}`}/> : ""
                return <li className="option-li">{input} {n + 1}. {option.title} {right} </li>
            })
            let statusOption = Object.keys(self.getStatusArr()).map((status) => {
                let statusItem = self.getStatus(status);
                let selected = status == item.status ? "selected" : false;
                return <option selected={selected} value={status}>{statusItem.name}</option>
            })
            return (
                <div className="guess-item pre">
                    <button type="button"  className="close" onClick={this.handlerDeleteGuess.bind(this, item.guess_id)}>×</button>
                    <div className="guess-title">
                        {/*<span className="badge">{index+1}</span>*/} {title}
                    </div>
                    <ul className="guess-option"> {optionHtml} </ul>
                    <span className={`label label-type ${typeItem.className}`}>{typeItem.name}</span>
                    <select className={`label label-status ${activeStatus.className}`} onChange={this.handlerUpdateStatus.bind(this, item.guess_id)}>{statusOption}</select>
                    <span className="label label-sorce">{item.score}</span>
                </div>
            )
        });
    }

    renderForm(){
        let self = this;
        let submitButton = <button className="btn btn-info pull-right ">提交</button>;
        return (
            <div className="guess-form">
                <div className="guess-info-title"> 
                    <textarea ref="guess_textarea" rows="3" id="guess-title"  placeholder="竞猜问题描述" ></textarea> 
                </div>
                <div className="guess-info-type">
                    类型
                    <select ref="guess_type" className="guess-type">
                        {
                            Object.keys(this.getTypeArr()).map((type, index) => {
                                if(type != 'guess_result'){
                                    let item = self.getType(type)
                                    return <option value={type}>{item.name}</option>
                                }
                            })
                        }
                    </select>
                    &nbsp;&nbsp;积分
                    <select ref="guess_score" className="guess-score">
                        {
                            Object.keys(this.getScoreArr()).map((score, index) => {
                                let item = self.getScore(score)
                                return <option value={score}>{item.name}</option>
                            })
                        }
                    </select>
                </div>
                <div className="guess-info-option">
                    <input ref="guess_option_1" type="text" className="guess-option" placeholder="选项一(必填)" />
                    <input ref="guess_option_2" type="text" className="guess-option" placeholder="选项二(必填)" />
                    <input ref="guess_option_3" type="text" className="guess-option" placeholder="选项三" />
                    <input ref="guess_option_4" type="text" className="guess-option" placeholder="选项四" />
                    <input ref="guess_option_5" type="text" className="guess-option" placeholder="选项五" />
                </div>
                <div className="guess-info-button" onClick={this.handlerSubmitGuess.bind(this)}> {submitButton} </div>
            </div>
        )
    }

    render() {
        const {list} = this.state;
        return (
            <div className="resource-guess-box">
                <div className="box-title" onClick={this.getGuessInfo.bind(this, this.match_id, null)}>竞猜列表 <i className="fa fa-refresh" aria-hidden="true"></i></div>
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

GuessPage.propTypes = {
    matchId: PropTypes.string,
};

export default GuessPage;
