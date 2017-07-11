require('dotenv').config();

const Yobit = require('yobit');

function YobitClient(pump_events) {
  this.client = new Yobit(process.env.YOBIT_KEY, process.env.YOBIT_SECRET);
  this.markets = [];
  this.market_data = [];
  this.pump_events = pump_events;

  this.client.publicRequest('info', {}, (err, e) => {
    Object.keys(e.pairs).forEach((key) => {
      if (e.pairs[key].hidden == 0 && key.endsWith('btc'))
        this.markets.push(key)
    })
  });


  setTimeout(() => { this._watch_tickers() }, 10 * 1000)
}

YobitClient.prototype.getmarkets = function(callback) {
  this.client.getmarketsummaries( callback );
}

YobitClient.prototype._watch_tickers = function() {
  var self = this
  cycles = Math.ceil(this.markets.length / 50)
  for(i = 0; i < cycles; i++) {
    ticker_str = this.markets.slice(i * 50, (i+1) * 50).join("-")
    self.client.getTicker((err, e) => {
      Object.keys(e).forEach((market) => {
        self.pump_events.emit('market', 'TRADE', 'YOBT', market, e[market]);
      })
    }, ticker_str)
  }
  setTimeout(() => { this._watch_tickers() }, 10 * 1000)
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

module.exports = YobitClient;
