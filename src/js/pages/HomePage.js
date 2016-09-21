const shell = require('electron').shell
import React, { Component } from 'react';
import fetch from 'node-fetch';
import socket from '../backend/socket';

socket.on('connect', function(){
    socket.emit("add-listener");
});

class HomePage extends Component {

    constructor(props) {
        super(props);
        this.state = {
            list: [],
        };
    }

    componentDidMount() {
        let self = this;
        socket.on("active-list", function(list){
            self.setState({list: list});
        })
        self.getActiveList();
    }

    getActiveList(){
        let self = this;
        fetch(process.env.APP_PROXY_URL + '/active-list')
        .then(function(res) {
            return res.json();
        }).then(function(data) {
            if(data.hasOwnProperty("list")){
                self.setState({list: data.list});
            }
        });
    }

    updateList(){
        let self = this;
        fetch(process.env.APP_PROXY_URL + '/list')
        .then(function(res) {
            return res.json();
        }).then(function(data) {
            if(data.hasOwnProperty("list")){
                self.setState({list: data.list});
            }
        });
    }

    openFile(file){
        shell.showItemInFolder(file ? file : "./data/temp")
    }

	render() {
        let self = this;
        var LiveComponent = this.state.list.map(function (item) {
            var VideoComponent = item.file ? <video src={item.file} controls="controls" width="200"></video> : <div></div>;
            return (
                <tr>
                    <td>{item.$loki}</td>
                    <td>{item.tabId}</td>
                    <td>{item.active}</td>
                    <td>{item.createTime}</td>
                    <td>{item.status.name}</td>
                    <td>{item.size}</td>
                    <td>{item.title}</td>
                    <td>{VideoComponent}</td>
                    <td>{item.url}<button onClick={ self.openFile.bind(this, item.file) }>文件夹</button></td>
                </tr>
            );
        });
		return (
			<div className="list">
                <table className="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>tabId</th>
                            <th>活动</th>
                            <th>创建时间</th>
                            <th>状态</th>
                            <th>大小</th>
                            <th>标题</th>
                            <th>视频</th>
                            <th>URL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {LiveComponent}
                    </tbody>
                </table>
            </div>
		);
	}

}

export default HomePage;
