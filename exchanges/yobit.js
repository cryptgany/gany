require('dotenv').config();

const YobitClient = require('yobit');

function Yobit(pump_events, skip_volumes = 0.5) {
  this.exchange_name = 'Yobit'
  this.code = 'Yobit'
  this.client = new YobitClient(process.env.YOBIT_KEY, process.env.YOBIT_SECRET);
  this.all_markets = [];
  this.markets = []; // after selecting only good volume markets
  this.market_data = [];
  this.pump_events = pump_events;
  this.skip_volumes = 0.01 // skip markets with lower than this volume
  this.ticker_speed = 15 // seconds
  this.cycle_time = 20 // minutes
}

Yobit.prototype.watch = function() {
  this.get_markets((err, e) => {
    Object.keys(e.pairs).forEach((key) => {
      if (e.pairs[key].hidden == 0 && key.endsWith('btc'))
        this.all_markets.push(key)
    })
  });

  setTimeout(() => { this._select_good_volume_markets() }, 5 * 1000)
  setTimeout(() => { this._watch_tickers() }, 10 * 1000)
}

Yobit.prototype._watch_tickers = function() {
  var self = this
  cycles = Math.ceil(this.markets.length / 50)
  cycle = 0
  for(i = 0; i < cycles; i++) {
    setTimeout(() => {
      ticker_str = self.markets.slice(cycle * 50, (cycle+1) * 50).join("-")
      self.client.getTicker((err, e) => {
        if (e == undefined) {
          console.log('Failed to retrieve yobit data: ', err)
        } else {
          Object.keys(e).forEach((market) => {
            self.pump_events.emit('marketupdate', 'TICKER', self.code, market.toUpperCase().replace(/\_/, '-'), self._normalize_ticker_data(e[market]));
          })
        }
      }, ticker_str)
      cycle++;
    }, 800 * i)
  }
  setTimeout(() => { this._watch_tickers() }, this.ticker_speed * 1000)
}

Yobit.prototype._select_good_volume_markets = function() {
  var self = this
  this.markets = []
  cycles = Math.ceil(this.all_markets.length / 50)
  cycle = 0
  for(i = 0; i < cycles; i++) {
    setTimeout(() => {
      ticker_str = self.all_markets.slice(cycle * 50, (cycle+1) * 50).join("-")
      self.client.getTicker((err, e) => {
        if (err) {
          console.log('Failed to retrieve yobit data: ', err)
        } else {
          Object.keys(e).forEach((market) => {
            if (e[market].vol >= self.skip_volumes)
              self.markets.push(market)
          })
        }
      }, ticker_str)
      cycle++;
    }, 500 * cycle)
  }
  setTimeout(() => { this._select_good_volume_markets() }, 15 * 60 * 1000) // update markets on track every hour
}

Yobit.prototype.market_url = function(market) {
  cur = market.split("-")[0].toLowerCase(0)
  return "http://yobit.net/en/trade/" + cur + "/BTC"
}

// Implement standard functions
Yobit.prototype.balance = function(callback) {
  this.client.getInfo(callback) // implement later
}

Yobit.prototype.get_markets = function(callback) {
  this.client.publicRequest('info', {}, callback)
}

Yobit.prototype.get_order = function(order_id, callback) {
  this.client.privateRequest('OrderInfo', { order_id: order_id }, (err, data) => {
    callback({
      success: data.success == 1,
      message: data.error,
      result: this._parse_order(data.return)[0]
    })
  })
}

Yobit.prototype.get_orders = function(market, callback) {
  market = market.toLowerCase().replace(/\-/, '_')
  this.client.privateRequest('ActiveOrders', { pair: market }, (err, data) => {
    callback({
      success: data.success == 1,
      message: data.error,
      result: this._parse_order(data.return)
    })
  })
}

Yobit.prototype.get_all_orders = function(callback) { // pair is required
  this.client.privateRequest('ActiveOrders', { }, (err, data) => {
    callback({
      success: data.success == 1,
      message: data.error,
      result: this._parse_order(data.return)
    })
  })
}

Yobit.prototype.buy_order = function(market, quantity, rate, callback) {
  market = market.toLowerCase().replace(/\-/, '_')
  params = { pair: market, type: 'buy', rate: rate.toFixed(8), amount: quantity }
  this.client.privateRequest('Trade', params, (err, data) => {
    callback(
      { success: data.success == 1,
      message: data.error,
      result: { id: data.success == 1 ? data.return.order_id : undefined } }
    )
  })
}

Yobit.prototype.sell_order = function(market, quantity, rate, callback) {
  market = market.toLowerCase().replace(/\-/, '_')
  params = { pair: market, type: 'sell', rate: rate.toFixed(8), amount: quantity }
  this.client.privateRequest('Trade', params, (err, data) => {
    callback(
      { success: (data.success == 1),
      message: data.error,
      result: { id: (data.success == 1 ? data.return.order_id : undefined) } }
    )
  })
}

Yobit.prototype.cancel_order = function(order_id, callback) {
  this.client.privateRequest('CancelOrder', { order_id: order_id }, (err, data) => {
    callback({
      success: data.success == 1,
      return: data.return
    })
  })
}

Yobit.prototype.cancel_all_orders = function(market) { // emergency function
  this.get_orders(market, (response) => {
    response.result.forEach((order, n) => {
      setTimeout(() => {
        console.log("canceling order " + order.id)
        this.cancel_order(order.id, (err, info) => { console.log("order deleted", err, info) })
      }, 1000 * (n + 1))
    })
  })
}

Yobit.prototype._normalize_ticker_data = function(data) {
  return {
    high: data.high,
    low: data.low,
    avg: data.avg,
    volume: data.vol,
    last: data.last,
    ask: data.sell,
    bid: data.buy,
    updated: data.updated
  }
}

Yobit.prototype._parse_order = function(e) {
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
      status: order.status,
      closed: order.status == 1
    }
  })
}

module.exports = Yobit;
