const AbstractExchange = require('./exchange');
require('dotenv').config();

const BinanceClient = require('binance');

class Binance extends AbstractExchange {
    constructor(logger, pumpEvents, exchangeName) {
        super(logger, pumpEvents)
        this.client = new BinanceClient.BinanceRest({
            key: 'api-key', // Get this from your account on binance.com
            secret: 'api-secret', // Same for this
            timeout: 15000, // Optional, defaults to 15000, is the request time out in milliseconds
            disableBeautification: false
            /*
             * Optional, default is false. Binance's API returns objects with lots of one letter keys.  By
             * default those keys will be replaced with more descriptive, longer ones.
             */
        });
    }

    watch(){
        this.watchFunction(() => { this._watch_tickers() }, this.ticker_speed * 1000)
    }

    static volume_for(pair) {
        return pair.split("-")[1]
    }

    static symbol_for(pair) {
        return pair.split("-")[0]
    }

    static market_url(market) {
        return "https://www.binance.com/trade.html?symbol=" + market.replace(/\-/,'_')
    }

    _watch_tickers() {
        this.client._makeRequest({}, (err, data)=>{
            if (err || data == undefined || data.filter == undefined) {
                this.logger.error("Error refreshing binance markets:", err)
            } else {
                data.forEach((data) => {
                    this.pumpEvents.emit('marketupdate', 'TICKER', this.code, this._normalizeMarketName(data.symbol), this._normalize_ticker_data(data));
                })
                this.markets = this._normalizeMarketNames(data)
            }
        }, 'api/v1/ticker/24hr');
    }

    marketList() {
       return this.markets.map((e) => { return e.name })
    }

    _normalizeMarketNames(data) { // NEOBTC => NEO-BTC
        return data.map((val) => {
            return {name: this._normalizeMarketName(val.symbol), key: val.symbol}
        })
    }

    _normalizeMarketName(name) {
        return name.split(/(ETH|BTC)$/i).slice(0,2).join('-')
    }

    _normalize_ticker_data(data) {
        return {
            high: parseFloat(data.highPrice),
            low: parseFloat(data.lowPrice),
            volume: parseFloat(data.quoteVolume),
            last: parseFloat(data.lastPrice),
            ask: parseFloat(data.askPrice),
            bid: parseFloat(data.bidPrice),
            updated: new Date(data.closeTime)
        }
    }

}

module.exports = Binance;
