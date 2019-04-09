// Detector Lib in NodeJS

// REQUIRED LIBS
const PumpHandler = require('./pump_handler.js')
const Signal = require('./models/signal')
const Alert = require('./models/alert')
const _ = require('underscore')
const TickerHandler = require('./ticker_handler')
const ExchangeList = require('./exchange_list')

require('./protofunctions.js')
var DateTime = require('node-datetime')

// REAL CODING
function Detektor(logger, telegram_bot, pump_events, database, rules) {
	this.minBTCVolume = 0.5 // for analysing a coin
	this.logger = logger
	this.telegram_bot = telegram_bot
	this.pump_events = pump_events
	this.database = database
	this.rules = rules
	this.conversionTable = {} // base: BTC/ETH/etc (divisible). pair: dgb, xrp, eos, etc (multiplicable)
	this.all_market_names = [] // BTC, ETC, USD, etc
	// {base: {pair: xxx}} multipliers

	this.alertsTree = {} // {exchange => market => [{alert}]}
	// when a user adds an alert, should be added to the tree
	// when an alert triggers, we need to remove from the tree
	// when receiving market updates (marketupdate TICKER) check for tree[exchange][market] has any alert?
	this.refreshAlertsTree()

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
		if (operation == 'TICKER') {
			this.ticker_handler.update_ticker(exchange, market, data)
			this.updateConversionTable(exchange, market, data)
			if (this.convert(data.volume, ExchangeList[exchange].volume_for(market), 'BTC') > this.minBTCVolume)
				this.analyze_ticker(exchange, market, data)
			setTimeout(() => { this.checkAlertsFor(exchange, market, data.last) }, 0)
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

					this.tickers_detected_blacklist[exchange+market] = 360 // blacklist for 1 hour, each "1" is 10 seconds
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

Detektor.prototype.updateConversionTable = function(exchange, market, data) {
	setTimeout(() => {
		this.conversionTable[ExchangeList[exchange].volume_for(market)] = this.conversionTable[ExchangeList[exchange].volume_for(market)] || {}
		this.conversionTable[ExchangeList[exchange].volume_for(market)][ExchangeList[exchange].symbol_for(market)] = data.last
		this.addMarketNameIfNotExists(market)
	}, 0)
}

// Mathematical conversion, ignoring any other factor
Detektor.prototype.convert = function(quantity, from, to, stack) {
	if (stack >= 3) { return false } // max_stack = 3
	if (from == to) { return quantity }
	if (this.marketExists(from) && this.marketExists(to)) {
		// if we got from and to as base/pair return right away
		if (this.conversionTable[from] && this.conversionTable[from][to]) { return quantity / this.conversionTable[from][to] }
		if (this.conversionTable[to] && this.conversionTable[to][from]) { return quantity * this.conversionTable[to][from] }

		if (this.conversionTable[from] && !this.conversionTable[from][to]) {// from exists as a base but to is not pair
			let price = 0
			let match = Object.keys(this.conversionTable[from]).find((e) => price = this.convert(1, e, to, stack+1)) // find one of the pairs that can be converted to TO
			return match ? quantity * (price * this.convert(1, from, match, stack+1)) : false
		}
		if (this.conversionTable[to] && !this.conversionTable[to][from]) { // to is the base
			let price = 0
			let match = Object.keys(this.conversionTable[to]).find((e) => price = this.convert(1, from, e, stack+1)) // find one of the pairs that can be converted to TO
			return match ? quantity * (price / this.convert(1, to,	match, stack+1)) : false
		}
		// neither to or from are base, we need to find a common base and convert
		// try to find a base for FROM
		let fromBase = Object.keys(this.conversionTable).find((e) => this.conversionTable[e][from])
		if (fromBase) { // if there's no base for any of them then there's no way to convert (error?)
			let fromConvert = this.convert(quantity, from, fromBase, stack+1)
			return this.convert(fromConvert, fromBase, to, stack+1)
		}
	}
}

Detektor.prototype.market_url = function(exchange, market) {
	return ExchangeList[exchange].market_url(market)
}

Detektor.prototype.addMarketNameIfNotExists = function(market) {
	market.split('-').forEach((n) => { if (!this.marketExists(n)) { this.all_market_names.push(n)}})
}

Detektor.prototype.marketExists = function(name) { return this.all_market_names.indexOf(name) != -1 }

Detektor.prototype.getMarketDataForChart = function(market) { // returns first 30 mins of data for most-used to least-used exchange data
	return this.ticker_handler.getMarketDataForChart(market_name)
}

Detektor.prototype.get_market_data = function(market_name, subscriber) {
	return this.ticker_handler.get_market_data(market_name, subscriber)
}

Detektor.prototype.getAllMarkets = function(subscriber, exchange) {
	return this.ticker_handler.getAllMarkets(subscriber, exchange)
}

Detektor.prototype.getMarketDataWithTime = function(market_name, time, subscriber) {
	return this.ticker_handler.getMarketDataWithTime(market_name, time, subscriber)
}

Detektor.prototype.getMinuteMarketData = function(exchange, market, time) {
	return this.ticker_handler.getMinuteMarketData(exchange, market, time)
}

Detektor.prototype.refreshAlertsTree = function() {
	this.alertsTree = {}
	Alert.find({status: 'active'}, (err, alerts) => {
		alerts.forEach((alert) => {
			this.alertsTree[alert.exchange] = this.alertsTree[alert.exchange] || {}
			this.alertsTree[alert.exchange][alert.market] = this.alertsTree[alert.exchange][alert.market] || []
			this.alertsTree[alert.exchange][alert.market].push(alert)
		})
	})
}

Detektor.prototype.removeAlertFromTree = function(alert) { // expects alert to be equally the same object stored in alertsTree
	if (this.alertsTree[alert.exchange] && this.alertsTree[alert.exchange][alert.market]) {
		this.alertsTree[alert.exchange][alert.market].removeElement(alert)
	}
}


Detektor.prototype.addAlertToTree = function(alert) {
	this.alertsTree[alert.exchange] = this.alertsTree[alert.exchange] || {}
	this.alertsTree[alert.exchange][alert.market] = this.alertsTree[alert.exchange][alert.market] || []
	this.alertsTree[alert.exchange][alert.market].push(alert)
}

Detektor.prototype.checkAlertsFor = function(exchange, market, price) {
	if (this.alertsTree[exchange] && this.alertsTree[exchange][market]) {
		this.alertsTree[exchange][market].forEach((alert) => {
			if (alert.status == 'active' && alert.trigger(price)) {
				alert.triggerAndDeactivate() // sets active = false && time of alert
				this.removeAlertFromTree(alert)
			}
		})
	}
}

module.exports = Detektor;
