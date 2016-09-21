import React, { Component, PropTypes } from 'react';
import CodeMirror from 'codemirror';
import ReactCodeMirror from 'react-codemirror';
import fs from 'fs';

const codemirrorOptions = {
    lineNumbers: true,
};
class LogPage extends Component {
    constructor(props) {
        super(props);
        this.state = {
            value: "",
            log: './log.txt',
        };
    }
    componentDidMount () {
        let self = this;
        self.readLog();
        fs.watchFile(self.state.log, function(curr, prev){
            self.readLog();
        });
    }

    readLog(){
        var self = this;
        fs.readFile(self.state.log, function (err, data) {
            if (err) throw err;
            self.setState({ value: data.toString() });
        });
    }

    clearLog(){
        var self = this;
        fs.writeFile(this.state.log, '', function (err) {
            if (err) throw err;
            self.setState({ value: ""});
            console.log('Clear log succeed!');
        });
    }
      
	render() {
        let style = {
            style: "display:inline-block",
            width: "100%",
            height: "480px",
        };
		return (<div className="list">
                    <webview id="foo" src="http://star.longzhu.com/1462452?from=livegames" style={style} plugins></webview>
                    <button className="btn btn-info" onClick={ this.clearLog.bind(this) }>清空日志</button>
                    <pre>{this.state.value}</pre>
                </div>);
	}
}

export default LogPage;
