var fetch = require("node-fetch");
var crypto = require("crypto");
var util = require("./util");
var logger = require("./log");
var config = require("../config");

var url = config.MANAGER_HOST + "?r=app/verify";
var key ="26148d621ef74844918af182d63976b6";  
var unlock ="1da87257eac114c2b32ae16c0bf9f1a1"; 
var time = 0;

function send(callback){
    time = new Date().getTime();
    var token = key;
    var version = config.APP_VERSION;
    var queryString = "&time="+time+"&token="+token+"&version="+version;
    var urlStr = url + queryString
    fetch(urlStr)
    .then(function(res) {
        return res.text();
    }).then(function(body) {
        try{
            callback(JSON.parse(body))
        }catch(e){
            callback(false)
        }
    });
}

function verify(data){
    var code = util.md5(time + key + unlock);
    var pass = 0;
    var message = "";
    if(data || !data.hasOwnProperty("status") || data.status!=1){
        if(data.hasOwnProperty("code") && data.code == code){
            if(data.hasOwnProperty("data")){
                pass = data.data.hasOwnProperty("pass") ? data.data.pass : 1;
                message = data.data.hasOwnProperty("message") ? data.data.message : "";
            }else{
                pass = 1;
                message = "";
            }
        }else{
            message = "远程连接验证失败！";
        }
    }else{
        message = "远程连接失败！";
    }
    return {pass: pass, message: message};
}

function run(callback){
    send(function(data){
        callback(verify(data))
    });
}

module.exports.runTimer = function(interval, callback){
    run(callback);
    var t = setInterval(function(){
        run(callback);
    }, interval * 1000)
}

//module.exports.runTimer();

