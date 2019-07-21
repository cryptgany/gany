require('dotenv').config();
var MongoClient = require('mongodb').MongoClient;

function Database(collection = "") {
  this.url = process.env.MONGODB_URI || "mongodb://localhost:27017/detektor";
  this.collection = collection
  this.tickers_blacklist_collection = 'tickers_blacklist';
}

// TICKERS BLACKLIST
Database.prototype.store_tickers_blacklist = function(tickers) {
  MongoClient.connect(this.url, (err, db) => {
    if(err) { return console.dir(err); }
    var collection = db.collection(this.tickers_blacklist_collection);

    collection.remove({}, (err, removed) => {if (err) console.log("Could not clear tickers blacklist collection:", err)
      collection.insert(tickers, (err, result) => {
        if (err) { console.log("Error storing data on", this.tickers_blacklist_collection, err) }
        setTimeout(() => { db.close() }, 1000)
      });
    }); // clear old tickers before storing new
  })
}

Database.prototype.get_tickers_blacklist = function(callback) {
  MongoClient.connect(this.url, (err, db) => {
    if(err) { return console.dir(err); }

    var collection = db.collection(this.tickers_blacklist_collection);

    collection.find().toArray((err, data) => {
      callback(err, data)
      db.close()
    })
  })
}

// Model-like functions
Database.prototype.store_data = function(data, callback) {
  MongoClient.connect(this.url, (err, db) => {
    if(err) { return console.dir(err); }
    var collection = db.collection(this.collection);

    collection.insert(data, (err, result) => {
      if (err) { console.log("Error storing data on", this.collection, err) } else { callback(result) }
      db.close()
    });
  })
}

Database.prototype.read_data = function(query = {}, callback) {
  MongoClient.connect(this.url, (err, db) => {
    if(err) { return console.dir(err); }

    var collection = db.collection(this.collection);
    collection.find(query).toArray((err, data) => {
      callback(err, data)
      db.close()
    })
  })
}

Database.prototype.delete_data = function(query, callback) {
  MongoClient.connect(this.url, (err, db) => {
    if(err) { return console.dir(err); }
    var collection = db.collection(this.collection);

    collection.remove(query, callback);
  })
}

module.exports = Database;
