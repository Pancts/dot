var path = require("path");
var route = require("./router");
var util = require("../utils/util");
var logger = require("../utils/log");
var Live = require('../models/live');
var Setting = require('../models/setting');
var handler = require("./handler");

route.get("/ping", function(req, res){
    res.jsonOutput({"status": 1});
});

route.post("/report", function(req, res){
    res.jsonOutput({"status": 1});
});

route.post("/fail", function(req, res){
    res.jsonOutput({"status": 1});
});

route.get("/test", function(req, res){
    try{
        handler[req.params.r](req.params, function(result){
            res.jsonOutput(result);
        })
    }catch(e){
        res.jsonOutput({"messsage": e});
    }
});

route.post("/upload", function(req, res){
    handler.cutAndUpload(req.params, function(result){
        res.jsonOutput(result);
    })
});

route.get("/list", function(req, res){
    Live.getList({}, 1, 20, function(list){
        res.jsonOutput({"status": 1, "list": list});
    })
});

route.get("/active-list", function(req, res){
    Live.getList({}, 1, 20, function(list){
        res.jsonOutput({"status": 1, "list": handler.getActiveList()});
    })
});

route.get("/getFileSavePath", function(req, res){
    Setting.get("file-save-path", function(value){
        var _path = "";
        if(value) _path = value;
        if(!_path) _path = path.join(util.getHomePath(), "Data");
        res.jsonOutput({"status": 1, "path": _path});
    });
});

route.get("/getSetting", function(req, res){
    Setting.get(req.params.key, function(value){
        res.jsonOutput({"status": 1, "value": value});
    });
});

route.get("/setSetting", function(req, res){
    Setting.set(req.params.key, req.params.value);
    res.jsonOutput({"status": 1});
});

module.exports = route;

