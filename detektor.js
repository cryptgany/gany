// Detector Lib in NodeJS

// REQUIRED LIBS
const PumpHandler = require('./pump_handler.js');
require('./protofunctions.js');

// REAL CODING
function Detektor(logger, pump_events, test_mode) {
  this.logger = logger
  this.pump_events = pump_events
  this.test_mode = test_mode
  this.market_data = {}
  this.pumps_bought = {}

  this.exchange_volume_change = {
    'BTRX': 1.25,
    'YOBT': 2.5
  }
  this.skip_volumes = 0.5 // skip currencies with lower than THIS volume

  this.market_data
  this.tickers = {}
  this.tickers_history = {}
  this.trades = {}

  this.tickers_detected_blacklist = {}

  this.pump_events.on('marketupdate', (operation, exchange, market, data) => {
    if (market.match(/BTC/)) {
      if (operation == 'TICKER' && data.volume > this.skip_volumes) {
        this.tickers[exchange] = this.tickers[exchange] || {}
        this.tickers[exchange][market] = data;
      }
      if (operation == 'TRADE' && exchange == 'BTRX') {
        this.trades[exchange] = this.trades[exchange] || {}
        this.trades[exchange][market] = data;

        this.analyze_market(data)
      }
    }
    // console.log(operation + " | Exchange: " + exchange + " | Market: " + market)
  })
  this.track_tickers_history()
  this.track_volume_changes()
}

Detektor.prototype.track_tickers_history = function() {
  if (this.tickers != {}) {
    Object.keys(this.tickers).forEach((exchange) => {
      Object.keys(this.tickers[exchange]).forEach((market) => {
        this.tickers_history[exchange] = this.tickers_history[exchange] || {}
        this.tickers_history[exchange][market] = this.tickers_history[exchange][market] || []
        this.tickers_history[exchange][market].push(this.tickers[exchange][market])
      })
    })
  }
  setTimeout(() => { this.track_tickers_history() }, 15 * 1000) // run every minute
}

Detektor.prototype.get_ticker_history = function(exchange, market) {
  if (this.tickers_history[exchange] && this.tickers_history[exchange][market])
    return this.tickers_history[exchange][market]
}

Detektor.prototype.volume_change = function(tickers, time) { // time is in minutes
  first = tickers[tickers.length - time] || tickers.first()
  last = tickers.last()
  return last.volume / first.volume
}

Detektor.prototype.track_volume_changes = function() { // checks exchanges and markets for volumes
  Object.keys(this.tickers_history).forEach((exchange) => {
    Object.keys(this.tickers_history[exchange]).forEach((market) => {
      if (this.tickers_detected_blacklist[exchange+market] && this.tickers_detected_blacklist[exchange+market] > 0) { // if blacklisted
        this.tickers_detected_blacklist[exchange+market] -= 1
      } else {
        tickers = this.get_ticker_history(exchange, market)
        if (tickers) {
          message = false
          for(time = 100; time > 1; time--) {
            if ((volume = this.volume_change(tickers, time)) > this.exchange_volume_change[exchange]) {
              first_ticker = tickers[tickers.length - time] || tickers.first()
              last_ticker = tickers.last()
              market_url = this.market_url(exchange, market)
              message = [exchange + "/" + market, "VOLUME CHANGE ON " + time / 4 + " MINS: " + ((volume - 1) * 100).toFixed(2) + "% (" + first_ticker.volume + " to " + last_ticker.volume + "). Bid: " + last_ticker.bid + ", Ask: " + last_ticker.ask + ", Last: " + last_ticker.last + ". " + market_url]
            }
          }
          if (message) {
            this.tickers_detected_blacklist[exchange+market] = 240  * 3 // blacklist for 3 hour, each "1" is 15 seconds
            this.logger.log(message[0], message[1])
          }
        }
      }
    })
  })
  setTimeout(() => { this.track_volume_changes() }, 30 * 1000) // run every minute
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
  return "";
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
      self.logger.log("BTRX/" + market_name, "PUMP DETECTED BUT ALREADY REACHED MAX BUY/SELLS")
    } else {
      if (self.pumps_bought[market_name] == undefined) {
        // get ticker info and make BUY order
        last_fill = data.Fills.first();
        self.logger.log("BTRX/" + market_name, "POSSIBLE PUMP DETECTED -> LAST PRICE: " + last_fill.Rate);
        first_ask = last_fill.Rate;
        rate = first_ask; // RATE (+) TO BUY ORDER
        self.pumps_bought[market_name] = true;
        if (self.test_mode) {
          self.logger.log("BTRX/" + market_name, "Test values: Amount: " + btc_amount * 0.9975 / buy_at * rate + " | Buy price " + buy_at * rate + " | Sell price: " + sell_at * rate);
        } else {
          // var pump = new PumpHandler(self.pump_events, self.logger, market_name, btc_amount, rate, buy_at, sell_at); // COMMENT THIS LINE FOR REAL TESTING
          // pump.start();
          // self.pumps.push(pump); // later review
        }
      // } else {
      //   self.logger.log("BTRX/" + market_name, "PUMP detected on but already started pump handler");
      }
      sells = data.Fills.filter(function(e) { return e.OrderType == 'SELL'; });
      sell_amount = sells.length == 0 ? 0 : sells.map(function(e) { return e.Quantity * e.Rate; }).reduce(function(sum, e) { return sum+e; });
      winner = buys > sells ? " WINNER: buys" : " WINNER: sells";
      self.logger.log("BTRX/" + market_name, "[CHANGE: " + change + "]" + "[OPEN " + first_fill.TimeStamp + " " + first_fill.Rate + "] [CLOSE " + last_fill.TimeStamp + " " + last_fill.Rate + "] buy amount: " + buys.length + " (" + buy_amount.toFixed(4) + " BTC), sell amount: " + sells.length + "(" + sell_amount.toFixed(4) + " BTC)" + winner);
    }
  }
}

module.exports = Detektor;
