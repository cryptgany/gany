require('dotenv').config();

var ccxt = require ('ccxt')

function Yobit(logger, pump_events, skip_volumes = 0.5) {
  this.logger = logger
  this.exchange_name = 'Yobit'
  this.code = 'Yobit'
  this.client = ccxt.yobit({
    apiKey: process.env.YOBIT_BUY_KEY,
    secret: process.env.YOBIT_BUY_SECRET
  })
  this.all_markets = [];
  this.markets = []; // after selecting only good volume markets
  this.market_data = [];
  this.pump_events = pump_events;
  this.skip_volumes = 0.005 // skip markets with lower than this volume
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

  setTimeout(() => { this._select_good_volume_markets() }, 3 * 1000)
  setTimeout(() => { this._watch_tickers() }, 5 * 1000)
}

Yobit.prototype.volume_for = function(pair) { return this.constructor.volume_for(pair) }
Yobit.prototype.symbol_for = function(pair) { return this.constructor.symbol_for(pair) }
Yobit.prototype.market_url = function(market) { return this.constructor.market_url(market) }

Yobit.volume_for = function(pair) {
  return 'BTC' // all markets on Yobit are BTC
}

Yobit.symbol_for = function(pair) {
  return pair.split('-')[0]
}

Yobit.market_url = function(market) {
  cur = market.split("-")[0].toLowerCase(0)
  return "http://yobit.net/en/trade/" + cur + "/BTC"
}

Yobit.prototype._watch_tickers = function() {
  cycles = Math.ceil(this.markets.length / 50)
  for(i = 0; i < cycles; i++) {
    ticker_str = this.markets.slice(i * 50, (i+1) * 50).join("-")
    this.client.apiGetTickerPairs({'pairs': ticker_str}).then((data) => {
      if (data.error) {
        this.logger.error("Error trying to retrieve yobit data on _watch_tickers:", data.error)
      } else {
        Object.keys(data).forEach((market) => {
          this.pump_events.emit('marketupdate', 'TICKER', this.code, market.toUpperCase().replace(/\_/, '-'), this._normalize_ticker_data(data[market]));
        })
      }
    }).catch((e) => { this.logger.error("Error fetching YOBIT data:", e) })
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
        this.logger.error("Error trying to retrieve yobit data on _select_good_volume_markets:", data.error)
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

Yobit.prototype.marketList = function() {
  return this.markets.map((e)=>{ return e.toUpperCase().replace(/\_/, '-') })
}

Yobit.prototype.get_markets = function(callback) {
  this.client.load_products().then(callback)
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

module.exports = Yobit;
