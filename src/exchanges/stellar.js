const AbstractExchange = require('./exchange');
const STELLARPORT_URL = 'https://stellar.api.stellarport.io/Ticker';
const SKIP_MARKETS = ['USDT_XLM', 'FASTPAY']; // markets with erratic or bad numbers
var request = require('request');

class Stellar extends AbstractExchange {

	constructor(logger, pumpEvents) {
		super(logger, pumpEvents)
		this.lastFetch = []
	}

	watch() {
		this.watchFunction(() => { this._watch_tickers() }, this.ticker_speed * 1000)
	}

	_watch_tickers() {
		this.fetchTickers().then((tickers) => {
			return this.filterAndCleanAliveMarkets(tickers)
		}).then((tickersAlive) => {
			this.lastFetch = tickersAlive
			this.emitTicker(tickersAlive)
		}).catch((er) => {
			this.logger.log("ERROR: ", er)
			this.emitTicker(this.lastFetch)
		})
	}

	emitTicker(tickers) {
		Object.keys(tickers).forEach((marketName) => {
			this.pumpEvents.emit('marketupdate', 'TICKER', this.code, marketName, tickers[marketName]);
		})
	}

	fetchTickers() {
		return new Promise((resolve, reject) => {
			request(STELLARPORT_URL, function (error, response, body) {
				if (error)
					reject(error)
				else {
					try { resolve(JSON.parse(response.body)) } catch(e) { reject(e)}
				}
			})
		})
	}

	filterAndCleanAliveMarkets(marketsData) {
		return new Promise((resolve, reject) => {
			let finalTickers = {}
			Object.keys(marketsData).forEach((marketName) => {
				let marketData = marketsData[marketName]
				if (!this.shouldSkipMarket(marketName) && this.isAlive(marketData))
					finalTickers[this.normalizeName(marketName)] = this.normalize_ticker_data(marketData)
			})
			resolve(finalTickers)
		})

	}

	shouldSkipMarket(marketName) {
		return SKIP_MARKETS.find((m) => marketName.toUpperCase().match(m))
	}

	dataToArray() {
		let array = []
		Object.keys(this.lastFetch).forEach((marketName) => {
			let data = this.lastFetch[marketName]
			data.name = marketName
			array.push(data)
		})
		return array
	}

	isAlive(data) {
		return (data.open != null && data.close != null && data.high != null && data.low != null && data.volume > 0)
	}

	normalizeName(name) {
		return name.replace(/\_/, '-')
	}

	marketList() {
		return this.markets
	}

    static volume_for(pair) {
        return pair.split("-")[1]
    }

    static symbol_for(pair) {
        return pair.split("-")[0]
    }

	static market_url(market) {
		return "no_links"
	}

	normalize_ticker_data(data) {
		return {
			high: data.high,
			low: data.low,
			volume: data.volume,
			last: data.close,
			ask: null,
			bid: null,
		}
	}
}

module.exports = Stellar;
