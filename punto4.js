var express = require('express');
var app = express();

app.all('*', function (req, res) {
    var fullHost = req.get('host').split(':');
    var host = fullHost[0];
    var port = fullHost[1];
    var method = req.method;
    var path = req.originalUrl;
    var arr = Object.keys(req.headers).map(function(k) { return req.headers[k].toString() });
    console.log(arr);
    var headers = JSON.stringify(arr);
    var jsonResponse = "{\"method\":" + "\"" + method + "\""
            + ",\"path\":" + "\"" + path + "\""
            + ",\"host\":" + "\"" + host + "\""
            + ",\"port\":" + "\"" + port + "\""
            + ",\"header\":" + headers + "}";
    res.send(jsonResponse);
});

app.listen(8084, function () {
    console.log('listening on port 8084...');
});

