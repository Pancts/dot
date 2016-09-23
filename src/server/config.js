
var config = {}
config.APP_VERSION = '2.1.1';

var env = process.env.RUN_ENV ? process.env.RUN_ENV : "production";

if(env == "dev"){
    //开发环境
    config.MANAGER_HOST = 'http://video-match.webdev.duowan.com/manager/index.php';
    config.FRONTEND_HOST = 'http://video-match.webdev.duowan.com/frontend/index.php';
    config.Live_HOST = 'http://dplive-ltre.webdev.duowan.com/pc-live.html';
}else if(env == "test"){
    //测试环境
    config.MANAGER_HOST = 'http://test-match-manager-v.huya.com';
    config.FRONTEND_HOST = 'http://test-match-v.huya.com';
    config.Live_HOST = 'http://dplive-ltre.webdev.duowan.com/pc-live.html';
}else{
    //正式环境
    config.MANAGER_HOST = 'http://match-manager-v.huya.com';
    config.FRONTEND_HOST = 'http://match-v.huya.com';
    config.Live_HOST = 'http://lol.duowan.com/s/live/index.html';
}

module.exports = config;