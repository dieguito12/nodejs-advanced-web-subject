var express = require('express');
var app = express();

var allowedMethod = ['GET', 'POST', 'PUT'];

app.get('/404', function (req, res) {
    res.status(404);
    res.send("{\"statusCode\":\"404\"}");
});

app.get('/protected', function (req, res) {
    res.status(401);
    res.send("{\"statusCode\":\"401\"}");
});

app.get('/error', function (req, res) {
    res.status(500);
    res.send("{\"statusCode\":\"500\"}");
});

app.all('/notimplemented', function (req, res) {
    var statusCode = 200;
    if (allowedMethod.indexOf(req.method) < 0) {
        statusCode = 501;
    }
    res.status(statusCode);
    res.set('Allow', allowedMethod);
    res.send("{\"statusCode\":\"" + statusCode + "\"}")
});

app.get('/login', function (req, res) {
    res.set('Content-type', 'text/html');
    res.sendFile(__dirname + '/index.html');
});

app.use(function(req, res, next) {
    var postValues = {};
    req.setEncoding('utf8');
    req.on('data', function(data) {
        if (req.headers['content-type'] == 'application/json') {
            res.body = data;
        } else {
            var postData = data.split("&");
            for(var i = 0; i < postData.length; i++) {
                var postEntry = postData[i].split('=');
                req[postEntry[0]] = postEntry[1];
            }
        }
    });
    req.on('end', function() {
        next();
    });
});

app.post('/login', function (req, res) {
    res.status(200);
    res.set('Content-Type', 'application/json');
    if (req.headers['content-type'] == 'application/json') {
        res.send(res.body);
    }
    else {
        var jsonResponse = "{\"username\":\"" + req.username + "\""
            + ",\"password\":\"" + req.password + "\"}";
        res.send(jsonResponse);
    }
});

app.all('*', function (req, res) {
    var fullHost = req.get('host').split(':');
    var host = fullHost[0];
    var port = fullHost[1];
    var method = req.method;
    var path = req.originalUrl;
    var arr = Object.keys(req.headers).map(function(key) {
        return req.headers[key].toString()
    });
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

