import React, { Component, PropTypes } from 'react';
import LiveListPage from './LiveListPage';

class LivePage extends Component {

    constructor(props) {
        super(props);
        this.state = {
        };
    }
    
	render() {
       
		return (
			<LiveListPage active={true} />
		);
	}

}

export default LivePage;
