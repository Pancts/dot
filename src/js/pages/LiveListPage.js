const electron = require('electron')
const remote = electron.remote
const shell = electron.shell
const Menu = remote.Menu
const MenuItem = remote.MenuItem

import React, { Component, PropTypes } from 'react';
import fetch from 'node-fetch';
import socket from '../backend/socket';
import LiveItemPage from './LiveItemPage';
import SearchBox from './common/SearchBox';
import classnames from 'classnames';

socket.on('connect', function(){
    socket.emit("add-listener");
});


let threadId = "";

class LiveListPage extends Component {

    constructor(props) {
        super(props);
        this.state = {
            activeIndex: null,
            list: [],
            item: null,
        };
        this.menu = null;
    }

    componentDidMount() {
        let self = this;
        
        self.addSocketListener();
        self.getActiveList();
        self.menu = new Menu()
        self.menu.append(new MenuItem({ 
            label: '移除记录', 
            click: function () {
                if(threadId){
                    socket.emit("remove-thread", threadId)
                    self.getActiveList();
                }
            }
        }));
    }

    componentWillUnmount(){
        this.reomveSocketListener();
    }

    addSocketListener(){
        let self = this;
        socket.on("active-list", function(list){
            self.setState({list: list});
        })
    }

    reomveSocketListener(){
        let self = this;
        socket.off("active-list")
    }

    getActiveList(){
        let self = this;
        fetch(process.env.APP_PROXY_URL + '/active-list')
        .then(function(res) {
            return res.json();
        }).then(function(data) {
            if(data.hasOwnProperty("list")){
                self.setState({
                    list: data.list,
                });
            }
        });
    }

    handleClickList(index, item){
        this.setState({
            activeIndex: item.id,
            item: item,
        });
    }

    handleContextMenuList(item){
        threadId = item.id;
        this.menu.popup(remote.getCurrentWindow())
    }

    openFile(file){
        shell.showItemInFolder(file)
    }

    handleSearch(text){
        let list = [];
        if(!text){
            return this.getActiveList();
        }
        this.state.list.map((item, index) => {
            if(item.title.indexOf(text) != -1){
                list.push(item);
            }
        })
        this.setState({
            list: list,
        })
    }

	render() {
        const self = this;
        const activeIndex = this.state.activeIndex != null ? this.state.activeIndex : (this.state.list[0] ? this.state.list[0].id : null);
        let active = null;

        //const item = this.state.item != null ? this.state.item : this.state.list[0];
        const lists = this.state.list.map((item, index) => {
            const statusClassNames = classnames({
                'status': true,
                'online': item.active,
            });
            active = activeIndex == item.id ? item : active;
            return (
                <li key={ index }
                    className={ activeIndex == item.id ? 'active' : '' }
                    onClick={ this.handleClickList.bind(self, index, item) }
                    onContextMenu={ this.handleContextMenuList.bind(self, item) }
                >   
                    <a><i className={statusClassNames}></i>{item.tabId} { item.title }</a>
                </li>
            );
        });
        const item = active != null ? active : this.state.item;
        const liveItem = item != null ? <LiveItemPage item={item} socket={socket} active={this.props.active}/> : <div className="empty">Empty</div>
		return (
			<div className="live-container">
                <div className="lives">
                    <ul className="lists">
                        <SearchBox className="sidebar-search" onTextChange={this.handleSearch.bind(this)}/>
                         { lists }
                    </ul>
                    <div className="contents">
                        {liveItem}
                    </div>
                </div>
            </div>
		);
	}

}

LiveListPage.propTypes = {
    active: PropTypes.bool,
};

export default LiveListPage;
