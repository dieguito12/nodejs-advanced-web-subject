var express = require('express');
var app = express();
var exphbs = require('express-handlebars');
var multer = require('multer')
var mkdirp = require('mkdirp');
var uuid = require('uuid-v4');
var redis = require('redis');
var cors = require('cors');
var yalmConfig = require('node-yaml-config');
var redisConfig = yalmConfig.load('./redis.yml');
var redisClient = redis.createClient(redisConfig.port, redisConfig.host);
var mongo = require('mongodb');
var mongoClient = mongo.MongoClient;
var mongoConfig = yalmConfig.load('./mongo-database.yml');

redisClient.on('connect', function() {
    console.log('Redis connected');
});

var validUUID = true;

var newFilePath = "";

app.use(express.static('public'));
app.use(express.static('generated'));
app.use(cors());
app.disable('etag');

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

    var movie = {
        name: req.body.name,
        description: req.body.description,
        keywords: req.body.keywords,
        image: newFilePath
    };

    mongoClient.connect(mongoConfig.conectionString, function(err, db) {
        if (err) {
            return console.error(err);
        }
        var collectionMovies = db.collection('movies');
        collectionMovies.insert(movie, function(err, result) {
            if (err) {
                console.error(err);
            } else {
                redisClient.set("diego:uploadedImage", newFilePath);
            }
            db.close();
        });
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
    mongoClient.connect(mongoConfig.conectionString, function(err, db) {
        if (err) {
            return console.error(err);
        }
        var collectionMovies = db.collection('movies');
        collectionMovies.find().toArray(function(err, result) {
            result.forEach(function(element) {
                element.keywords = element.keywords.split(',');
            }, this);
            res.render('movies', {
                title: "Movie App",
                layoutTitle: "My Movies",
                movies: result
            })
            db.close();
        });
    });

});

app.get('/movies/json', function(req, res) {
    res.status(200);
    res.set('Content-Type', 'application/json');
    mongoClient.connect(mongoConfig.conectionString, function(err, db) {
        if (err) {
            return console.error(err);
        }
        var collectionMovies = db.collection('movies');
        collectionMovies.find().toArray(function(err, result) {
            result.forEach(function(element) {
                element.keywords = element.keywords.split(',');
                element.image = "http://" + req.headers.host + element.image;
                if (!element.compressedThumbnail) {
                    element.compressedThumbnail = "";
                }
                if (!element.smallThumbnail) {
                    element.smallThumbnail = "";
                }
                if (!element.mediumThumbnail) {
                    element.mediumThumbnail = "";
                }
                if (!element.largeThumbnail) {
                    element.largeThumbnail = "";
                }
                element.compressedThumbnail = "http://" + req.headers.host + element.compressedThumbnail;
                element.smallThumbnail = "http://" + req.headers.host + element.smallThumbnail;
                element.mediumThumbnail = "http://" + req.headers.host + element.mediumThumbnail;
                element.largeThumbnail = "http://" + req.headers.host + element.largeThumbnail;
            }, this);
            res.send(result);
        })
        db.close();
    });

});

app.get('/movies/details/:id', function(req, res) {
    mongoClient.connect(mongoConfig.conectionString, function(err, db) {
        if (err) {
            return console.error(err);
        }
        var collectionMovies = db.collection('movies');
        var objectId = new mongo.ObjectID(req.param("id"));
        collectionMovies.findOne({ _id: objectId }, function(err, result) {
            result.imageCompressed = false;
            result.keywords = result.keywords.split(',');
            result.title = 'Movie App';
            result.layoutTitle = 'My Movies';
            res.render('detail', result);
            db.close();
        });
    });
});

app.get('/movies/list', function(req, res) {
    mongoClient.connect(mongoConfig.conectionString, function(err, db) {
        if (err) {
            return console.error(err);
        }
        var collectionMovies = db.collection('movies');
        collectionMovies.find().toArray(function(err, result) {
            result.forEach(function(element) {
                element.keywords = element.keywords.split(',');
            }, this);
            res.render('movies', {
                title: "Movie App",
                layoutTitle: "My Movies",
                movies: result
            })
            db.close();
        });
    });
});

app.get('/movies/list/json', function(req, res) {
    res.status(200);
    res.set('Content-Type', 'application/json');
    mongoClient.connect(mongoConfig.conectionString, function(err, db) {
        if (err) {
            return console.error(err);
        }
        var collectionMovies = db.collection('movies');
        collectionMovies.find().toArray(function(err, result) {
            result.forEach(function(element) {
                element.keywords = element.keywords.split(',');
                element.image = "http://" + req.headers.host + element.image;
                if (!element.compressedThumbnail) {
                    element.compressedThumbnail = "";
                }
                if (!element.smallThumbnail) {
                    element.smallThumbnail = "";
                }
                if (!element.mediumThumbnail) {
                    element.mediumThumbnail = "";
                }
                if (!element.largeThumbnail) {
                    element.largeThumbnail = "";
                }
                element.compressedThumbnail = "http://" + req.headers.host + element.compressedThumbnail;
                element.smallThumbnail = "http://" + req.headers.host + element.smallThumbnail;
                element.mediumThumbnail = "http://" + req.headers.host + element.mediumThumbnail;
                element.largeThumbnail = "http://" + req.headers.host + element.largeThumbnail;
            }, this);
            res.send(result);
            db.close();
        });
    });

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