var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./db/movies.sqlite3');

db.serialize(function() {
    db.run("CREATE TABLE movies (id TEXT PRIMARY KEY, name TEXT, description TEXT, keywords TEXT, image TEXT)");
});

db.close();