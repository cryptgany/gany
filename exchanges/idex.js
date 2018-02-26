const AbstractExchange = require('./exchange');
var request = require('request');
const MARKETS_DATA = 'https://api.idex.market/returnTicker'

class IDEX extends AbstractExchange {
    constructor(logger, pumpEvents, exchangeName) {
        super(logger, pumpEvents)
        this.marketsData = {}
    }

    watch(){
        this.refresh()
        const watchman = setInterval(() => this.refresh(), this.ticker_speed * 1000)
    }

    getMarketData() {
        return this._makeRequest(MARKETS_DATA)
    }

    filterMarkets(marketsData) { // 90% of markets never had trades and are N/A, we filter em
		return new Promise((resolve, reject) => {
			try {
				let _marketsData = {}
				Object.keys(marketsData).forEach((name) => {
					if (name.match(/^ETH/) && marketsData[name].last != 'N/A' && marketsData[name].baseVolume != '0') { _marketsData[name] = marketsData[name]}
				})
				resolve(_marketsData)
			} catch(e) { this.logger.error("Error filtering markets for IDEX"); reject(e) }
		})
    }

    storeMarketsData(marketsData) {
        return new Promise((resolve, reject) => {
        	try {
	        	if (Object.keys(marketsData).length > 0) {
		            this.marketsData = {}
		            Object.keys(marketsData).forEach((marketName) => { this.marketsData[this._normalizeMarketName(marketName)] = this._normalize_ticker_data(marketsData[marketName]) })
		        }
	            resolve()
        	} catch (e) { this.logger.error("Error storing IDEX data"); reject(e)}
	    })
    }

    refresh() {
        this.getMarketData().then((data) => {
        	return this.filterMarkets(data)
        }).then((data) => {
            return this.storeMarketsData(data)
        }).then(() => {
            this.emitData()
        }).catch((e) => { this.logger.error("Error updating markets for IDEX", e); this.emitData() }) // either way send last info we had to not change ticker data order
    }

    emitData() {
        Object.keys(this.marketsData).forEach((market) => {
            this.pumpEvents.emit('marketupdate', 'TICKER', this.code, market, this.marketsData[market]);
        })
    }

    _makeRequest(url) {
        return new Promise((resolve, reject) => {
            request({
					method: 'POST',
					url: url,
				}, function (error, response, body) {
				if (error)
					reject(error)
				else {
					try { resolve(JSON.parse(body)) } catch(e) { reject(e)}
                }
            })
        })
    }

    static market_url(market) {
        return "https://idex.market/" + market.toLowerCase().replace(/\-/, '/')
    }

    _normalizeMarketName(marketName) {
    	return marketName.replace(/\_/, '-')
    }

    _normalize_ticker_data(data) {
        return {
            high: parseFloat(data.high),
            low: parseFloat(data.low),
            volume: parseFloat(data.baseVolume),
            last: parseFloat(data.last),
            ask: parseFloat(data.lowestAsk),
            bid: parseFloat(data.highestBid)
        }
    }
}

module.exports = IDEX;
