var Datastore = require('nedb')
var db = require('../public/db').live;

function Live(options){
    return options;
}

module.exports.create = function(options, callback){
    callback = callback || function(){}
    var item = new Live(options);
    db.insert(item, function(err, data){
        callback(data)
    })
}

module.exports.get = function(id, callback){
    callback = callback || function(){}
    db.findOne({ id: id }, function (err, data) {
        callback(data);
    });
}


module.exports.update = function(id, data, callback){
    callback = callback || function(){}
    db.update({ id: id }, { $set: data }, {returnUpdatedDocs: true}, function (err, num, affectedDocuments) {
        callback(affectedDocuments)
    });
}

module.exports.deleteById = function(id, callback){
    callback = callback || function(){}
    db.remove({ _id: id }, {}, function (err, numRemoved) {
        callback(numRemoved ? true : false)
    });
}

module.exports.delete = function(id, callback){
    callback = callback || function(){}
    db.remove({ id: id }, {}, function (err, numRemoved) {
        callback(numRemoved ? true : false)
    });
}

module.exports.getList = function(condition, page, pageSize, callback){
    callback = callback || function(){}
    pageSize = Math.min(Math.max(parseInt(pageSize), 1), 100);
    var offset = Math.max((parseInt(page)-1) * parseInt(pageSize), 0);
    db.find(condition).sort({createTime: -1}).skip(offset).limit(pageSize).exec(function(err, data){
        callback(data);
    });
}


module.exports.Live = Live;
