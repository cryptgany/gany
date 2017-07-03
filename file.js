// Detector Lib in NodeJS

fs = require('fs');


fs.readFile('./original_debug.log', 'utf8', function (err,data) {
  if (err) {
    return console.log(err);
  }
  this.data = data.split("\n").map(function(elem) { return JSON.parse(elem); });
});

// get SLS
var all_sls = this.data.filter(function(e) { return e.MarketName.match(/SLS/); });

// filter by buy orders only
var buys = all_sls[1].Fills.filter(function(e) { return e.OrderType == 'BUY'; });

var object = all_sls[16];

function readme(object) {
  console.log(object.Buys.map(function(e) { return e.Rate * e.Quantity; }).reduce(function(sum, e) { return sum+e; }));

// sums BUY fills
  console.log(object.Fills.filter(function(e) { return e.OrderType == 'BUY'; }).map(function(e) { return e.Quantity * e.Rate; }).reduce(function(sum, e) { return sum+e; }));
  console.log(object.Fills[0].TimeStamp);
}
// sum BUYS

function readsells(object) {
  console.log(object.Sells.map(function(e) { return e.Rate * e.Quantity; }).reduce(function(sum, e) { return sum+e; }));
  // sums BUY fills
  console.log(object.Fills.filter(function(e) { return e.OrderType == 'SELL'; }).map(function(e) { return e.Quantity * e.Rate; }).reduce(function(sum, e) { return sum+e; }));
  console.log(object.Fills[0].TimeStamp);
}

var x = all_sls.filter(function(e) { return e.Fills.length > 0}).map(function(e) { 
  buys = e.Fills.filter(function(e) { return e.OrderType == 'BUY'; }).length;
  sells = e.Fills.filter(function(e) { return e.OrderType == 'SELL'; }).length;
  timestamp = e.Fills[0].TimeStamp
  winner = buys > sells ? " WINNER: buys" : " WINNER: sells";
  console.log("TIME: " + timestamp + ", buy amount: " + buys + ", sell amount: " + sells + winner);
}); 