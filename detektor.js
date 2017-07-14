// Detector Lib in NodeJS

// REQUIRED LIBS
const PumpHandler = require('./pump_handler.js');
require('./protofunctions.js');
var DateTime = require('node-datetime');

// REAL CODING
function Detektor(logger, pump_events, test_mode, api_clients) {
  this.logger = logger
  this.pump_events = pump_events
  this.test_mode = test_mode
  this.market_data = {}
  this.pumps_bought = {}
  this.autotrader_enabled = false
  this.pumps = []

  this.exchange_volume_change = {
    'BTRX': 1.1, // 1.25
    'YOBT': 1.6
  }

  this.api_clients = api_clients

  this.market_data
  this.tickers = {}
  this.tickers_history = {}
  this.trades = {}

  this.tickers_detected_blacklist = {}

  this.pump_events.on('marketupdate', (operation, exchange, market, data) => {
    if (market.match(/BTC/)) {
      if (operation == 'TICKER') {
        this.update_ticker(exchange, market, data)
        this.update_ticker_history(exchange, market, data)
        this.analyze_ticker(exchange, market, data)
      }
      if (operation == 'TRADE' && exchange == 'BTRX') {
        this.trades[exchange] = this.trades[exchange] || {}
        this.trades[exchange][market] = data;

        this.analyze_market(data)
      }
    }
  })
}

Detektor.prototype.update_ticker = function(exchange, market, data) {
  this.tickers[exchange] = this.tickers[exchange] || {}
  this.tickers[exchange][market] = data
}

Detektor.prototype.update_ticker_history = function(exchange, market, data) {
  this.tickers_history[exchange] = this.tickers_history[exchange] || {}
  this.tickers_history[exchange][market] = this.tickers_history[exchange][market] || []
  this.tickers_history[exchange][market].push(data)
}

Detektor.prototype.get_ticker_history = function(exchange, market) {
  return this.tickers_history[exchange][market]
}

Detektor.prototype.volume_change = function(tickers, time) { // time is in minutes
  first = tickers[tickers.length - time] || tickers.first()
  last = tickers.last()
  return last.volume / first.volume
}

Detektor.prototype.analyze_ticker = function(exchange, market, data) {
  setTimeout( () => {
    if (this.tickers_detected_blacklist[exchange+market] && this.tickers_detected_blacklist[exchange+market] > 0) { // if blacklisted
        this.tickers_detected_blacklist[exchange+market] -= 1
      } else {
        if (tickers = this.get_ticker_history(exchange, market)) {
          message = false
          max_time = tickers.length <= 150 ? tickers.length : 150
          for(time = max_time; time > 1; time--) {
            if ((volume = this.volume_change(tickers, time)) > this.exchange_volume_change[exchange]) {
              first_ticker = tickers[tickers.length - time] || tickers.first()
              last_ticker = tickers.last()
              market_url = this.market_url(exchange, market)
              message = ["[" + exchange + "/" + market + "](" + market_url + ")", "Volume up *" + ((volume - 1) * 100).toFixed(2) + "%* in " + this._seconds_to_minutes(time * 10) + " minutes.\nVolume: " + first_ticker.volume.toFixed(8) + " to " + last_ticker.volume.toFixed(8) + "\nBid: " + first_ticker.bid.toFixed(8) + " to " + last_ticker.bid.toFixed(8) + "\nAsk: " + first_ticker.ask.toFixed(8) + " to " + last_ticker.ask.toFixed(8) + "\nLast: " + first_ticker.last.toFixed(8) + " to " + last_ticker.last.toFixed(8) + "\n24h Low: " + last_ticker.low.toFixed(8) + ". 24h High: " + last_ticker.high.toFixed(8)]
            }
          }
          if (message) {
            var pump = new PumpHandler(this.pump_events, this.logger, this.api_clients[exchange], exchange, market, 0.01, last_ticker.ask, 1.01, 1.05)
            pump.start();
            this.pumps.push(pump);
            this.tickers_detected_blacklist[exchange+market] = 360 * 3 // blacklist for 3 hour, each "1" is 10 seconds
            this.logger.log(message[0], message[1])
          }
        }
      }
  }, 0) // run async
}

Detektor.prototype._seconds_to_minutes = function(seconds) {
  var minutes = Math.floor(seconds / 60);
  var seconds = seconds - minutes * 60;
  return minutes + ":" + ("0" + seconds).slice (-2)
}

Detektor.prototype.market_url = function(exchange, market) {
  if (exchange == 'BTRX') {
    return "https://bittrex.com/Market/Index?MarketName=" + market
  }
  if (exchange == 'YOBT') {
    cur = market.split("-")[0].toLowerCase(0)
    return "http://yobit.net/en/trade/" + cur + "/BTC"
  }
}

Detektor.prototype.analyze_market = function(data) {
  if (!this.autotrader_enabled) return '';
  result = false;
  buy_at = 0;
  sell_at = 0;
  btc_amount = 0;
  market_name = data.MarketName;
  self = this;
  if (data.Fills.length > 0) {
    buys = data.Fills.filter(function(e) { return e.OrderType == 'BUY'; });
    buy_amount = buys.length == 0 ? 0 : buys.map(function(e) { return e.Quantity * e.Rate; }).sum();
    first_fill = data.Fills.last();
    last_fill = data.Fills.first();
    change = last_fill.Rate / first_fill.Rate;
    // if ( (change > 1.04) && (buys.length > 40 || buy_amount > 3.5) ) {
    //   result = true; buy_at = 1.01; sell_at = 1.08; btc_amount = 0.01;
    // }
    if ( (change > 1.05) && (buys.length > 50 || buy_amount > 5) ) {
      result = true; buy_at = 1.06; sell_at = 1.4; btc_amount = 0.1;
    }
  }
  if (result) {
    self.count += 1;
    if (self.count > 100) {
      self.logger.log("BTRX/" + market_name, "PUMP DETECTED BUT ALREADY REACHED MAX BUY/SELLS", true)
    } else {
      if (self.pumps_bought[market_name] == undefined) {
        // get ticker info and make BUY order
        last_fill = data.Fills.first();
        self.logger.log("BTRX/" + market_name, "POSSIBLE PUMP DETECTED -> LAST PRICE: " + last_fill.Rate, true);
        first_ask = last_fill.Rate;
        rate = first_ask; // RATE (+) TO BUY ORDER
        self.pumps_bought[market_name] = true;
        if (self.test_mode) {
          self.logger.log("BTRX/" + market_name, "Test values: Amount: " + btc_amount * 0.9975 / buy_at * rate + " | Buy price " + buy_at * rate + " | Sell price: " + sell_at * rate, true);
        } else {
          var pump = new PumpHandler(self.pump_events, self.logger, market_name, btc_amount, rate, buy_at, sell_at); // COMMENT THIS LINE FOR REAL TESTING
          pump.start();
          self.pumps.push(pump); // later review
        }
      } else {
        self.logger.log("BTRX/" + market_name, "PUMP detected on but already started pump handler", true);
      }
      sells = data.Fills.filter(function(e) { return e.OrderType == 'SELL'; });
      sell_amount = sells.length == 0 ? 0 : sells.map(function(e) { return e.Quantity * e.Rate; }).reduce(function(sum, e) { return sum+e; });
      winner = buys > sells ? " WINNER: buys" : " WINNER: sells";
      self.logger.log("BTRX/" + market_name, "[CHANGE: " + change + "]" + "[OPEN " + first_fill.TimeStamp + " " + first_fill.Rate + "] [CLOSE " + last_fill.TimeStamp + " " + last_fill.Rate + "] buy amount: " + buys.length + " (" + buy_amount.toFixed(4) + " BTC), sell amount: " + sells.length + "(" + sell_amount.toFixed(4) + " BTC)" + winner, true);
    }
  }
}

module.exports = Detektor;
