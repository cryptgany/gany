var https = require("https")

function Cryptopia(pump_events, skip_volumes = 0.5) {
  this.exchange_name = 'Cryptopia'
  this.code = 'Cryptopia'
  this.all_markets = [];
  this.markets = []; // after selecting only good volume markets
  this.market_data = [];
  this.pump_events = pump_events;
  this.skip_volumes = 0.5 // skip markets with lower than this volume
  this.ticker_speed = 20 // seconds
  this.cycle_time = 20 // minutes
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
          this.pump_events.emit('marketupdate', 'TICKER', this.code, market.replace(/\//, '-'), this._normalize_ticker_data(ticker));
        }
      })
    }
  })
  setTimeout(() => { this._watch_tickers() }, this.ticker_speed * 1000)
}

Cryptopia.prototype.get_markets = function(callback) {
  fetched_data = []
  this.public_request('GetMarkets/BTC', (err, data) => {
    if (err) {
      callback(err, data)
    } else {
      if (matched = data.match(/\"Error\"\:null/)) { // doesnt matters where is the end
        if (matched.index + 13 == data.length) {
          fetched_data.push(data)
        } else {
          fetched_data.push(data.substr(0, matched.index + 13))
        }
        json_data = this._parse_ticker_json(fetched_data.join(""))
        if (json_data)
          callback(null, json_data)
      } else { fetched_data.push(data) }
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
  try {
    parsed_json = JSON.parse(tickers_json).Data;
  } catch(e) {
    parsed_json = false
    console.log("Could not parse json", e); // error in the above string (in this case, yes)!
  }
  return parsed_json;
}
Cryptopia.prototype._filter_market = function(data) {
  return (data.BaseVolume > this.skip_volumes) && data.Label.match(/BTC/)
}

Cryptopia.prototype.market_url = function(market) {
  return "https://www.cryptopia.co.nz/Exchange/?market=" + market.replace(/\-/, "_")
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
