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

Bittrex.prototype.volume_for = function(pair) { return this.constructor.volume_for(pair) }
Bittrex.prototype.symbol_for = function(pair) { return this.constructor.symbol_for(pair) }
Bittrex.prototype.market_url = function(market) { return this.constructor.market_url(market) }

Bittrex.volume_for = function(pair) {
  return pair.split("-")[0]
}

Bittrex.symbol_for = function(pair) {
  return pair.split("-")[1]
}

Bittrex.market_url = function(market) {
  return "https://bittrex.com/Market/Index?MarketName=" + market
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

Bittrex.prototype.marketList = function() {
  return this.markets
}

Bittrex.prototype.get_markets = function(callback) {
  this.client.getmarketsummaries( callback );
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

module.exports = Bittrex;
