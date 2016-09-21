var httpProxy = require('http-proxy');


// 新建一个代理 Proxy Server 对象
var proxy = httpProxy.createProxyServer({});

// 捕获异常  
proxy.on('error', function (err, req, res) {  
    console.info("捕获异常: ", req.url)
});  

module.exports = proxy;
