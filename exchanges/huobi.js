const AbstractExchange = require('./exchange');
var request = require('request');
const MARKET_INFO = 'https://api.huobi.pro/v1/common/symbols'
const MARKETS_DATA = 'https://api.huobi.pro/market/detail/merged?symbol='


class Huobi extends AbstractExchange {
	constructor(logger, pumpEvents, exchangeName) {
        super(logger, pumpEvents)
        this.marketsInfo = {}
        this.marketsData = {}
    }

    watch(){
        this.refresh()
        const watchman = setInterval(() => this.refresh(), this.ticker_speed * 1000)
    }

    getMarketInfo() {
        return this._makeRequest(MARKET_INFO)
    }

    getMarketData() {
		Object.keys(this.marketsInfo).forEach((marketName) => {
			this._makeRequest(MARKETS_DATA + marketName).then((data) => {
				if (data.status != 'error') { // weirdly sends some random pairs that they don't support
					this.storeMarketData(this.marketsInfo[marketName], this._normalize_ticker_data(data.tick))
					this.emitData(this.marketsInfo[marketName])
				}
			}).catch((e) => { this.logger.error("Error fetching Huobi data:", marketName, e)})
		})
    }

    storeMarketInfo(marketsInfo) {
        return marketsInfo.map((marketInfo) => {
            this.marketsInfo[marketInfo['base-currency'] + marketInfo['quote-currency']] = marketInfo['quote-currency'].toUpperCase() + '-' + marketInfo['base-currency'].toUpperCase()
        })
    }

    storeMarketData(market, marketData) {
        this.marketsData[market] = marketData
    }

    refresh() {
        this.getMarketInfo().then((result) => {
            this.storeMarketInfo(result.data)
            this.getMarketData()
        }).catch((e) => { this.logger.error("Error updating markets for CoinExchange", e);  }) // either way send last info we had to not change ticker data order
    }

    marketList() {
        return Object.keys(this.marketsInfo).map((k) => this.marketInfo[k])
    }

    emitAllData() {
    	// loops and emits all, used for when something fails
    }

    emitData(market) {
        this.pumpEvents.emit('marketupdate', 'TICKER', this.code, market, this.marketsData[market]);
    }

    _makeRequest(url) {
        return new Promise((resolve, reject) => {
            request(url, function (error, response, body) {
                if (error)
                    reject(error)
                else {
                    try { resolve(JSON.parse(body)) } catch(e) { reject(e)}
                }
            })
        })
    }

    static market_url(market) {
        return "https://www.coinexchange.io/market/" + market.split('-').reverse().join('/')
    }

    _normalize_ticker_data(data) {
        return {
            high: data.high,
            low: data.low,
            volume: data.vol,
            last: data.close,
            ask: data.ask[0],
            bid: data.bid[0]
        }
    }
}
module.exports = Huobi
