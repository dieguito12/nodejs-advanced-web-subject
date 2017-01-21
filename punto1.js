var express = require('express');
var app = express();

app.get('*', function (req, res) {
    var host = req.get('host').split(':');
    console.log("Protocolo: " + req.protocol);
    console.log("Host: " + host[0]);
    console.log("Puerto: " + host[1]);
    console.log("Path: " + req.originalUrl);
});

app.listen(8084, function () {
    console.log('listening on port 8084...');
});

