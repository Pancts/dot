import electron,{ remote, desktopCapturer, shell} from 'electron'
import React from 'react';
import fs from 'fs';
import path from 'path';
import mediaRecorderVideo from '../backend/mediaRecorderVideo';
import util from '../utils/util';

class ScreenPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            recording: {},
            sources: [],
        }; 
        this.videoSavePath = "./";
    }

    componentDidMount() {
        var self = this;
        desktopCapturer.getSources({types: ['window', 'screen']}, function(error, sources) {
            if (error) throw error;
            self.setState({ sources: sources });
        });
        this.initVideoSavePath();
    }

    componentWillUnmount(){
        let self = this;
        Object.keys(this.state.recording).map((id, index) => {
            self.stopMediaRecorder(id);
        })
    }

    initVideoSavePath(){
        let self = this;
        util.getDataPath(function(p){
            let videoSavePath = path.join(p, "screenvideo");
            util.mkdirsSync(videoSavePath)
            self.videoSavePath = videoSavePath;
        })
    }

    addRecord(id, mediaRecorder){
        var recording = this.state.recording;
        recording[id] = mediaRecorder;
        this.setState({recording: recording})
    }

    removeRecord(id){
        var recording = this.state.recording;
        if(recording.hasOwnProperty(id)){
            delete recording[id];
            this.setState({recording: recording})
        }
    }

    mediaRecorder(id) {

        var self = this;
        navigator.webkitGetUserMedia({
            audio: false,
            video: {
                mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: id,
                    minWidth: 1920,
                    maxWidth: 1920,
                    minHeight: 1080,
                    maxHeight: 1080,
                }
            }
        }, function(stream){
            let file = path.join(self.videoSavePath, util.md5(new Date().getTime()+Math.random().toString()) + ".webm");
            let mediaRecorder = new mediaRecorderVideo(stream);
            mediaRecorder.on("onstop", function(e){
                console.info(`${id} stop`)
            })
            mediaRecorder.on("onprogress", function(size, total){})
            mediaRecorder.on("onstart", function(){
                console.info("start")
            })
            mediaRecorder.save(file, null, function(err, info){
                shell.showItemInFolder(info.path)
            });
            mediaRecorder.start(1000);
            self.addRecord(id, mediaRecorder);

        }, function(e){
            console.error('Exception while webkitGetUserMedia:', e)
        });
    }

    stopMediaRecorder(id){
        if(this.state.recording.hasOwnProperty(id)){
            let mediaRecorder = this.state.recording[id];
            mediaRecorder.stop();
            this.removeRecord(id);
        }
    }

    blobToBuffer (blob, cb) {
        if (typeof Blob === 'undefined' || !(blob instanceof Blob)) {
            throw new Error('first argument must be a Blob')
        }
        if (typeof cb !== 'function') {
            throw new Error('second argument must be a function')
        }

        var reader = new FileReader()

        function onLoadEnd (e) {
            reader.removeEventListener('loadend', onLoadEnd, false)
            if (e.error) cb(e.error)
            else cb(null, new Buffer(reader.result))
        }

        reader.addEventListener('loadend', onLoadEnd, false)
        reader.readAsArrayBuffer(blob)
    }

    render() {
        var self = this;
        var SourceComponent = this.state.sources.map(function (source) {
            let button = "";
            if(self.state.recording.hasOwnProperty(source.id)){
                button = <button className="btn btn-info" role="button" onClick={self.stopMediaRecorder.bind(self, source.id)}>结束录屏</button>
            }else{
                button = <button className="btn btn-default" role="button" onClick={self.mediaRecorder.bind(self, source.id)}>录屏</button>
            }
            return (
                <div className="col-sm-6 col-md-3">
                    <div className="thumbnail">
                        <img style={{height: "120px",width: "100%", display: "block"}} src={source.thumbnail.toDataURL()} />
                        <div className="caption">
                            {/*<h3>{source.name}</h3>*/}
                            <p>{source.id}</p>
                            <p>{button}</p>
                        </div>
                    </div>
                </div>
            );
        });

        return (
            <div classNmae="row">
                { SourceComponent }
            </div>
        );
    }
}

export default ScreenPage;
