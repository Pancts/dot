var fs = require("fs");
var Path = require("path");
var util = {}

util.error = function(error){
    util.writeLog(error);
    //console.log("\033[42;37m[ERROR]\033[0m: \033[31m"  + error + "\033[0m");
    console.error(error);
}

util.info = function(info){
    util.writeLog(info);
    //console.log("\033[42;37m[INFO]\033[0m: \033[32m"  + info + "\033[0m");
    console.info(info);
}

util.log = function(log){
    util.writeLog(log);
    console.log(log);
}

util.md5 = function(content){
    var crypto = require('crypto');
    var md5 = crypto.createHash('md5');
    md5.update(content);
    return md5.digest('hex');  
}

util.writeLog = function(data, file){
    var type = typeof(data);
    file = file || "./log.txt";
    if(type == "object"){
        fs.appendFile(file, JSON.stringify(data, null, 4) + "\n");
    }else{
        fs.appendFile(file, data + "\n");
    }
}

util.getHomePath = function(){
    var path = process.cwd();
    try{path = require('electron').app.getPath("userData")}catch(e){}
    return path;
}

util.getFfmpegPath = function(){
    if(fs.existsSync(Path.join(process.cwd(), "tools", "ffmpeg.exe"))){
        return Path.join(process.cwd(), "tools", "ffmpeg");
    }else{
        return Path.join(process.cwd(), "resources", "app.asar.unpacked", "tools", "ffmpeg");
    }
}

util.mkdirsSync = function(dirname, mode){
    if(fs.existsSync(dirname)){
        return true;
    }else{
        if(util.mkdirsSync(Path.dirname(dirname), mode)){
            fs.mkdirSync(dirname, mode);
            return true;
        }
    }
}

module.exports = util;