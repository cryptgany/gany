require('./protofunctions')
const VALID_EXCHANGES = /BITTREX|BINANCE|KRAKEN|POLONIEX|CRYPTOPIA|YOBIT|KUCOIN|ETHERDELTA|COINEXCHANGE|HUOBI|IDEX|BITFINEX/
const TIME_AND_LIMIT_VALID_REGEX = /(^\d+$)|(^\d+H$)|(^\d+D$)/ // 1 12, 1H 60, etc
const VALID_MIN_VOLUME_REGEX = /(\d+\.\d+|\d+)BTC/
const EXCHANGES_CONVERSION = { // there should be a better way of doing this
	BITTREX: 'Bittrex',
	BINANCE: 'Binance',
	KRAKEN: 'Kraken',
	POLONIEX: 'Poloniex',
	CRYPTOPIA: 'Cryptopia',
	YOBIT: 'Yobit',
	KUCOIN: 'Kucoin',
	ETHERDELTA: 'EtherDelta',
	COINEXCHANGE: 'CoinExchange',
	HUOBI: 'Huobi',
	IDEX: 'IDEX',
	BITFINEX: 'Bitfinex',
	ALL: 'All'
}

class UserInputAnalyzer {
	// understands commands and returns the filtering values
	constructor(userCommand) {
		this.command = userCommand.toUpperCase();
		this.splitCommand = this.command.split(' ');
		let commands = this.splitCommand.slice(0)

		// base command, volchange, see, chart, etc
		this.baseCommand = commands.shift();

		this.exchange = this.extractExchange()
		commands = commands.removeElement(this.exchange)

		this.market = this.extractMarket()
		commands = commands.removeElement(this.market)

		// time, 1h 10 30 24h
		this.time = this.extractTimeInMinutes()
		commands = commands.removeElement(this.time)

		// time, 1h 10 30 24h
		this.limit = this.extractLimit()

		this.minVol = this.extractMinVolume() // only btc by now
	}

	// /VOLCHANGE BINANCE ETH 2 1000BTC => BINANCE
	extractExchange() {
		return this.splitCommand.find((el) => el.match(VALID_EXCHANGES))
	}

	// /VOLCHANGE BINANCE ETH 2 1000BTC => ETH
	extractMarket() {
		let commands = this.splitCommand.slice(0)
		commands.shift() // first command name
		commands = commands.removeElement(this.exchange)
		// next should be either market or number, if number its not a market
		if (commands[0] && (!commands[0].match(TIME_AND_LIMIT_VALID_REGEX))) {
			return commands[0]
		}
	}

	// /VOLCHANGE BINANCE 2 1000BTC => 2
	extractTimeInMinutes() {
		let commands = this.splitCommand.slice(0)
		let time = commands.find((el) => el.match(TIME_AND_LIMIT_VALID_REGEX))
		if (time) {
			return this.convertUserTimeToMinutes(time)
		}
	}

	// /VOLCHANGE BINANCE 2 10 1000BTC => 10
	extractLimit() {
		let commands = this.splitCommand.slice(0)
		let time_limit = commands.filter((el) => el.match(TIME_AND_LIMIT_VALID_REGEX))
		if (time_limit.length == 2) { // user did input time and limit
			return parseInt(time_limit[1])
		}
	}

	// /VOLCHANGE BINANCE 2 1000BTC => 1000
	extractMinVolume() {
		let match = this.command.match(VALID_MIN_VOLUME_REGEX)
		if (match) {
			return parseFloat(match[0])
		}
	}

	exchangeCamelCase() { // BINANCE => Binance
		return EXCHANGES_CONVERSION[this.exchange]
	}

	inverseMarket() { // NEO-BTC => BTC-NEO (influx market=x search)
		let _market = this.market.split(/\-/)
		return `${_market[1]}-${_market[0]}`
	}

	humanizedTime() {
		return smartTimeConvert(this.time);
	}

	// private
	convertUserTimeToMinutes(userTime) { // 30 60 1h 10h 5d
		if (isNaN(parseInt(userTime))) { return 0 }
		var t = parseInt(userTime)
		if (userTime.match(/H/)) {
			return t * 60;
		} else {
			if (userTime.match(/D/)) {
				return t * 60 * 24
			} else {
				return t
			}
		}
	}
}

module.exports = UserInputAnalyzer
module.exports.VALID_EXCHANGES = VALID_EXCHANGES;
module.exports.EXCHANGES_CONVERSION = EXCHANGES_CONVERSION;