var https = require("https")

function Cryptopia(pump_events, skip_volumes = 0.5) {
  this.exchange_name = 'Cryptopia'
  this.all_markets = [];
  this.markets = []; // after selecting only good volume markets
  this.market_data = [];
  this.pump_events = pump_events;
  this.skip_volumes = 0.5 // skip markets with lower than this volume
  this.ticker_speed = 30 // seconds
}

Cryptopia.prototype.watch = function() {
  // setTimeout(() => { this._watch_tickers() }, 10 * 1000)
  this._watch_tickers()
}

Cryptopia.prototype._watch_tickers = function() {
  this.get_markets((err, tickers) => {
    if (err) {
      console.log('Failed to retrieve Cryptopia data: ', err)
    } else {
      tickers.forEach((ticker) => {
        if (this._filter_market(ticker)) {
          market = ticker.Label
          this.pump_events.emit('marketupdate', 'TICKER', 'CPIA', market.replace(/\//, '-'), this._normalize_ticker_data(ticker));
        }
      })
    }
  })
  setTimeout(() => { this._watch_tickers() }, this.ticker_speed * 1000)
}

Cryptopia.prototype.get_markets = function(callback) {
  fetched_data = []
  this.public_request('GetMarkets', (err, data) => {
    if (err) {
      callback(err, data)
    } else {
      fetched_data.push(data)
      if (data.endsWith('"Error":null}')) { // wait for data to load
        callback(null, this._parse_ticker_json(fetched_data.join("")))
      }
    }
  })
}

Cryptopia.prototype.public_request = function(api_method, _callback) {
  var params = params || {}

  var options = {
    host: 'www.cryptopia.co.nz',
    path: '/Api/' + api_method,
    method: 'GET'
  }

  var req = https.request(options, (res) => {
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      _callback(false, chunk);
    });
  });

  req.on('error', (e) => {
    _callback(e, []);
  });

  req.end();
}

Cryptopia.prototype._parse_ticker_json = function(tickers_json) {
  return JSON.parse(tickers_json).Data
}
Cryptopia.prototype._filter_market = function(data) {
  return (data.BaseVolume > this.skip_volumes) && data.Label.match(/BTC/)
}

Cryptopia.prototype._normalize_ticker_data = function(data) {
  return {
    id: data.TradePairId,
    high: data.High,
    low: data.Low,
    volume: data.BaseVolume,
    last: data.LastPrice,
    ask: data.AskPrice,
    bid: data.BidPrice,
  }
}

module.exports = Cryptopia;
