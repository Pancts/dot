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

let threadId = "";

class ListPage extends Component {

    constructor(props) {
        super(props);
        this.state = {
            activeIndex: 0,
            list: [],
            item: null,
        };
        this.menu = null;
    }

    componentDidMount() {
        let self = this;
        self.getList();
        self.menu = new Menu();
        self.menu.append(new MenuItem({ 
            label: '删除记录', 
            click: function () {
                if(threadId){
                    socket.emit("delete-thread", threadId);
                    self.getList()
                }
            }
        }));
    }

    getList(){
        let self = this;
        fetch(process.env.APP_PROXY_URL + '/list')
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
            activeIndex: index,
            item: item,
        });
    }

    handleContextMenuList(item){
        //threadId = item["$loki"];
        threadId = item._id;
        this.menu.popup(remote.getCurrentWindow())
    }

    openFile(file){
        shell.showItemInFolder(file)
    }

    handleSearch(text){
        let list = [];
        if(!text){
            return this.getList();
        }
        this.state.list.map((item, index) => {
            if(item.title.indexOf(text) != -1){
                list.push(item);
            }
        })
        this.setState({
            list: list,
            activeIndex: 0,
        })
    }

    render() {
        const self = this;
        const { activeIndex, list } = this.state;
        let active = null;

        //const item = this.state.item != null ? this.state.item : this.state.list[0];
        const lists = this.state.list.map((item, index) => {
            const statusClassNames = classnames({
                //'status': true,
                //'online': item.active,
            });
            return (
                <li key={ index }
                    className={ activeIndex == index ? 'active' : '' }
                    onClick={ this.handleClickList.bind(self, index, item) }
                    onContextMenu={ this.handleContextMenuList.bind(self, item) }
                >   
                    <a><i className={statusClassNames}></i>{index + 1} { item.title }</a>
                </li>);
        });
        const item = list[activeIndex] != null ? list[activeIndex] : null;
        const liveItem = item != null ? <LiveItemPage item={item} active={false}/> : <div className="empty">Empty</div>
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

ListPage.propTypes = {
    active: PropTypes.bool,
};

export default ListPage;
