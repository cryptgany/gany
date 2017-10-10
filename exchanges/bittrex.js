require('dotenv').config();

const BittrexClient = require('node.bittrex.api');

function Bittrex(logger, pump_events) {
  this.logger = logger
  this.exchange_name = 'Bittrex'
  this.code = 'Bittrex'
  this.client = BittrexClient;
  this.client.options({
    'apikey' : process.env.BITTREX_KEY,
    'apisecret' : process.env.BITTREX_SECRET,
    'stream' : false, // will be removed from future versions
    'verbose' : false,
    'cleartext' : false
  });

  this.markets = [];
  this.skip_volumes = 0.5
  this.ticker_speed = 5 // seconds
  this.cycle_time = 20 // minutes

  this.pump_events = pump_events; // push updates
}

Bittrex.prototype.watch = function() {
  this._select_good_volume_markets()
  setTimeout(() => { this._watch_tickers() }, 5 * 1000)
}

Bittrex.prototype.volume_for = function(pair) {
  return pair.split("-")[0]
}

Bittrex.prototype._watch_tickers = function() { // watches markets every 10 seconds
  var self = this
  self.client.getmarketsummaries((data) => {
    if (data.success) {
      tickers = data.result
      tickers.forEach((data) => {
        if (this.markets.indexOf(data.MarketName) != -1)
          self.pump_events.emit('marketupdate', 'TICKER', self.code, data.MarketName, self._normalize_ticker_data(data));
      });
    } else {
      this.logger.error("Error getting Bittrex tickers: ", data)
    }
  });
  setTimeout(() => { this._watch_tickers() }, this.ticker_speed * 1000)
}

Bittrex.prototype._watch_trades = function() {
  // listen to market orders
  var self = this;
  self.client.websockets.subscribe(self.markets, function(data) {
    if (data.M === 'updateExchangeState') {
      data.A.forEach(function(data_for) {
        // console.log("First", data_for);
        self.pump_events.emit('marketupdate', 'TRADE', 'Bittrex', data_for.MarketName, data_for);
      });
    }
  });
}

Bittrex.prototype._select_good_volume_markets = function() {
  this.markets = []
  this.get_markets((info) => {
    if (info.result) {
      info.result.forEach((market_info) => {
        if (market_info.MarketName.match(/^(BTC|ETH|(USDT\-ETH|USDT\-BTC))/) && !market_info.MarketName.match(/BITCNY/) && market_info.BaseVolume >= this.skip_volumes)
          this.markets.push(market_info.MarketName);
      });
    } else {
      this.logger.error("Error trying to fetch data from bittrex:", info)
    }
  });
  setTimeout(() => { this._select_good_volume_markets() }, 15 * 60 * 1000) // update markets on track every hour
}

// Implement standard functions


Bittrex.prototype.market_url = function(market) {
  return "https://bittrex.com/Market/Index?MarketName=" + market
}

Bittrex.prototype.marketList = function() {
  return this.markets
}

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
    price_per_unit: e.PricePerUnit,
    commission: e.CommissionPaid,
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
