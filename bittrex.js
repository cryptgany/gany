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

  this.pump_events = pump_events; // push updates
}

Bittrex.prototype.watch = function() {
  this.get_markets((info) => {
    info.result.forEach((market_info) => {
      if (market_info.MarketName.match(/^BTC/))
        this.markets.push(market_info.MarketName);
    });
  });
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

// Implement standard functions

Bittrex.prototype.get_markets = function(callback) {
  this.client.getmarketsummaries( callback );
}

Bittrex.prototype.balance = function(currency, callback) {
  this.client.getbalance({ 'currency': currency }, callback);
}

Bittrex.prototype.get_order = function(order_id, callback) {
  this.client.getorder({ uuid : order_id }, (response) => {
    response.result = this._parse_order(response.result)
    callback(response)
  })
}

Bittrex.prototype.get_orders = function(market, callback) {
  var url = 'https://bittrex.com/api/v1.1/market/getopenorders?market=' + market
  this.client.sendCustomRequest( url, (response) => {
    response.result = response.result.map((order) => { return this._parse_order(order) })
    callback(response)
  }, true );
}

Bittrex.prototype.get_all_orders = function(callback) {
  var url = 'https://bittrex.com/api/v1.1/market/getopenorders'
  this.client.sendCustomRequest( url, (response) => {
    response.result = response.result.map((order) => { return this._parse_order(order) })
    callback(response)
  }, true );
}

Bittrex.prototype.buy_order = function(market, quantity, rate, callback) {
  var url = 'https://bittrex.com/api/v1.1/market/buylimit?market=' + market + "&quantity=" + quantity + "&rate=" + rate;
  this.client.sendCustomRequest( url, (data) => {
    callback({ success: true,
      message: '',
      result: { id: data.result.uuid } })
  }, true );
}

Bittrex.prototype.sell_order = function(market, quantity, rate, callback) {
  var url = 'https://bittrex.com/api/v1.1/market/selllimit?market=' + market + "&quantity=" + quantity + "&rate=" + rate;
  this.client.sendCustomRequest( url, (data) => {
    callback({ success: true,
      message: '',
      result: { id: data.result.uuid } })
  }, true );
}

Bittrex.prototype.cancel_order = function(uuid, callback) {
  var url = 'https://bittrex.com/api/v1.1/market/cancel?uuid=' + uuid;
  this.client.sendCustomRequest( url, callback, true );
}

Bittrex.prototype.cancel_all_orders = function() { // emergency function
  this.get_all_orders((response) => {
    response.result.forEach((order) => {
      this.cancel_order(order.id, (e) => {  })
    })
  })
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

Bittrex.prototype._parse_order = function(e) {
  return {
    id: e.OrderUuid,
    market: e.Exchange,
    type: e.OrderType == 'LIMIT_BUY' ? 'ask' : 'bid',
    quantity: e.Quantity,
    quantity_remaining: e.QuantityRemaining,
    price: e.Limit,
    commission: e.CommissionPaid,
    Price: e.Price,
    price_per_unit: e.PricePerUnit,
    opened: e.Opened,
    closed: e.Closed
  }
  // NOT USED
  // CancelInitiated: false,
  // ImmediateOrCancel: false,
  // IsConditional: false,
  // Condition: 'NONE',
  // ConditionTarget: null
}

module.exports = Bittrex;
