var db = require('../public/db');
var table = "settings";


function Setting(options){
    options = typeof options == "object" ? options : {};
    var self = {
        id: options.id || "",
        content:  options.content || "",
    };
    return self;
}

module.exports.create = function(options, callback){
    db.loadDatabase({}, function(){
        var setting = db.loadHandler(table);
        var item = new Setting(options);
        setting.insert(item);
        db.save();
        if(callback) callback(item);
    })
}

module.exports.get = function(id, callback){
    db.loadDatabase({}, function(){
        var setting = db.loadHandler(table);
        var item = setting.findOne({id: id});
        callback(item ? item.content : null);
    })
}

module.exports.set = function(id, content, callback){
    db.loadDatabase({}, function(){
        var setting = db.loadHandler(table);
        var item = setting.findOne({id: id});
        if(item){
            item.content = content;
            setting.update(item);
        }else{
            module.exports.create({id: id, content: content});
        }
        db.save();
    })
}


module.exports.update = function(item){
    db.loadDatabase({}, function(){
        var setting = db.loadHandler(table);
        setting.update(item);
        db.save();
    });
}

module.exports.Setting = Setting;
