const fetch = require('node-fetch');
const request = require('request');
const logger = require("./log")
const config = require('../config');
const fs = require("fs");
const path = require("path");

module.exports.getCookies = function getCookies(loginWindow, callback){
    var session = loginWindow.webContents.session;;
    session.cookies.get({url: config.MANAGER_HOST}, (error, cookies) => {
        var data = {};
        for(key in cookies){
            var cookie = cookies[key];
            data[cookie.name] = cookie.value;
        }
        callback(data);
    })
}

module.exports.login = function login(cookies, callback){
    var url = config.MANAGER_HOST + '?r=app/isLogin';
    var j = request.jar();
    for(name in cookies){
        var cookie = request.cookie(name+"="+cookies[name]);
        j.setCookie(cookie, url);
    }
    request({
        url: url, 
        jar: j,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36'
        }
    }, function (error, response, body) {
        try{
            if(response.statusCode == 200){
                callback(null, JSON.parse(body))
            } else {
                callback(response.statusCode);
            }
        }catch(e){
            callback("登陆失败：获取登陆结果失败");
        }
    });
}


module.exports.md5 = function md5(content){
    var crypto = require('crypto');
    var md5 = crypto.createHash('md5');
    md5.update(content);
    return md5.digest('hex');  
}

module.exports.getHomePath = function getHomePath(){
    var path = process.cwd();
    try{path = require('electron').app.getPath("userData")}catch(e){}
    return path;
}

module.exports.getFfmpegPath = function getFfmpegPath(){
    if(fs.existsSync(path.join(process.cwd(), "tools", "ffmpeg.exe"))){
        return path.join(process.cwd(), "tools", "ffmpeg");
    }else{
        return path.join(process.cwd(), "resources", "app.asar.unpacked", "tools", "ffmpeg");
    }
}

module.exports.mkdirsSync = function mkdirsSync(dirname, mode){
    if(fs.existsSync(dirname)){
        return true;
    }else{
        if(mkdirsSync(path.dirname(dirname), mode)){
            fs.mkdirSync(dirname, mode);
            return true;
        }
    }
}
