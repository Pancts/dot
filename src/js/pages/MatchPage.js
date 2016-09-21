const electron = require('electron');
import React, { Component, PropTypes } from 'react';
import moment from 'moment';
import filesize from 'filesize';
import config from '../../server/config';
import SearchBox from './common/SearchBox';
import MatchItemPage from './MatchItemPage';
import classnames from 'classnames';

class MatchPage extends Component {

    constructor(props) {
        super(props);
        this.state = {
            list: [],
            activeIndex: 0,
        };
    }

    componentDidMount() {
        this.getList();
    }

    getList(){
        let self = this;
        fetch(config.FRONTEND_HOST + '?r=match/getlist&no_cache=1')
        .then(function(res) {
            return res.json();
        }).then(function(data) {
            if(data.hasOwnProperty("code") && data.code==1){
                self.setState({
                    list: data.result.data,
                });
            }
        });
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

    handleClickList(index, item){
        this.setState({
            activeIndex: index,
            item: item,
        });
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
                >   
                    <a><i className={statusClassNames}></i>{item.match_pid}. { item.title }</a>
                </li>);
        });
        const item = list[activeIndex] != null ? list[activeIndex] : null;
        const matchItem = item != null ? <MatchItemPage match_pid={item.match_pid} active={false}/> : <div className="empty">Empty</div>
        return (
            <div className="live-container">
                <div className="lives">
                    <ul className="lists">
                        <SearchBox className="sidebar-search" onTextChange={this.handleSearch.bind(this)}/>
                         { lists }
                    </ul>
                    <div className="contents">
                        {matchItem}
                    </div>
                </div>
            </div>
        );
    }

}

MatchPage.propTypes = {
    item: PropTypes.object,
};

export default MatchPage;
