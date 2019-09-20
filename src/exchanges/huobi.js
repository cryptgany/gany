const AbstractExchange = require('./exchange');
var request = require('request');
const MARKET_INFO = 'https://api.huobi.pro/v1/common/symbols'
const MARKETS_DATA = 'https://api.huobi.pro/market/detail/merged?symbol='
// const TICKERS_URL = 'https://api.huobi.pro/market/tickers'

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
        var i = 0;
		Object.keys(this.marketsInfo).forEach((marketName) => {
            i += 1;
            setTimeout(() => {
                this._makeRequest(MARKETS_DATA + marketName).then((data) => {
                    let realMarketName = this.marketsInfo[marketName]
                    if (data.status != 'error') { // weirdly sends some random pairs that they don't support
                        if (data.tick.vol == 0) {
                            if (this.marketsData[realMarketName]) {
                                data.tick.vol = this.marketsData[realMarketName].volume;
                            }
                        }
                        this.storeMarketData(realMarketName, this._normalize_ticker_data(data.tick))
                        this.emitData(realMarketName)
                    }
                }).catch((e) => {
                    if (e == 'not_found_marked') {
                        // THIS IS EXPECTED, some endpoints DO REALLY do 404, we ignore the error and continue
                    } else { this.logger.error("Error fetching Huobi data:", marketName, e) }
                })
            }, i * 50)
		})
    }

    storeMarketInfo(marketsInfo) {
        return marketsInfo.map((marketInfo) => {
            this.marketsInfo[marketInfo['base-currency'] + marketInfo['quote-currency']] = marketInfo['base-currency'].toUpperCase() + '-' + marketInfo['quote-currency'].toUpperCase()
        })
    }

    storeMarketData(market, marketData) {
        this.marketsData[market] = marketData
    }

    refresh() {
        this.getMarketInfo().then((result) => {
            this.storeMarketInfo(result.data)
            this.getMarketData()
        }).catch((e) => { this.logger.error("Error updating markets for Huobi", e); this.emitAllData() }) // either way send last info we had to not change ticker data order
    }

    marketList() {
        return Object.keys(this.marketsInfo).map((k) => this.marketInfo[k])
    }

    emitAllData() {
		Object.keys(this.marketsData).forEach((marketName) => { this.emitData(marketName) })
    }

    emitData(market) {
        this.pumpEvents.emit('marketupdate', 'TICKER', this.code, market, this.marketsData[market]);
    }

    _makeRequest(url) {
        return new Promise((resolve, reject) => {
            request(url, function (error, response, body) {
                if (body.match(/404\ Not\ Found/)) {
                    reject("not_found_marked")
                } else {
                    if (error)
                        reject(error)
                    else {
                        try { resolve(JSON.parse(body)) } catch(e) { reject(e)}
                    }
                }
            })
        })
    }

    static market_url(market) {
    	return "https://www.huobi.pro/" + market.toLowerCase().split('-').join('_') + "/exchange/"
    }
    static volume_for(pair) { return pair.split("-")[1] }
    static symbol_for(pair) { return pair.split("-")[0] }

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
