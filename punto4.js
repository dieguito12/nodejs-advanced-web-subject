var express = require('express');
var app = express();

app.all('*', function (req, res) {
    var port = req.get('host').split(':');
    port = port[1];
    var method = req.method;
    var path = req.originalUrl;
    var headers = JSON.stringify(req.headers);
    var jsonResponse = "{\"method\":" + "\"" + method + "\""
            + ",\"path\":" + "\"" + path + "\""
            + ",\"port\":" + "\"" + port + "\""
            + ",\"headers\":" + headers + "}";
    res.send(jsonResponse);
});

app.listen(8084, function () {
    console.log('listening on port 8084...');
});

