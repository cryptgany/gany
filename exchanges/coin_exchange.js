const AbstractExchange = require('./exchange');
var request = require('request');
const MARKETS_INFO = 'https://www.coinexchange.io/api/v1/getmarkets'
const MARKETS_DATA = 'https://www.coinexchange.io/api/v1/getmarketsummaries'

class CoinExchange extends AbstractExchange {
    constructor(logger, pumpEvents, exchangeName, skipVolumes = 0.5) {
        super(logger, pumpEvents, skipVolumes)
        this.marketsInfo = {}
        this.marketsData = []
    }

    watch(){
        const watchman = setInterval(() => refresh(), this.ticker_speed * 1000)
    }

    getMarketInfo() {
        return this.makeRequest(MARKETS_INFO)
    }

    getMarketData() {
        return this.makeRequest(MARKETS_DATA)
    }

    storeMarketInfo(marketsInfo) {
        marketsInfo.map((marketInfo) => {
            this.marketsInfo[marketInfo.MarketID] = marketInfo.MarketAssetCode + "-" + marketInfo.BaseCurrencyCode
        })
    }

    storeMarketsData(marketsData) {
        if (marketsData.length > 0)
            this.marketsData = marketsData.map((marketData) => this._normalize_ticker_data(marketData))
    }

    refresh() {
        this.getMarketInfo().then((data) => {
            this.storeMarketInfo(data)
            return this.getMarketData()
        }).then((marketDatas) => {
            this.storeMarketsData(marketDatas)
            this.emitData()
        }).catch((e) => { this.logger.error("Error updating markets for CoinExchange", e); this.emitData() }) // either way send last info we had to not change ticker data order
    }

    goodVolumeMarkets() {
        return this.marketsData.filter((e) => e.volume > this.skipVolumes)
    }

    marketList() {
        return Object.keys(this.marketsInfo).map((k) => this.marketInfo[k])
    }

    emitData() {
        console.log("Going to emit", this.marketsData)
    }

    makeRequest(url) {
        return new Promise((resolve, reject) => {
            request(url, function (error, response, body) {
                if (error)
                    reject(error)
                else {
                    try { resolve(JSON.parse(body).result) } catch(e) { reject(e)}
                }
            })
        })
    }

    static market_url(market) {
        return "https://bittrex.com/Market/Index?MarketName=" + market
    }

    _normalize_ticker_data(data) {
        return {
            market: this.marketsInfo[data.MarketID],
            high: parseFloat(data.HighPrice),
            low: parseFloat(data.LowPrice),
            volume: parseFloat(data.BTCVolume),
            last: parseFloat(data.LastPrice),
            ask: parseFloat(data.AskPrice),
            bid: parseFloat(data.BidPrice)
        }
    }
}

module.exports = CoinExchange;
