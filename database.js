var MongoClient = require('mongodb').MongoClient;

function Database() {
  this.url = "mongodb://localhost:27017/detektor";
  this.tickers_history_collection = 'tickers_history';
  this.tickers_blacklist_collection = 'tickers_blacklist';
}


// TICKERS HISTORY
Database.prototype.store_tickers_history = function(tickers) {
  MongoClient.connect(this.url, (err, db) => {
    if(err) { return console.dir(err); }
    var collection = db.collection(this.tickers_history_collection);

    collection.remove({}, (err, removed) => {if (err) console.log("Could not clear tickers history collection:", err)}); // clear old tickers before storing new

    Object.keys(tickers).forEach((exchange) => {
      Object.keys(tickers[exchange]).forEach((market) => {
        record = {
          exchange: exchange,
          market: market,
          tickers: tickers[exchange][market]
        }
        collection.insert(record, (err, result) => {
          if (err) { console.log("Error storing data on", this.tickers_history_collection, err) }
        });
      })
    })
  })
}

Database.prototype.get_tickers_history = function(callback) {
  MongoClient.connect(this.url, (err, db) => {
    if(err) { return console.dir(err); }

    var collection = db.collection(this.tickers_history_collection);

    collection.find().toArray(callback)
  })
}


// TICKERS BLACKLIST
Database.prototype.store_tickers_blacklist = function(tickers) {
  MongoClient.connect(this.url, (err, db) => {
    if(err) { return console.dir(err); }
    var collection = db.collection(this.tickers_blacklist_collection);

    collection.remove({}, (err, removed) => {if (err) console.log("Could not clear tickers blacklist collection:", err)}); // clear old tickers before storing new
    collection.insert(tickers, (err, result) => {
      if (err) { console.log("Error storing data on", this.tickers_blacklist_collection, err) }
    });
  })
}

Database.prototype.get_tickers_blacklist = function(callback) {
  MongoClient.connect(this.url, (err, db) => {
    if(err) { return console.dir(err); }

    var collection = db.collection(this.tickers_blacklist_collection);

    collection.find().toArray(callback)
  })
}

module.exports = Database;
