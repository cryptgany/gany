var MongoClient = require('mongodb').MongoClient;

url = "mongodb://localhost:27017/detektor";
collection = collection
tickers_history_collection = 'tickers_history';
tickers_blacklist_collection = 'tickers_blacklist';


MongoClient.connect(url, (err, db) => {
  if(err) { return console.dir(err); }
  var collection = db.collection(tickers_history_collection);
  collection.remove({}, (err, removed) => {if (err) console.log("Could not clear tickers history collection:", err)}); // clear old tickers before storing new


  var collection = db.collection(tickers_blacklist_collection);
  collection.remove({}, (err, removed) => {if (err) console.log("Could not clear tickers history collection:", err)}); // clear old tickers before storing new
})