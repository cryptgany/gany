// Detector Lib in NodeJS

// REQUIRED LIBS
const PumpHandler = require('./pump_handler.js')
const Signal = require('./signal')
const _ = require('underscore')

require("./webserver")

require('./protofunctions.js')
var DateTime = require('node-datetime')

// REAL CODING
function Detektor(logger, pump_events, test_mode, database, api_clients, rules) {
  this.logger = logger
  this.pump_events = pump_events
  this.test_mode = test_mode
  this.verbose = false
  this.market_data = {}
  this.pumps_bought = {}
  this.trade_autotrader_enabled = false // based on TRADE info
  this.ticker_autotrader_enabled = false // based on TICKER info
  this.pumps = []
  this.max_tickers_history = 60 // minutes of history to be kept
  this.tickers_history_cleaning_time = 20 // clean ever X minutes
  this.database = database
  this.signal = new Signal()
  this.matcher = require('./matcher')

  this.api_clients = api_clients

  this.market_data
  this.tickers = {}
  this.tickers_history = {}
  this.trades = {}
  this.rules = rules

  this.tickers_detected_blacklist = {}

  this.pump_events.on('marketupdate', (operation, exchange, market, data) => {
    if (market.match(/BTC/)) {
      if (operation == 'TICKER') {
        this.update_ticker(exchange, market, data)
        this.update_ticker_history(exchange, market, data)
        this.analyze_ticker(exchange, market, data)
      }
    }
  })
  this.logger.listen(this.process_telegram_request.bind(this)) // for telegram
  this.store_snapshot_every_15_min()
  setTimeout(() => { this.keep_tickers_limited() }, this.tickers_history_cleaning_time * 60 * 1000)
}

Detektor.prototype.update_ticker = function(exchange, market, data) {
  this.tickers[exchange] = this.tickers[exchange] || {}
  this.tickers[exchange][market] = data
}

Detektor.prototype.store_snapshot_every_15_min = function() {
  setTimeout(() => { // do async
    this.store_snapshot() // call real function
    this.store_snapshot_every_15_min()
  }, 15 * 60 * 1000) // store every 5 mins
}

Detektor.prototype.store_snapshot = function() {
  setTimeout(() => { // do async
    this.database.store_tickers_history(this.tickers_history)
    this.database.store_tickers_blacklist(this.tickers_detected_blacklist)
  }, 0)
}

Detektor.prototype.restore_snapshot = function() {
  setTimeout(() => { // do async
    this.database.get_tickers_history((err, data) => {
      if (err) console.log("Error trying to fetch tickers history from database:", err)
      data.forEach((data) => {
        exchange = data.exchange; market = data.market; ticker_history = data.tickers;
        this.tickers_history[exchange] = this.tickers_history[exchange] || {}
        this.tickers_history[exchange][market] = this.tickers_history[exchange][market] = ticker_history
      })
      if (this.tickers_history) delete(this.tickers_history._id)
    })
    this.database.get_tickers_blacklist((err, data) => {
      if (err) console.log("Error trying to fetch tickers blacklist from database:", err)
      this.tickers_detected_blacklist = data[0] || {}
      if (detektor.tickers_detected_blacklist) delete(detektor.tickers_detected_blacklist._id)
    })
  }, 0)
}

Detektor.prototype.update_ticker_history = function(exchange, market, data) {
  this.tickers_history[exchange] = this.tickers_history[exchange] || {}
  this.tickers_history[exchange][market] = this.tickers_history[exchange][market] || []
  this.tickers_history[exchange][market].push(data)
}

Detektor.prototype.get_ticker_history = function(exchange, market) {
  return this.tickers_history[exchange][market]
}

Detektor.prototype.volume_change = function(first_ticker, last_ticker) { return this.matcher.volume_change(first_ticker, last_ticker) }

Detektor.prototype.store_signal_in_background = function(signal) {
  setTimeout(() => {
    this.signal.store_signal(signal, () => {})
  }, 0)
}

Detektor.prototype.rule_match = function(exchange, first_ticker, last_ticker) {
  return _.find(this.rules[exchange], (rule) => { return rule(first_ticker, last_ticker, this.matcher) })
}

Detektor.prototype.analyze_ticker = function(exchange, market, data) {
  setTimeout( () => {
    start = DateTime.create()._now
    if (this.tickers_detected_blacklist[exchange+market] && this.tickers_detected_blacklist[exchange+market] > 0) { // if blacklisted
        this.tickers_detected_blacklist[exchange+market] -= 1
      } else {
        if (tickers = this.get_ticker_history(exchange, market)) {
          signal = false
          ticker_time = this.cycle_time(exchange)
          max_time = tickers.length <= ticker_time ? tickers.length : ticker_time
          for(time = max_time; time > 1; time--) {
            first_ticker = tickers[tickers.length - time] || tickers.first()
            last_ticker = tickers.last()
            if (this.rule_match(exchange, first_ticker, last_ticker)) {
              volume = this.volume_change(first_ticker, last_ticker)
              signal = {exchange: exchange, market: market, change: volume, time: time * this.exchange_ticker_speed(exchange), first_ticker: first_ticker, last_ticker: last_ticker}
            }
          }
          if (signal) {
            this.store_signal_in_background(signal)
            if (this.ticker_autotrader_enabled && exchange == 'Bittrex') { // if enabled
              var pump = new PumpHandler(this.pump_events, this.logger, this.api_clients[exchange], exchange, market, 0.001, last_ticker.ask, 1.01, 1.05, this, 0, this.verbose)
              pump.start();
              this.pumps.push(pump);
            }
            this.tickers_detected_blacklist[exchange+market] = 360 * 3 // blacklist for 3 hour, each "1" is 10 seconds
            this.logger.send_signal(this.api_clients[exchange], signal)
          }
        }
      }
  }, 0) // run async
}

Detektor.prototype.cycle_time = function(exchange) {
  return this.api_clients[exchange].cycle_time * 60 / this.exchange_ticker_speed(exchange)
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
  Object.keys(this.tickers_detected_blacklist).forEach((blacklisted) => {
    if (this.tickers_detected_blacklist[blacklisted] == 0)
      delete(this.tickers_detected_blacklist[blacklisted])
  })
  setTimeout(() => { this.keep_tickers_limited() }, this.tickers_history_cleaning_time * 60 * 1000) // clean every 30 minutes
}

Detektor.prototype.market_url = function(exchange, market) {
  return this.api_clients[exchange].market_url(market)
}

Detektor.prototype.process_telegram_request = function(msg, responder) {
  command = msg.text
  if (command.includes('/detektor')) {
    if (command == '/detektor set false') { this.ticker_autotrader_enabled = false; responder("Autotrader disabled.") }
    if (command == '/detektor set true') { this.ticker_autotrader_enabled = true; responder("Autotrader enabled.") }
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
      opened_orders = []
      messages = []
      this.pumps.filter((pump) => { return !pump.pump_ended }).forEach((pump) => {
        buy_price = pump.buy_order ? pump.buy_order.price_per_unit : pump.buy_rate
        current_price = this.tickers[pump.exchange][pump.market].ask
        message = pump.exchange + "/" + pump.market + "(" + pump.buy_order.quantity + ") [IN:" + buy_price.toFixed(8) + "][NOW:" + current_price.toFixed(8) + "] (" + (((current_price / buy_price) - 1) * 100).toFixed(2) + "%)"
        opened_orders.push({pump: pump, message: message})
        messages.push(message)
      })
      this.logger.gany_the_bot.show_open_orders(msg.id || msg.from.id, opened_orders)
      // responder(count + " opened orders at the moment.\n" + messages.join("\n"))
    }
    if (command == '/detektor closed orders') {
      count = this.pumps.filter((pump) => { return pump.pump_ended }).length
      responder(count + " closed orders at the moment.")
    }
    if (command == '/detektor store snapshot') {
      this.store_snapshot()
      responder("Snapshot stored")
    }
    if (command.match(/\/detektor see/) && !command.match(/\/detektor see profit/)) {
      pair = command.replace(/\/detektor see\ /, '').split("/")
      exchange = pair[0]; market = pair[1]
      ticker_info = this.tickers[exchange][market]
      message = this.market_url(exchange, market)
      message += "\nB: " + ticker_info.bid.toFixed(8)
      message += "\nA: " + ticker_info.ask.toFixed(8)
      message += "\nL: " + ticker_info.last.toFixed(8)
      message += "\n24h Low: " + ticker_info.low.toFixed(8)
      message += "\n24h High: " + ticker_info.high.toFixed(8)
      responder(message)
    }
    if (command.match(/\/detektor buy/)) {
      exc_amount = command.replace(/\/detektor buy\ /, '').split(" ")
      pair = exc_amount[0].split("/")
      if (exc_amount.length == 1) {
        btc_amount = 0.01
      } else {
        btc_amount = parseFloat(exc_amount[1])
      }
      exchange = pair[0]; market = pair[1]
      rate = this.tickers[exchange][market].ask
      var pump = new PumpHandler(this.pump_events, this.logger, this.api_clients[exchange], exchange, market, btc_amount, rate, 1.01, 1.05, this, 0, this.verbose); // COMMENT THIS LINE FOR REAL TESTING
      pump.start();
      this.pumps.push(pump); // later review
      responder("Buy started on " + exchange + " - " + market + " at price " + rate + " with " + btc_amount + " bitcoin")
    }
    if (command.match(/\/detektor sell/)) {
      pair = command.replace(/\/detektor sell\ /, '').split("/")
      exchange = pair[0]; market = pair[1]
      price = this.tickers[exchange][market].bid * 0.98
      pump = this.pumps.filter((pump) => { return pump.exchange == exchange && pump.market == market && !pump.pump_ended})[0]
      pump.sell_rate = price
      pump.sell_on_peak(1);
      responder("Sell started on " + exchange + " - " + market + " at price " + price)
    }
    if (command == '/detektor commands') {
      responder("Commands are:\nset false\nset true\nsee profit\nopen orders\nclosed orders\nstore snapshot\nsee EXCHANGE/MARKET\nbuy EXCHANGE/MARKET BTC_AMOUNT\nsell EXCHANGE/MARKET\ncommands")
    }
  }
}

module.exports = Detektor;
