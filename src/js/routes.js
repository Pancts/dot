import React from 'react';
import Router from 'react-router';
import Header from './pages/common/Header';
import Sidebar from './pages/common/Sidebar';
import LivePage from './pages/LivePage';
import ListPage from './pages/ListPage';
import HomePage from './pages/HomePage';
import DebugPage from './pages/DebugPage';
import LogPage from './pages/LogPage';
import ScreenPage from './pages/ScreenPage';
import AboutPage from './pages/AboutPage';
import SettingPage from './pages/SettingPage';
import ManagerPage from './pages/ManagerPage';
import MatchPage from './pages/MatchPage';

var Route = Router.Route;
var DefaultRoute = Router.DefaultRoute;
var RouteHandler = Router.RouteHandler;

var App = React.createClass({
  render: function () {
    let list = [{
            name: "录制中",
            to : "live",
            className: "fa fa-youtube-play",
            online: true,
        },{
            name: "比赛",
            to : "match",
            className: "fa fa-trophy",
            online: true,
        },{
            name: "列表",
            to : "list",
            className: "fa fa-list",
        },{
            name: "管理后台",
            to : "manager",
            className: "fa fa-table",
        }/*,{
            name: "调试",
            to : "debug",
            className: "fa fa-bug",
        },{
            name: "日志",
            to : "log",
            className: "fa fa-code",
        },{
            name: "录屏",
            to : "screen",
            className: "fa fa-tachometer",
        }*/,{
            name: "关于",
            to : "about",
            className: "fa fa-tachometer",
        }];

    return (
        <div>
            <div>
                <Sidebar list={ list } />
            </div>
                <div className="main-container ">
                    <Header hideLogin={true}/>
                    <div className="content-container ">
                        <div className="list">
                            <RouteHandler />
                        </div>
                    </div>
                </div>
        </div>
      );
    }
});

var routes = (
    <Route name="app" path="/" handler={App}>
        <Route name="live" path="/" handler={LivePage}/>
        <Route name="match" handler={MatchPage}/>
        <Route name="list" handler={ListPage}/>
        <Route name="manager" handler={ManagerPage}/>
        <Route name="debug" handler={DebugPage}/>
        <Route name="log" handler={LogPage}/>
        <Route name="about" handler={AboutPage}/>
        <Route name="screen" handler={ScreenPage}/>
        <Route name="setting" handler={SettingPage}/>
    </Route>
);

module.exports = routes;
