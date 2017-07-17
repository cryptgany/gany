const PoloniexClient = require('poloniex-api-node');

function Poloniex(pump_events, skip_volumes = 0.5) {
  this.client = new PoloniexClient()
  this.all_markets = [];
  this.markets = []; // after selecting only good volume markets
  this.market_data = [];
  this.pump_events = pump_events;
  this.skip_volumes = 0.5 // skip markets with lower than this volume
  this.ticker_speed = 10 // seconds
}

Poloniex.prototype.watch = function() {
  // setTimeout(() => { this._watch_tickers() }, 10 * 1000)
  this._watch_tickers()
}

Poloniex.prototype._watch_tickers = function() {
  this.client.returnTicker((err, tickers) => {
    if (err) {
      console.log('Failed to retrieve poloniex data: ', err)
    } else {
      Object.keys(tickers).forEach((market) => {
        if (this._filter_market(tickers[market])) {
          console.log("TICKER UPDATE ON", market, this._normalize_ticker_data(tickers[market]))
        }
        // this.pump_events.emit('marketupdate', 'TICKER', 'POLO', market.replace(/\_/, '-'), this._normalize_ticker_data(tickers[market]));
      })
    }
  })
  setTimeout(() => { this._watch_tickers() }, this.ticker_speed * 1000)
}

Poloniex.prototype._select_good_volume_markets = function() {
  var self = this
  this.markets = []
  cycles = Math.ceil(this.all_markets.length / 50)
  cycle = 0
  for(i = 0; i < cycles; i++) {
    setTimeout(() => {
      ticker_str = self.all_markets.slice(cycle * 50, (cycle+1) * 50).join("-")
      self.client.getTicker((err, e) => {
        if (e == undefined) {
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
  setTimeout(() => { this._select_good_volume_markets() }, 60 * 60 * 1000) // update markets on track every hour
}

// Implement standard functions
Poloniex.prototype.balance = function(callback) {
  this.client.getInfo(callback) // implement later
}

Poloniex.prototype.get_markets = function(callback) {
  this.client.publicRequest('info', {}, callback)
}

Poloniex.prototype.get_order = function(order_id, callback) {
  this.client.privateRequest('OrderInfo', { order_id: order_id }, (err, data) => {
    console.log("GET ORDER", err, data)
    callback({
      success: data.success == 1,
      message: data.error,
      result: this._parse_order(data.return)[0]
    })
  })
}

Poloniex.prototype.get_orders = function(market, callback) {
  market = market.toLowerCase().replace(/\-/, '_')
  this.client.privateRequest('ActiveOrders', { pair: market }, (err, data) => {
    callback({
      success: data.success == 1,
      message: data.error,
      result: this._parse_order(data.return)
    })
  })
}

Poloniex.prototype.get_all_orders = function(callback) { // pair is required
  this.client.privateRequest('ActiveOrders', { }, (err, data) => {
    callback({
      success: data.success == 1,
      message: data.error,
      result: this._parse_order(data.return)
    })
  })
}

Poloniex.prototype.buy_order = function(market, quantity, rate, callback) {
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

Poloniex.prototype.sell_order = function(market, quantity, rate, callback) {
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

Poloniex.prototype.cancel_order = function(order_id, callback) {
  console.log("YOBIT canceling order", order_id)
  this.client.privateRequest('CancelOrder', { order_id: order_id }, (err, data) => {
    console.log("CANCEL RETURN", err, data)
    callback({
      success: data.success == 1,
      return: data.return
    })
  })
}

Poloniex.prototype.cancel_all_orders = function(market) { // emergency function
  this.get_orders(market, (response) => {
    response.result.forEach((order, n) => {
      setTimeout(() => {
        console.log("canceling order " + order.id)
        this.cancel_order(order.id, (err, info) => { console.log("order deleted", err, info) })
      }, 1000 * (n + 1))
    })
  })
}

Poloniex.prototype._filter_market = function(data) {
  return data.baseVolume > this.skip_volumes
}

Poloniex.prototype._normalize_ticker_data = function(data) {
  return {
    id: data.id,
    high: parseFloat(data.high24hr),
    low: parseFloat(data.low24hr),
    volume: parseFloat(data.baseVolume),
    last: parseFloat(data.last),
    ask: parseFloat(data.lowestAsk),
    bid: parseFloat(data.highestBid),
    updated: data.updated,
    is_frozen: data.isFrozen
  }
}

Poloniex.prototype._parse_order = function(e) {
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

module.exports = Poloniex;
