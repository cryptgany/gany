// Detector Lib in NodeJS

fs = require('fs');
require('./protofunctions.js');

function rf(path, store) {
  fs.readFile(path, 'utf8', function (err,data) {
    data.split("\n").map(function(elem) { store.push(JSON.parse(elem)); });
  });
}

const PumpHandler = require('./pump_handler.js');
const EventEmitter = require('events');

class PumpEvents extends EventEmitter {}
const pumpEvents = new PumpEvents();

this.data = [];
rf('./debug.log', this.data);
rf('./log/5k_debug.log', this.data);
rf('./log/captain_debug.log', this.data);
rf('./log/debug-3h.log', this.data);
rf('./log/debug-4h.log', this.data);

var big_buys = this.data.filter(function(e) {
  if (e.Fills.length > 0) {
    buys = e.Fills.filter(function(e) { return e.OrderType == 'BUY'; });
    buy_amount = buys.length == 0 ? 0 : buys.map(function(e) { return e.Quantity * e.Rate; }).sum();

    if (buys.length > 50)
      return true;

    if (buy_amount > 5)
      return true;

  } else {
    return false;
  }
});

// identify pumps
var pumps = this.data.filter(function(e) {
  if (e.Fills.length > 0) {
    buys = e.Fills.filter(function(e) { return e.OrderType == 'BUY'; });
    buy_amount = buys.length == 0 ? 0 : buys.map(function(e) { return e.Quantity * e.Rate; }).sum();
    first_fill = e.Fills.last();
    last_fill = e.Fills.first();
    change = last_fill.Rate / first_fill.Rate;
    if ( (change > 1.05) && (buys.length > 50 || buy_amount > 5) )
      return true;

  } else {
    return false;
  }
});

// get SLS
var all_sls = this.data.filter(function(e) { return e.MarketName.match(/SLS/); });

// filter by buy orders only
var buys = all_sls[1].Fills.filter(function(e) { return e.OrderType == 'BUY'; });

var object = all_sls[16];

function readme(object) {
  console.log(object.Buys.map(function(e) { return e.Rate * e.Quantity; }).sum());

// sums BUY fills
  console.log(object.Fills.filter(function(e) { return e.OrderType == 'BUY'; }).map(function(e) { return e.Quantity * e.Rate; }).sum());
  console.log(object.Fills[0].TimeStamp);
}
// sum BUYS

function readsells(object) {
  console.log(object.Sells.map(function(e) { return e.Rate * e.Quantity; }).sum());
  // sums BUY fills
  console.log(object.Fills.filter(function(e) { return e.OrderType == 'SELL'; }).map(function(e) { return e.Quantity * e.Rate; }).sum());
  console.log(object.Fills[0].TimeStamp);
}

var x = pumps.filter(function(e) { return e.Fills.length > 0}).map(function(e) {
  buys = e.Fills.filter(function(e) { return e.OrderType == 'BUY'; });
  buy_amount = buys.length == 0 ? 0 : buys.map(function(e) { return e.Quantity * e.Rate; }).sum();
  sells = e.Fills.filter(function(e) { return e.OrderType == 'SELL'; });
  sell_amount = sells.length == 0 ? 0 : sells.map(function(e) { return e.Quantity * e.Rate; }).sum();
  first_fill = e.Fills.last();
  last_fill = e.Fills[0];
  change = last_fill.Rate / first_fill.Rate;
  winner = buys > sells ? " WINNER: buys" : " WINNER: sells";
  console.log("[" + e.MarketName + "] " + " [" + change + "]" + "[OPEN " + first_fill.TimeStamp + " " + first_fill.Rate + "] [CLOSE " + last_fill.TimeStamp + " " + last_fill.Rate + "] buy amount: " + buys.length + " (" + buy_amount.toFixed(4) + " BTC), sell amount: " + sells.length + "(" + sell_amount.toFixed(4) + " BTC)" + winner);
});
