require('dotenv').config();

const BinanceClient = require('binance');

function Binance(logger, pump_events) {
  this.logger = logger
  this.exchange_name = 'Binance'
  this.code = 'Binance'
  this.client = new BinanceClient.BinanceRest({
    key: 'api-key', // Get this from your account on binance.com
    secret: 'api-secret', // Same for this
    timeout: 15000, // Optional, defaults to 15000, is the request time out in milliseconds
    disableBeautification: false
    /*
     * Optional, default is false. Binance's API returns objects with lots of one letter keys.  By
     * default those keys will be replaced with more descriptive, longer ones.
     */
  });

  this.markets = [];
  // this.skip_volumes = 0.5 // not supported in binance
  this.ticker_speed = 20 // seconds
  this.cycle_time = 20 // minutes

  this.pump_events = pump_events; // push updates
  this.premiumOnly = false // this is only seen by paid
}

Binance.prototype.watch = function() {
  this._refreshMarkets()
  setTimeout(() => { this._watch_tickers() }, 5 * 1000)
}

Binance.prototype.volume_for = function(pair) {
  return pair.split("-")[1]
}

Binance.prototype.symbol_for = function(pair) {
  return pair.split("-")[0]
}

Binance.prototype._watch_tickers = function() { // watches markets every 10 seconds
  try {
    this.markets.forEach((market) => {
      this.client.ticker24hr(market.key).then((data)=>{
        if (data.volume > 0)
          this.pump_events.emit('marketupdate', 'TICKER', this.code, market.name, this._normalize_ticker_data(data));
      }).catch((e) => { this.logger.error("Error fetching data from BINANCE:", e)})
    })
  } catch(e) {
    this.logger.error("Error on binance watch ticker (catched):", e)
  }
  setTimeout(() => { this._watch_tickers() }, this.ticker_speed * 1000)
}

Binance.prototype._refreshMarkets = function() {
  try {
    this.client._makeRequest({}, (err, data)=>{
      if (err || data == undefined)
        this.logger.error("Error refreshing binance markets", err)
      if (data.filter != undefined)
        this.markets = this._normalizeMarketNames(data.filter((e) => { return e.symbol.match(/(ETH|BTC)$/i)})) // only ETH/BTC markets
    }, 'ticker/allPrices');
  } catch(e) {
    this.logger.error("Error on binance refresh markets (catched):", e)
  }
  setTimeout(() => { this._refreshMarkets() }, 5 * 60 * 1000) // update markets every 5 mins
}

Binance.prototype.market_url = function(market) {
  return "https://www.binance.com/trade.html?symbol=" + market.replace(/\-/,'_')
}

Binance.prototype.marketList = function() {
  return this.markets.map((e) => { return e.name })
}

Binance.prototype._normalizeMarketNames = function(data) { // NEOBTC => NEO-BTC
  return data.map((val) => {
    return {name: val.symbol.split(/(ETH|BTC)$/i).slice(0,2).join('-'), key: val.symbol}
  })
}

Binance.prototype._normalize_ticker_data = function(data) {
  return {
    high: parseFloat(data.highPrice),
    low: parseFloat(data.lowPrice),
    volume: parseFloat(data.quoteVolume),
    last: parseFloat(data.lastPrice),
    ask: parseFloat(data.askPrice),
    bid: parseFloat(data.bidPrice),
    updated: new Date(data.closeTime)
  }
}

module.exports = Binance;
