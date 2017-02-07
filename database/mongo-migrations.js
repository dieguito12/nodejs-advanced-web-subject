var mongo = require('mongodb');
var mongoClient = mongo.MongoClient;
var yalmConfig = require('node-yaml-config');
var mongoConfig = yalmConfig.load('./mongo-database.yml');

mongoClient.connect(mongoConfig.conectionString, function(err, db) {
    if (err) {
        return console.error(err);
    }
    db.createCollection('movies', function(err, collection) {});
    return console.log('Database created');
    db.close();
});