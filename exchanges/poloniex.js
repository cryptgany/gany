const PoloniexClient = require('poloniex-api-node');

function Poloniex(logger, pump_events, skip_volumes = 0.5) {
  this.logger = logger
  this.exchange_name = 'Poloniex'
  this.code = 'Poloniex'
  this.client = new PoloniexClient('nothing', 'nothing', { socketTimeout: 15000 })
  this.all_markets = [];
  this.markets = []; // after selecting only good volume markets
  this.market_data = [];
  this.pump_events = pump_events;
  this.skip_volumes = 0.5 // skip markets with lower than this volume
  this.ticker_speed = 10 // seconds
  this.cycle_time = 20 // minutes
}

Poloniex.prototype.watch = function() {
  // setTimeout(() => { this._watch_tickers() }, 10 * 1000)
  this._watch_tickers()
}

Poloniex.prototype._watch_tickers = function() {
  this.client.returnTicker((err, tickers) => {
    if (err) {
      this.logger.error('Failed to retrieve poloniex data: ', err)
    } else {
      Object.keys(tickers).forEach((market) => {
        if (this._filter_market(tickers[market])) {
          this.pump_events.emit('marketupdate', 'TICKER', this.code, market.replace(/\_/, '-'), this._normalize_ticker_data(tickers[market]));
        }
      })
    }
  })
  setTimeout(() => { this._watch_tickers() }, this.ticker_speed * 1000)
}

Poloniex.prototype.market_url = function(market) {
  return "https://poloniex.com/#/exchange/" + market.toLowerCase().replace(/\-/, "_")
}

Poloniex.prototype._filter_market = function(data) {
  return (data.baseVolume > this.skip_volumes) && (data.isFrozen == '0')
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

module.exports = Poloniex;
