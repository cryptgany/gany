require('dotenv').config();

const Yobit = require('yobit');

function YobitClient(pump_events) {
  this.client = new Yobit('', '');

  this.markets = [];
  this.market_data = {};

  this.client.publicRequest('info', {}, (err, e) => {
    Object.keys(e.pairs).forEach((key) => {
      if (e.pairs[key].hidden == 0 && key.endsWith('btc'))
        this.markets.push(key)
    })
  });
https://yobit.net/api/3/depth/ltc_btc-nmc_btc
  this.ticker_str = this.markets.slice(50, 100).join("-")
  this.client.getTicker((err, e) => { this.market_data = e; }, ticker_str)

this.market_data
}

YobitClient.prototype.getmarkets = function(callback) {
  this.client.getmarketsummaries( callback );
}

YobitClient.prototype.start = function() {
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
  setTimeout(() => {
    // Listen to markets updates
    self = this;
    self.client.websockets.listen((data) => {
      if (data.M === 'updateSummaryState') {
        // console.log("SECOND UPDATE", data.A);
        data.A.forEach(function(data_for) {
          data_for.Deltas.forEach(function(marketsDelta) {
            // console.log('Ticker Update for '+ marketsDelta.MarketName, marketsDelta);
            self.pump_events.emit('marketupdate', 'TICKER', 'BTRX', marketsDelta.MarketName, marketsDelta);
          });
        });
      }
    });
  }, 5000); // give time for first subscriber to subscribe
}

// Implement standard functions
YobitClient.prototype.get_order = function(order_id, callback) {
  this.client.getorder({ uuid : orderId }, callback);
}

YobitClient.prototype.buy_order = function(market, quantity, rate, callback) {
  var url = 'https://bittrex.com/api/v1.1/market/buylimit?market=' + market + "&quantity=" + quantity + "&rate=" + rate;
  this.client.sendCustomRequest( url, callback, true );
}

YobitClient.prototype.sell_order = function(market, quantity, rate, callback) {
  var url = 'https://bittrex.com/api/v1.1/market/selllimit?market=' + market + "&quantity=" + quantity + "&rate=" + rate;
  this.client.sendCustomRequest( url, callback, true );
}

YobitClient.prototype.cancel_order = function(uuid, callback) {
  var url = 'https://bittrex.com/api/v1.1/market/cancel?uuid=' + uuid;
  this.client.sendCustomRequest( url, callback, true );
}

module.exports = Bittrex;
