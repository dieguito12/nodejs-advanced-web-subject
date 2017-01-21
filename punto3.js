var express = require('express');
var app = express();

app.all('*', function (req, res) {
    var jsonHeaders = JSON.stringify(req.headers);
    console.log("Headers: " + jsonHeaders);
});

app.listen(8084, function () {
    console.log('listening on port 8084...');
});

