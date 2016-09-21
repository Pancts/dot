import React from 'react';
const config = require('../../server/config');

class ManagerPage extends React.Component {
    
    constructor(props) {
        super(props);
    }

    componentDidMount() {

    }

	render() {
        let style = {
            minWidth: 1280,
            minHeight: 940,
        };
		return (
            <div>
                <webview id="foo" src={config.MANAGER_HOST} style={style} autosize="on"></webview>
            </div>
		);
	}
}

export default ManagerPage;
