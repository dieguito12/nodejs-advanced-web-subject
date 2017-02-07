var express = require('express');
var app = express();
var redis = require('redis');
var yalmConfig = require('node-yaml-config');
var mongo = require('mongodb');
var mongoClient = mongo.MongoClient;
var mongoConfig = yalmConfig.load('./mongo-database.yml');
var redisConfig = yalmConfig.load('./redis.yml');
var tinifyConfig = yalmConfig.load('./tinify.yml');
var tinify = require('tinify');
var sharp = require('sharp');
var redisClient = redis.createClient(redisConfig.port, redisConfig.host);
var redisSubsClient = redis.createClient(redisConfig.port, redisConfig.host);

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
                        mongoClient.connect(mongoConfig.conectionString, function(err, db) {
                            if (err) {
                                return console.error(err);
                            }
                            var collectionMovies = db.collection('movies');
                            collectionMovies.update({ image: fullPath }, { $set: { compressedThumbnail: "/compressed_" + fileName } },
                                function(err, result) {
                                    if (err) {
                                        console.error(err);
                                    } else {
                                        console.log('Compressed image created');
                                    }
                                    db.close();
                                });
                        });
                    }
                });
                sharp(__dirname + '/public/' + fullPath).resize(80, 120, { centerSampling: true }).toFile(smallFilePath, function(err, info) {
                    if (err) {
                        console.error('Error creating small thumbnail: ' + err);
                    } else {
                        mongoClient.connect(mongoConfig.conectionString, function(err, db) {
                            if (err) {
                                return console.error(err);
                            }
                            var collectionMovies = db.collection('movies');
                            collectionMovies.update({ image: fullPath }, { $set: { smallThumbnail: "/small_" + fileName } },
                                function(err, result) {
                                    if (err) {
                                        console.error(err);
                                    } else {
                                        console.log('Small thumbnail created');
                                    }
                                    db.close();
                                });
                        });
                    }
                });
                sharp(__dirname + '/public/' + fullPath).resize(110, 170, { centerSampling: true }).toFile(mediumFilePath, function(err, info) {
                    if (err) {
                        console.error('Error creating medium thumbnail: ' + err);
                    } else {
                        mongoClient.connect(mongoConfig.conectionString, function(err, db) {
                            if (err) {
                                return console.error(err);
                            }
                            var collectionMovies = db.collection('movies');
                            collectionMovies.update({ image: fullPath }, { $set: { mediumThumbnail: "/medium_" + fileName } },
                                function(err, result) {
                                    if (err) {
                                        console.error(err);
                                    } else {
                                        console.log('Medium thumbnail created');
                                    }
                                    db.close();
                                });
                        });
                    }
                });
                sharp(__dirname + '/public/' + fullPath).resize(150, 210, { centerSampling: true }).toFile(largeFilePath, function(err, info) {
                    if (err) {
                        console.error('Error creating large thumbnail: ' + err);
                    } else {
                        mongoClient.connect(mongoConfig.conectionString, function(err, db) {
                            if (err) {
                                return console.error(err);
                            }
                            var collectionMovies = db.collection('movies');
                            collectionMovies.update({ image: fullPath }, { $set: { largeThumbnail: "/large_" + fileName } },
                                function(err, result) {
                                    if (err) {
                                        console.error(err);
                                    } else {
                                        console.log('Large thumbnail created');
                                    }
                                    db.close();
                                });
                        });
                    }
                });
            } catch (err) {
                console.error('Error creating thumbnails: ' + err);
            }
        }
    });
});