import React, { Component, PropTypes } from 'react';

class EditorPage extends Component {

    render(){
        let html = this.props.html;
        return (
            <div
                ref="editor"
                className={this.props.className} 
                onInput={this.emitChange.bind(this)} 
                onBlur={this.emitChange.bind(this)}
                contentEditable
                onPaste={this.props.onPaste}
                onContextMenu={this.props.onContextMenu}
                dangerouslySetInnerHTML={{__html: html}}>
            </div>
        )
    }
    shouldComponentUpdate(nextProps){
        return nextProps.html !== this.refs.editor.getDOMNode().innerHTML;
    }
    emitChange(){
        var html = this.refs.editor.getDOMNode().innerHTML;
        if (this.props.onChange && html !== this.lastHtml) {

            this.props.onChange({
                target: {
                    value: html
                }
            });
        }
        this.lastHtml = html;
    }

}
EditorPage.propTypes = {
    html: PropTypes.string,
    className: PropTypes.string,
    onPaste: PropTypes.object,
};
export default EditorPage;
