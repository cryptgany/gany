const AbstractExchange = require('./exchange');
var request = require('request');
const MARKETS_INFO = 'https://www.coinexchange.io/api/v1/getmarkets'
const MARKETS_DATA = 'https://www.coinexchange.io/api/v1/getmarketsummaries'

class CoinExchange extends AbstractExchange {
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
        return this._makeRequest(MARKETS_INFO)
    }

    getMarketData() {
        return this._makeRequest(MARKETS_DATA)
    }

    storeMarketInfo(marketsInfo) {
        marketsInfo.map((marketInfo) => {
            this.marketsInfo[marketInfo.MarketID] = marketInfo.MarketAssetCode + "-" + marketInfo.BaseCurrencyCode
        })
    }

    storeMarketsData(marketsData) {
        if (marketsData.length > 0) {
            this.marketsData = {}
            marketsData.forEach((marketData) => { this.marketsData[this.marketsInfo[marketData.MarketID]] = this._normalize_ticker_data(marketData) })
        }
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

    marketList() {
        return Object.keys(this.marketsInfo).map((k) => this.marketInfo[k])
    }

    emitData() {
        Object.keys(this.marketsData).forEach((market) => {
            this.pumpEvents.emit('marketupdate', 'TICKER', this.code, market, this.marketsData[market]);
        })
    }

    _makeRequest(url) {
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
        return "https://www.coinexchange.io/market/" + market.split('-').join('/')
    }
    static volume_for(pair) { return pair.split("-")[1] }
    static symbol_for(pair) { return pair.split("-")[0] }

    _normalize_ticker_data(data) {
        return {
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
