var db = require('../public/db');
var table = "videos";
var util = require("../utils/util");

function Video(options){
    options = typeof options == "object" ? options : {};
    var time = new Date().getTime();
    var self = {
        id: time,
        file: options.file || "",
        filename: options.filename || "",
        size:  options.size || 0,
        start:  options.start || 0,
        end:  options.end || 0,
        duration:  options.duration || 0,
        ctimt: time,
        title: "",
        uploaded: 0,
        vid: 0,
        status: 0,
        message: "",
    };
    return self;
}

module.exports.create = function(options, callback){
    var item = new Video(options);
    return callback(item.id, item);
/*
    db.loadDatabase({}, function(){
        var video = db.loadHandler(table);
        var item = new Video(options);
        video.insert(item);
        db.save();
        if(callback) callback(item);
    })*/
}

module.exports.get = function(id, callback){
    db.loadDatabase({}, function(){
        var video = db.loadHandler(table);
        var item = video.get(id);
        callback(item);
    })
}


module.exports.update = function(id, data){
    db.loadDatabase({}, function(){
        var video = db.loadHandler(table);
        var item = video.get(id);
        if(item && data){
            video.update(Object.assign(item, data));
            db.save();
        }
    });
}

module.exports.deleteById = function(id, callback){
    db.loadDatabase({}, function(){
        var video = db.loadHandler(table);
        var item = video.get(id);
        if(item){
            video.remove(item);
            db.save();
        }
        if(callback) callback(true)
    });
}

module.exports.delete = function(id, callback){
    db.loadDatabase({}, function(){
        var video = db.loadHandler(table);
        var item = video.findOne({id: id});
        if(item){
            video.remove(item);
            db.save();
        }
        if(callback) callback(true)
    });
}

module.exports.getList = function(condition, page, pageSize, callback){
    db.loadDatabase({}, function(){
        pageSize = Math.min(Math.max(parseInt(pageSize), 1), 100);
        var offset = Math.max((parseInt(page)-1) * parseInt(pageSize), 0);
        var video = db.loadHandler(table);
        var data = video.chain().find(condition).simplesort("$loki", true).offset(offset).limit(pageSize).data();
        callback(data);
    });
}


module.exports.Video = Video;
