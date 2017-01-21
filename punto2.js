var express = require('express');
var app = express();

app.use(function(req, res, next) {
    req.rawBody = '';
    req.setEncoding('utf8');
    req.on('data', function(data) {
        req.rawBody += data;
    });
    req.on('end', function() {
        next();
    });
});

app.all('*', function (req, res) {
    console.log("Headers: " + req.rawHeaders);
    console.log("\n\n");
    console.log("Body: " + req.rawBody);
});

app.listen(8084, function () {
    console.log('listening on port 8084...');
});

