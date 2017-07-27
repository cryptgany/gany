require('dotenv').config();

var ccxt = require ('ccxt')

function Yobit(pump_events, skip_volumes = 0.5) {
  this.exchange_name = 'Yobit'
  this.code = 'Yobit'
  this.client = ccxt.yobit()
  this.all_markets = [];
  this.markets = []; // after selecting only good volume markets
  this.market_data = [];
  this.pump_events = pump_events;
  this.skip_volumes = 0.01 // skip markets with lower than this volume
  this.ticker_speed = 5 // seconds
  this.cycle_time = 20 // minutes
}

Yobit.prototype.watch = function() {
  this.get_markets((e) => {
    Object.keys(e).forEach((key) => {
      if (e[key].info.hidden == 0 && e[key].id.endsWith('btc'))
        this.all_markets.push(e[key].id)
    })
  });

  setTimeout(() => { this._select_good_volume_markets() }, 5 * 1000)
  setTimeout(() => { this._watch_tickers() }, 10 * 1000)
}

Yobit.prototype._watch_tickers = function() {
  cycles = Math.ceil(this.markets.length / 50)
  for(i = 0; i < cycles; i++) {
    ticker_str = this.markets.slice(i * 50, (i+1) * 50).join("-")
    this.client.apiGetTickerPairs({'pairs': ticker_str}).then((data) => {
      if (data.error) {
        console.log("Error trying to retrieve yobit data on _watch_tickers:", data.error)
      } else {
        Object.keys(data).forEach((market) => {
          this.pump_events.emit('marketupdate', 'TICKER', this.code, market.toUpperCase().replace(/\_/, '-'), this._normalize_ticker_data(data[market]));
        })
      }
    })
  }
  setTimeout(() => { this._watch_tickers() }, this.ticker_speed * 1000)
}

Yobit.prototype._select_good_volume_markets = function() {
  this.markets = []
  cycles = Math.ceil(this.all_markets.length / 50)
  for(i = 0; i < cycles; i++) {
    ticker_str = this.all_markets.slice(i * 50, (i+1) * 50).join("-")
    this.client.apiGetTickerPairs({'pairs': ticker_str}).then((data) => {
      if (data.error) {
        console.log("Error trying to retrieve yobit data on _select_good_volume_markets:", data.error)
      } else {
        Object.keys(data).forEach((market) => {
          if (data[market].vol >= this.skip_volumes)
            this.markets.push(market)
        })
      }
    })
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
  this.client.load_products().then(callback)
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
    bid: data.buy
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
