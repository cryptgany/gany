// Detector Lib in NodeJS

// REQUIRED LIBS
const PumpHandler = require('./pump_handler.js')
const Signal = require('./models/signal')
const _ = require('underscore')

require('./protofunctions.js')
var DateTime = require('node-datetime')

// REAL CODING
function Detektor(logger, telegram_bot, pump_events, database, api_clients, rules) {
  this.logger = logger
  this.telegram_bot = telegram_bot
  this.pump_events = pump_events
  this.verbose = false
  this.market_data = {}
  this.pumps_bought = {}
  this.trade_autotrader_enabled = false // based on TRADE info
  this.ticker_autotrader_enabled = false // based on TICKER info
  this.pumps = []
  this.max_tickers_history = 60 // minutes of history to be kept
  this.tickers_history_cleaning_time = 20 // clean ever X minutes
  this.database = database
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
    Signal.create(signal)
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
            this.telegram_bot.send_signal(this.api_clients[exchange], signal)
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

module.exports = Detektor;
