var express = require('express');
var app = express();
var exphbs = require('express-handlebars');
var multer = require('multer')
var mkdirp = require('mkdirp');
var uuid = require('uuid-v4');
var redis = require('redis');
var sqlite3 = require('sqlite3');
var yalmConfig = require('node-yaml-config');
var redisConfig = yalmConfig.load('./redis.yml');
console.log(redisConfig);
var sqliteConfig = yalmConfig.load('./database.yml');
var redisClient = redis.createClient(redisConfig.port, redisConfig.host);

redisClient.on('connect', function() {
    console.log('Redis connected');
});

var db = new sqlite3.Database(sqliteConfig.path, sqlite3.OPEN_READWRITE);
var validUUID = true;

var newFilePath = "";

app.use(express.static('public'));

var storageImage = multer.diskStorage({
    destination: function(req, file, cb) {
        var newDestination = '/public/img/';
        mkdirp(__dirname + newDestination, function(err) {
            cb(null, __dirname + newDestination);
        });
    },
    filename: function(req, file, cb) {
        var varFile = Date.now() + '_';
        newFilePath = "/img/" + varFile + file.originalname;
        cb(null, varFile + file.originalname);
    }
});

var upload = multer({
    dest: '/uploads/',
    storage: storageImage,
});

function verifyUUID(newUUID) {
    db.get("SELECT * FROM movies where id = (?)", newUUID, function(err, row) {
        if (row > 0) {
            validUUID = false;
        }
    });
    return validUUID;
}


var allowedMethod = ['GET', 'POST', 'PUT'];

var handlebars = exphbs.create({
    defaultLayout: 'main',
    partialsDir: [
        'views/partials/',
    ]
});

app.post('/movies/create', upload.single('image'), function(req, res, next) {
    var newUUID = uuid();
    var invalidJsonResponse = {
        title: "Movie App",
        layoutTitle: "Add a new movie",
        idNameField: "name",
        nameField: "Name",
        idDescriptionField: "description",
        descriptionField: "Description",
        idImageField: "image",
        imageField: "Image",
        imageHelperDescription: "Choose a poster for the movie.",
        buttonText: "Submit",
        keywordsField: "Keywords",
        idKeywordsField: "keywords"
    }
    if (req.body.name == "") {
        invalidJsonResponse.invalidName = true;
    } else {
        invalidJsonResponse.name = req.body.name;
    }
    if (req.body.description == "") {
        invalidJsonResponse.invalidDescription = true;
    } else {
        invalidJsonResponse.description = req.body.description;
    }
    if (req.body.keywords == "") {
        invalidJsonResponse.invalidKeywords = true;
    } else {
        invalidJsonResponse.keywords = req.body.keywords;
    }
    if (!req.file) {
        invalidJsonResponse.invalidImage = true;
    }
    if (invalidJsonResponse.invalidName ||
        invalidJsonResponse.invalidDescription ||
        invalidJsonResponse.invalidKeywords ||
        invalidJsonResponse.invalidImage
    ) {
        res.render('create', invalidJsonResponse);
        return;
    }
    db.serialize(function() {
        while (!verifyUUID(newUUID)) {
            newUUID = uuid();
        }
        var statement = db.prepare("INSERT INTO movies values (?,?,?,?,?)");
        statement.run(newUUID, req.body.name, req.body.description, req.body.keywords, newFilePath);
        statement.finalize();
    });

    res.redirect('/movies');
});


app.use(function(req, res, next) {
    var postValues = {};
    req.setEncoding('utf8');
    req.on('data', function(data) {
        if (req.headers['content-type'] == 'application/json') {
            res.body = data;
        } else if (req.headers['content-type'] == 'application/x-www-form-urlencoded') {
            var postData = data.split("&");
            for (var i = 0; i < postData.length; i++) {
                var postEntry = postData[i].split('=');
                req[postEntry[0]] = postEntry[1];
            }
        }
    });
    req.on('end', function() {
        next();
    });
});

app.engine('handlebars', handlebars.engine);

app.set('view engine', 'handlebars');

app.get('/movies', function(req, res) {
    db.serialize(function() {
        db.all("SELECT * FROM movies", function(err, row) {
            row.forEach(function(element) {
                element.keywords = element.keywords.split(',');
            }, this);
            res.render('movies', {
                title: "Movie App",
                layoutTitle: "My Movies",
                movies: row
            });
        });
    })
});

app.get('/movies/json', function(req, res) {
    db.serialize(function() {
        db.all("SELECT * FROM movies", function(err, row) {
            row.forEach(function(element) {
                element.keywords = element.keywords.split(',');
            }, this);
            res.send(row);
        });
    })
});

app.get('/movies/details/:id', function(req, res) {
    db.serialize(function() {
        db.get("SELECT * FROM movies where id = (?)", req.param("id"), function(err, row) {
            row.imageCompressed = false;
            row.keywords = row.keywords.split(',');
            row.title = 'Movie App';
            row.layoutTitle = 'My Movies';
            res.render('detail', row);
        });
    });
});

app.get('/movies/list', function(req, res) {
    db.serialize(function() {
        db.all("SELECT * FROM movies", function(err, row) {
            row.forEach(function(element) {
                element.keywords = element.keywords.split(',');
            }, this);
            res.render('movies', {
                title: "Movie App",
                layoutTitle: "My Movies",
                movies: row
            });
        });
    })
});

app.get('/movies/list/json', function(req, res) {
    db.serialize(function() {
        db.all("SELECT * FROM movies", function(err, row) {
            row.forEach(function(element) {
                element.keywords = element.keywords.split(',');
            }, this);
            res.send(row);
        });
    })
});

app.get('/movies/create', function(req, res) {
    res.render('create', {
        title: "Movie App",
        layoutTitle: "Add a new movie",
        invalidName: false,
        invalidDescription: false,
        invalidKeywords: false,
        invalidImage: false,
        idNameField: "name",
        idDescriptionField: "description",
        idImageField: "image",
        imageField: "Image",
        buttonText: "Submit",
        idKeywordsField: "keywords"
    });
});



app.get('/404', function(req, res) {
    res.status(404);
    res.send("{\"statusCode\":\"404\"}");
});

app.get('/protected', function(req, res) {
    res.status(401);
    res.send("{\"statusCode\":\"401\"}");
});

app.get('/error', function(req, res) {
    res.status(500);
    res.send("{\"statusCode\":\"500\"}");
});

app.all('/notimplemented', function(req, res) {
    var statusCode = 200;
    if (allowedMethod.indexOf(req.method) < 0) {
        statusCode = 501;
    }
    res.status(statusCode);
    res.set('Allow', allowedMethod);
    res.send("{\"statusCode\":\"" + statusCode + "\"}")
});

app.get('/login', function(req, res) {
    res.set('Content-type', 'text/html');
    res.sendFile(__dirname + '/login.html');
});

app.post('/login', function(req, res) {
    res.status(200);
    res.set('Content-Type', 'application/json');
    if (req.headers['content-type'] == 'application/json') {
        res.send(res.body);
    } else {
        var jsonResponse = "{\"username\":\"" + req.username + "\"" +
            ",\"password\":\"" + req.password + "\"}";
        res.send(jsonResponse);
    }
});

app.all('*', function(req, res) {
    var fullHost = req.get('host').split(':');
    var host = fullHost[0];
    var port = fullHost[1];
    var method = req.method;
    var path = req.originalUrl;
    var arr = Object.keys(req.headers).map(function(key) {
        return req.headers[key].toString()
    });
    var headers = JSON.stringify(arr);
    var jsonResponse = "{\"method\":" + "\"" + method + "\"" +
        ",\"path\":" + "\"" + path + "\"" +
        ",\"host\":" + "\"" + host + "\"" +
        ",\"port\":" + "\"" + port + "\"" +
        ",\"header\":" + headers + "}";
    res.send(jsonResponse);
});

app.listen(8084, function() {
    console.log('listening on port 8084...');
});