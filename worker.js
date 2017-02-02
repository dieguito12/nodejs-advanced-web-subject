var express = require('express');
var app = express();
var redis = require('redis');
var sqlite3 = require('sqlite3');
var yalmConfig = require('node-yaml-config');
var redisConfig = yalmConfig.load('./redis.yml');
var sqliteConfig = yalmConfig.load('./database.yml');
var tinifyConfig = yalmConfig.load('./tinify.yml');
var tinify = require('tinify');
var sharp = require('sharp');
var redisClient = redis.createClient(redisConfig.port, redisConfig.host);
var redisSubsClient = redis.createClient(redisConfig.port, redisConfig.host);

var db = new sqlite3.Database(sqliteConfig.path, sqlite3.OPEN_READWRITE);

tinify.key = tinifyConfig.key;
var uploadedImage = null;
app.use(express.static('public'));

redisSubsClient.on('connect', function() {
    console.log('Redis Subscriber connected');
});

redisClient.on('connect', function() {
    console.log('Redis Publisher connected');
});

redisSubsClient.config('set', 'notify-keyspace-events', 'KEA');

redisSubsClient.subscribe('__keyevent@0__:set', 'diego:uploadedImage');

redisSubsClient.on('message', function(channel, key) {
    redisClient.get('diego:uploadedImage', function(err, reply) {
        if (err) {
            console.error('Error getting key from redis: ' + err);
        } else if (reply) {
            try {
                redisClient.del('diego:uploadedImage');
                var fullPath = reply;
                var fileName = reply.split('/');
                fileName = fileName[2];
                var compressedFilePath = __dirname + "/generated/compressed_" + fileName;
                var smallFilePath = __dirname + "/generated/small_" + fileName;
                var mediumFilePath = __dirname + "/generated/medium_" + fileName;
                var largeFilePath = __dirname + "/generated/large_" + fileName;

                tinify.fromFile(__dirname + '/public/' + fullPath).toFile(compressedFilePath, function(err) {
                    if (err) {
                        console.error('Error creating compressed image: ' + err);
                    } else {
                        db.serialize(function() {
                            var statement = db.prepare("UPDATE movies set compressedThumbnail = (?) where image = (?)");
                            statement.run("/compressed_" + fileName, fullPath);
                            statement.finalize();
                        });
                        console.log('Compressed image created');
                    }
                });
                sharp(__dirname + '/public/' + fullPath).resize(80, 120, { centerSampling: true }).toFile(smallFilePath, function(err, info) {
                    if (err) {
                        console.error('Error creating small thumbnail: ' + err);
                    } else {
                        db.serialize(function() {
                            var statement = db.prepare("UPDATE movies set smallThumbnail = (?) where image = (?)");
                            statement.run("/small_" + fileName, fullPath);
                            statement.finalize();
                        });
                        console.log('Small thumbnail created');
                    }
                });
                sharp(__dirname + '/public/' + fullPath).resize(110, 170, { centerSampling: true }).toFile(mediumFilePath, function(err, info) {
                    if (err) {
                        console.error('Error creating medium thumbnail: ' + err);
                    } else {
                        db.serialize(function() {
                            var statement = db.prepare("UPDATE movies set mediumThumbnail = (?) where image = (?)");
                            statement.run("/medium_" + fileName, fullPath);
                            statement.finalize();
                        });
                        console.log('Medium thumbnail created');
                    }
                });
                sharp(__dirname + '/public/' + fullPath).resize(150, 210, { centerSampling: true }).toFile(largeFilePath, function(err, info) {
                    if (err) {
                        console.error('Error creating large thumbnail: ' + err);
                    } else {
                        db.serialize(function() {
                            var statement = db.prepare("UPDATE movies set largeThumbnail = (?) where image = (?)");
                            statement.run("/large_" + fileName, fullPath);
                            statement.finalize();
                        });
                        console.log('Large thumbnail created');
                    }
                });
            } catch (err) {
                console.error('Error creating thumbnails: ' + err);
            }
        }
    });
});