require('dotenv').config();

const BittrexClient = require('node.bittrex.api');

function Bittrex(pump_events) {
  this.client = BittrexClient;
  this.client.options({
    'apikey' : process.env.BITTREX_KEY,
    'apisecret' : process.env.BITTREX_SECRET,
    'stream' : false, // will be removed from future versions
    'verbose' : false,
    'cleartext' : false
  });

  this.markets = [];
  this.getmarkets((info) => {
    info.result.forEach((market_info) => {
      if (market_info.MarketName.match(/^BTC/))
        this.markets.push(market_info.MarketName);
    });

    this.start();
  });

  this.pump_events = pump_events; // push updates
}

Bittrex.prototype.getmarkets = function(callback) {
  this.client.getmarketsummaries( callback );
}

Bittrex.prototype.start = function() {
  setTimeout(() => {
    // listen to market orders
    var self = this;
    self.client.websockets.subscribe(self.markets, function(data) {
      if (data.M === 'updateExchangeState') {
        data.A.forEach(function(data_for) {
          // console.log("First", data_for);
          self.pump_events.emit('marketupdate', 'TRADE', 'BTRX', data_for.MarketName, data_for);
        });
      }
    });
  }, 1000);
  // setTimeout(() => {
  //   // Listen to markets updates
  //   self = this;
  //   self.client.websockets.listen((data) => {
  //     if (data.M === 'updateSummaryState') {
  //       // console.log("SECOND UPDATE", data.A);
  //       data.A.forEach(function(data_for) {
  //         data_for.Deltas.forEach(function(marketsDelta) {
  //           // console.log('Ticker Update for '+ marketsDelta.MarketName, marketsDelta);
  //           self.pump_events.emit('marketupdate', 'TICKER', 'BTRX', marketsDelta.MarketName, marketsDelta);
  //         });
  //       });
  //     }
  //   });
  // }, 5000); // give time for first subscriber to subscribe
  this._watch_tickers()
}

Bittrex.prototype._watch_tickers = function() { // watches markets every 10 seconds
  var self = this
  self.client.getmarketsummaries((data) => {
    if (data.success) {
      tickers = data.result
      tickers.forEach((data) => {
        self.pump_events.emit('marketupdate', 'TICKER', 'BTRX', data.MarketName, self._normalize_ticker_data(data));
      });
    } else {
      console.log("Error getting BTRX tickers: " + data.message)
    }
  });
  setTimeout(() => { this._watch_tickers() }, 10 * 1000)
}

Bittrex.prototype._normalize_ticker_data = function(data) {
  return {
    high: data.High,
    low: data.Low,
    volume: data.BaseVolume,
    last: data.Last,
    ask: data.Ask,
    bid: data.Bid,
    updated: data.TimeStamp
  }
}

// Implement standard functions
Bittrex.prototype.get_order = function(order_id, callback) {
  this.client.getorder({ uuid : orderId }, callback);
}

Bittrex.prototype.buy_order = function(market, quantity, rate, callback) {
  var url = 'https://bittrex.com/api/v1.1/market/buylimit?market=' + market + "&quantity=" + quantity + "&rate=" + rate;
  this.client.sendCustomRequest( url, callback, true );
}

Bittrex.prototype.sell_order = function(market, quantity, rate, callback) {
  var url = 'https://bittrex.com/api/v1.1/market/selllimit?market=' + market + "&quantity=" + quantity + "&rate=" + rate;
  this.client.sendCustomRequest( url, callback, true );
}

Bittrex.prototype.cancel_order = function(uuid, callback) {
  var url = 'https://bittrex.com/api/v1.1/market/cancel?uuid=' + uuid;
  this.client.sendCustomRequest( url, callback, true );
}

module.exports = Bittrex;
