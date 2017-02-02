var sqlite3 = require('sqlite3');
var yalmConfig = require('node-yaml-config');
var sqliteConfig = yalmConfig.load('./database.yml');
var db = new sqlite3.Database(sqliteConfig.path);

db.serialize(function() {
    db.run("CREATE TABLE movies (id TEXT PRIMARY KEY, \
    name TEXT, description TEXT, keywords TEXT, image TEXT, \
    compressedThumbnail TEXT NULL, smallThumbnail TEXT NULL, \
    mediumThumbnail TEXT NULL, largeThumbnail TEXT NULL)");
});

db.close();