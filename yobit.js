require('dotenv').config();

const Yobit = require('yobit');

function YobitClient(pump_events) {
  this.client = new Yobit(process.env.YOBIT_KEY, process.env.YOBIT_SECRET);
  this.markets = [];
  this.market_data = [];
  this.pump_events = pump_events;
}

YobitClient.prototype.watch = function() {
  this.get_markets((err, e) => {
    Object.keys(e.pairs).forEach((key) => {
      if (e.pairs[key].hidden == 0 && key.endsWith('btc'))
        this.markets.push(key)
    })
  });

  setTimeout(() => { this._watch_tickers() }, 10 * 1000)
}

YobitClient.prototype._watch_tickers = function() {
  var self = this
  cycles = Math.ceil(this.markets.length / 50)
  for(i = 0; i < cycles; i++) {
    ticker_str = this.markets.slice(i * 50, (i+1) * 50).join("-")
    self.client.getTicker((err, e) => {
      if (e == undefined) {
        console.log('Failed to retrieve yobit data: ', err)
      } else {
        Object.keys(e).forEach((market) => {
          self.pump_events.emit('marketupdate', 'TICKER', 'YOBT', market.toUpperCase().replace(/\_/, '-'), self._normalize_ticker_data(e[market]));
        })
      }
    }, ticker_str)
  }
  setTimeout(() => { this._watch_tickers() }, 10 * 1000)
}

// Implement standard functions
YobitClient.prototype.balance = function(callback) {
  this.client.getInfo(callback) // implement later
}

YobitClient.prototype.get_markets = function(callback) {
  this.client.publicRequest('info', {}, callback)
}

YobitClient.prototype.get_order = function(order_id, callback) {
  this.client.privateRequest('OrderInfo', { order_id: order_id }, (err, data) => {
    callback({
      success: data.success == 1,
      message: data.error,
      result: this._parse_order(data.return)
    })
  })
}

YobitClient.prototype.get_orders = function(market, callback) {
  market = market.toLowerCase().replace(/\-/, '_')
  this.client.privateRequest('ActiveOrders', { pair: market }, (err, data) => {
    callback({
      success: data.success == 1,
      message: data.error,
      result: this._parse_order(data.return)
    })
  })
}

YobitClient.prototype.get_all_orders = function(callback) { // pair is required
  this.client.privateRequest('ActiveOrders', { }, (err, data) => {
    callback({
      success: data.success == 1,
      message: data.error,
      result: this._parse_order(data.return)
    })
  })
}

YobitClient.prototype.buy_order = function(market, quantity, rate, callback) {
  market = market.toLowerCase().replace(/\-/, '_')
  params = { pair: market, type: 'buy', rate: rate, amount: quantity }
  this.client.privateRequest('Trade', params, (err, data) => {
    callback(
      { success: data.success == 1,
      message: data.error,
      result: { id: data.return.order_id } }
    )
  })
}

YobitClient.prototype.sell_order = function(market, quantity, rate, callback) {
  market = market.toLowerCase().replace(/\-/, '_')
  params = { pair: market, type: 'sell', rate: rate, amount: quantity }
  this.client.privateRequest('Trade', params, (err, data) => {
    callback(
      { success: data.success == 1,
      message: data.error,
      result: { id: data.return.order_id } }
    )
  })
}

YobitClient.prototype.cancel_order = function(order_id, callback) {
  this.client.privateRequest('CancelOrder', { order_id: order_id }, callback)
}

YobitClient.prototype.cancel_all_orders = function(market) { // emergency function
  this.get_orders(market, (response) => {
    response.result.forEach((order, n) => {
      setTimeout(() => {
        console.log("canceling order " + order.id)
        this.cancel_order(order.id, (err, info) => { console.log("order deleted", err, info) })
      }, 1000 * (n + 1))
    })
  })
}

YobitClient.prototype._normalize_ticker_data = function(data) {
  return {
    high: data.high,
    low: data.low,
    avg: data.avg,
    volume: data.vol,
    last: data.last,
    ask: data.buy,
    bid: data.sell,
    updated: data.updated
  }
}

YobitClient.prototype._parse_order = function(e) {
  if (e == undefined) return undefined
  return Object.keys(e).map((order_id) => {
    order = e[order_id]
    return {
      id: order_id,
      market: order.pair.toUpperCase().replace(/\_/, '-'),
      type: order.type == 'buy' ? 'ask' : 'bid',
      quantity: order.start_amount,
      quantity_remaining: order.amount,
      price: order.rate,
      price_per_unit: order.rate,
      opened: order.timestamp_created,
      status: order.status
    }
  })
}

module.exports = YobitClient;
