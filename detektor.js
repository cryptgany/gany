// Detector Lib in NodeJS

// REQUIRED LIBS
const PumpHandler = require('./pump_handler.js')
const Signal = require('./models/signal')
const _ = require('underscore')
const TickerHandler = require('./ticker_handler')
const ExchangeList = require('./exchange_list')

require('./protofunctions.js')
var DateTime = require('node-datetime')

// REAL CODING
function Detektor(logger, telegram_bot, pump_events, database, rules) {
  this.logger = logger
  this.telegram_bot = telegram_bot
  this.pump_events = pump_events
  this.database = database
  this.rules = rules

  this.matcher = require('./matcher')
  this.ticker_handler = new TickerHandler(this, logger)

  this.spam_detector = { // small spam detector so we don't send so many notifications when lags/delays happen in exchanges
    max_time: 1.5 * 1000, // minimum MS between notifications
    mute_for: 5 * 1000, // seconds muted when trying to do more than max signals
    last_signal: Date.now(),
    muted: false
  }

  this.tickers_detected_blacklist = {}

  this.pump_events.on('marketupdate', (operation, exchange, market, data) => {
    if (market.match(/(BTC|ETH|NEO)/)) { //NOTE: not so sure but think XXBT is the nomenclature given for BTC please check it
      if (operation == 'TICKER') {
        this.ticker_handler.update_ticker(exchange, market, data)
        this.analyze_ticker(exchange, market, data)
      }
    }
  })
  this.store_snapshot_every_15_min()
}

Detektor.prototype.store_snapshot_every_15_min = function() {
  setTimeout(() => { // do async
    this.store_snapshot() // call real function
    this.store_snapshot_every_15_min()
  }, 15 * 60 * 1000) // store every 5 mins
}

Detektor.prototype.store_snapshot = function() {
  setTimeout(() => { // do async
    this.database.store_tickers_blacklist(this.tickers_detected_blacklist)
  }, 0)
}

Detektor.prototype.restore_snapshot = function() {
  setTimeout(() => { // do async
    this.database.get_tickers_blacklist((err, data) => {
      if (err) this.logger.error("Error trying to fetch tickers blacklist from database:", err)
      this.tickers_detected_blacklist = data[0] || {}
      if (this.tickers_detected_blacklist) delete(this.tickers_detected_blacklist._id)
    })
  }, 0)
}

Detektor.prototype.volume_change = function(first_ticker, last_ticker) { return this.matcher.volume_change(first_ticker, last_ticker) }

Detektor.prototype.store_signal_in_background = function(signal) {
  setTimeout(() => {
    Signal.create(signal)
  }, 0)
}

Detektor.prototype.rule_match = function(exchange, first_ticker, last_ticker, time) {
  return _.find(this.rules[exchange], (rule) => { return rule(first_ticker, last_ticker, time, this.matcher) })
}

Detektor.prototype.analyze_ticker = function(exchange, market, data) {
  setTimeout( () => {
    if (this.tickers_detected_blacklist[exchange+market] && this.tickers_detected_blacklist[exchange+market] > 0) { // if blacklisted
        this.tickers_detected_blacklist[exchange+market] -= 1
      } else {
        // should iteratively return time and data
        last_ticker = data
        signal = false
        this.ticker_handler.get_ticker_history(exchange, market, (time, first_ticker) => {
          if (this.rule_match(exchange, first_ticker, last_ticker, time)) {
            volume = this.volume_change(first_ticker, last_ticker)
            signal = {exchange: exchange, market: market, change: volume, time: time, first_ticker: first_ticker, last_ticker: last_ticker}
          }
        })
        if (signal) {
          this.detect_spam()

          this.tickers_detected_blacklist[exchange+market] = 360 * 3 // blacklist for 3 hour, each "1" is 10 seconds
          if (!this.muted())
            this.telegram_bot.send_signal(ExchangeList[exchange], signal)
        }
      }
  }, 0) // run async
}

Detektor.prototype.muted = function() { return this.spam_detector.muted }

Detektor.prototype.detect_spam = function() {
  time = Date.now()
  if (!this.muted() && (time - this.spam_detector.last_signal) <= this.spam_detector.max_time) {
    this.spam_detector.muted = true
    this.spam_detector.muted_since = time
    this.logger.log("Muting detektor.")
    setTimeout(() => { this.spam_detector.muted = false }, this.spam_detector.mute_for)
  }
  this.spam_detector.last_signal = time
}

Detektor.prototype.market_url = function(exchange, market) {
  return ExchangeList[exchange].market_url(market)
}

Detektor.prototype.getMarketDataForChart = function(market) { // returns first 30 mins of data for most-used to least-used exchange data
  return this.ticker_handler.getMarketDataForChart(market_name)
}

Detektor.prototype.get_market_data = function(market_name, subscriber) {
  return this.ticker_handler.get_market_data(market_name, subscriber)
}

Detektor.prototype.getMarketDataWithTime = function(market_name, time, subscriber) {
  return this.ticker_handler.getMarketDataWithTime(market_name, time, subscriber)
}

Detektor.prototype.getMinuteMarketData = function(exchange, market, time) {
  return this.ticker_handler.getMinuteMarketData(exchange, market, time)
}

Detektor.prototype.getHourMarketData = function(exchange, market, ticker_type, time) {
  return this.ticker_handler.getHourMarketData(exchange, market, ticker_type, time)
}

module.exports = Detektor;
