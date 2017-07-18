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
  this.verbose = false
  this.market_data = {}
  this.pumps_bought = {}
  this.trade_autotrader_enabled = false // based on TRADE info
  this.ticker_autotrader_enabled = false // based on TICKER info
  this.pumps = []
  this.max_tickers_history = 30 // minutes

  this.cycle_time = 30 // minutes

  this.exchange_volume_change = {
    'BTRX': 1.30, // 1.25
    'YOBT': 1.3,
    'POLO': 1.25,
    'CPIA': 1.25
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
  this.logger.listen(this.process_telegram_request.bind(this)) // for telegram
  setTimeout(() => { this.keep_tickers_limited() }, 5000)
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
          ticker_time = this.cycle_time * 60 / this.exchange_ticker_speed(exchange) // convert to minutes
          max_time = tickers.length <= ticker_time ? tickers.length : ticker_time
          for(time = max_time; time > 1; time--) {
            if ((volume = this.volume_change(tickers, time)) > this.exchange_volume_change[exchange]) {
              first_ticker = tickers[tickers.length - time] || tickers.first()
              last_ticker = tickers.last()
              message = this.telegram_post(exchange, market, volume, time * this.exchange_ticker_speed(exchange), first_ticker, last_ticker)
            }
          }
          if (message) {
            if (this.ticker_autotrader_enabled && exchange == 'BTRX') { // if enabled
              var pump = new PumpHandler(this.pump_events, this.logger, this.api_clients[exchange], exchange, market, 0.001, last_ticker.ask, 1.01, 1.05, this, 0, this.verbose)
              pump.start();
              this.pumps.push(pump);
            }
            this.tickers_detected_blacklist[exchange+market] = 360 * 3 // blacklist for 3 hour, each "1" is 10 seconds
            this.logger.log(message[0], message[1])
          }
        }
      }
  }, 0) // run async
}

Detektor.prototype.exchange_ticker_speed = function(exchange) {
  return this.api_clients[exchange].ticker_speed
}

Detektor.prototype.keep_tickers_limited = function() { // will limit tickers history to not fill memory up
  console.log("RUNNING TICKERS CLEANER...")
  Object.keys(this.tickers_history).forEach((exchange) => {
    max_tickers = 60 / this.exchange_ticker_speed(exchange) * this.max_tickers_history // calculate ticker size for configured value
    Object.keys(this.tickers_history[exchange]).forEach((market) => {
      if (this.tickers_history[exchange][market].length > max_tickers) {
        tickers = this.tickers_history[exchange][market]
        this.tickers_history[exchange][market] = tickers.slice(tickers.length - max_tickers, tickers.length)
      }
    })
  })
  setTimeout(() => { this.keep_tickers_limited() }, 30 * 60 * 1000) // clean every 30 minutes
}

Detektor.prototype._seconds_to_minutes = function(seconds) {
  var minutes = Math.floor(seconds / 60);
  var seconds = seconds - minutes * 60;
  return minutes == 0 ? (seconds + " seconds") : minutes + (minutes > 1 ? " minutes" : " minute")
}

Detektor.prototype.telegram_post = function(exchange, market, volume, time, first_ticker, last_ticker) {
  diff = last_ticker.volume - first_ticker.volume
  link = "[" + this.exchange_name(exchange) + " - " + market + "](" + this.market_url(exchange, market) + ")"
  message = "\nVol. up by *" + diff.toFixed(2) + "* BTC since *" + this._seconds_to_minutes(time) + "*"
  message += "\nVolume: " + last_ticker.volume.toFixed(4) + " (*" + ((volume - 1) * 100).toFixed(2) + "%*)"
  message += "\nB: " + first_ticker.bid.toFixed(8) + " " + this.telegram_arrow(first_ticker.bid, last_ticker.bid) + " " + last_ticker.bid.toFixed(8)
  message += "\nA: " + first_ticker.ask.toFixed(8) + " " + this.telegram_arrow(first_ticker.ask, last_ticker.ask) + " " + last_ticker.ask.toFixed(8)
  message += "\nL: " + first_ticker.last.toFixed(8) + " " + this.telegram_arrow(first_ticker.last, last_ticker.last) + " " + last_ticker.last.toFixed(8)
  message += "\n24h Low: " + last_ticker.low.toFixed(8) + ". 24h High: " + last_ticker.high.toFixed(8)
  return [link, message]
}

Detektor.prototype.exchange_name = function(exchange) {
  return this.api_clients[exchange].exchange_name
}

Detektor.prototype.telegram_arrow = function(first_val, last_val) {
  if (first_val < last_val) return '\u2197'
  if (first_val > last_val) return '\u2198'
  return "\u27A1"
}

Detektor.prototype.market_url = function(exchange, market) {
  if (exchange == 'BTRX') {
    return "https://bittrex.com/Market/Index?MarketName=" + market
  }
  if (exchange == 'YOBT') {
    cur = market.split("-")[0].toLowerCase(0)
    return "http://yobit.net/en/trade/" + cur + "/BTC"
  }
  if (exchange == 'POLO') {
    return "https://poloniex.com/#/exchange/" + market.toLowerCase().replace(/\-/, "_")
  }
  if (exchange == 'CPIA') {
    return "https://www.cryptopia.co.nz/Exchange/?market=" + market.replace(/\-/, "_")
  }
}

Detektor.prototype.analyze_market = function(data) {
  if (!this.trade_autotrader_enabled) return '';
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
          var pump = new PumpHandler(self.pump_events, self.logger, self.api_clients[exchange], 'BTRX', market_name, btc_amount, rate, buy_at, sell_at, self, 1, this.verbose); // COMMENT THIS LINE FOR REAL TESTING
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

Detektor.prototype.process_telegram_request = function(msg, responder) {
  command = msg.text
  if (command.includes('/detektor')) {
    if (command == '/detektor set autotrader false') { this.ticker_autotrader_enabled = false; responder("Autotrader disabled.") }
    if (command == '/detektor set autotrader true') { this.ticker_autotrader_enabled = true; responder("Autotrader enabled.") }
    if (command == '/detektor see profit') {
      if (this.pumps.length > 0) {
        profit = this.pumps.map((pmp) => { return pmp.profit }).sum()
      } else {
        profit = 0
      }
      responder(profit + " in profits so far.")
    }
    if (command == '/detektor open orders') {
      count = this.pumps.filter((pump) => { return !pump.pump_ended }).length
      responder(count + " opened orders at the moment.")
    }
    if (command == '/detektor closed orders') {
      count = this.pumps.filter((pump) => { return pump.pump_ended }).length
      responder(count + " closed orders at the moment.")
    }
    if (command == '/detektor commands') {
      responder("Commands are:\nset autotrader false\nset autotrader true\nsee profit\nopen orders\nclosed orders\ncommands")
    }
  }
}

module.exports = Detektor;
