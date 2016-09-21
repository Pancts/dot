var db = require('../public/db');
var table = "lives";


function Live(options){

}

module.exports.create = function(item, callback){
    db.loadDatabase({}, function(){
        var live = db.loadHandler(table);
        live.insert(item);
        db.save();
        if(callback) callback(item);
    })
}

module.exports.get = function(id, callback){
    db.loadDatabase({}, function(){
        var live = db.loadHandler(table);
        var item = live.findOne({id: id});
        callback(item);
    })
}


module.exports.update = function(id, data){
    db.loadDatabase({}, function(){
        var live = db.loadHandler(table);
        var item = live.findOne({id: id});
        if(item && data){
            live.update(Object.assign(item, data));
            db.save();
        }
    });
}

module.exports.deleteById = function(id, callback){
    db.loadDatabase({}, function(){
        var live = db.loadHandler(table);
        var item = live.get(id);
        if(item){
            live.remove(item);
            db.save();
        }
        if(callback) callback(true)
    });
}

module.exports.delete = function(id, callback){
    db.loadDatabase({}, function(){
        var live = db.loadHandler(table);
        var item = live.findOne({id: id});
        if(item){
            live.remove(item);
            db.save();
        }
        if(callback) callback(true)
    });
}

module.exports.getList = function(condition, page, pageSize, callback){
    db.loadDatabase({}, function(){
        pageSize = Math.min(Math.max(parseInt(pageSize), 1), 100);
        var offset = Math.max((parseInt(page)-1) * parseInt(pageSize), 0);
        var live = db.loadHandler(table);
        var data = live.chain().find(condition).simplesort("$loki", true).offset(offset).limit(pageSize).data();
        callback(data);
    });
}


module.exports.Live = Live;
