const AbstractExchange = require('./exchange');
const request = require('request')

class Bitfinex extends AbstractExchange {
    constructor(logger, pumpEvents, exchangeName) {
        super(logger, pumpEvents)
    }

    watch(){
        this.watchFunction(() => { this.refresh() }, this.ticker_speed * 1000)
    }

    static market_url(market) {
        return "https://www.bitfinex.com/t/" + market.replace(/\-/,':')
    }

    refresh() {
        this.marketList().then((tickers) => {
            return this.getTickersData(tickers)
        }).then((data) => {
            return this.emit(data)
        }).catch((er) => {
            this.logger.error("Could not fetch bitfinex data:", er)
        })
    }

    getTickersData(tickers) {
        return new Promise((resolve, reject) => {
            var tickers_url = tickers.map((e) => 't' + e.toUpperCase()).join(',')
            request.get('https://api.bitfinex.com/v2/tickers?symbols=' + tickers_url, (error, response, body) => {
                if (error) { reject(error) }
                resolve(JSON.parse(body))
            })
        })

    }

    marketList() {
        return new Promise((resolve, reject) => {
            request.get('https://api.bitfinex.com/v1' + '/symbols',
              function(error, response, body) {
                if (error) { reject(error) }
                resolve(JSON.parse(body))
            })
        })
    }

    emit(data) {
        return new Promise((resolve, reject) => {
            data.forEach((d) => {
                this.pumpEvents.emit('marketupdate', 'TICKER', this.code, this._normalizeMarketName(d[0]), this._normalize_ticker_data(d));
            })
        })
    }

    _normalizeMarketName(name) {
        return name.slice(1,4) + '-' + name.slice(4,8)
    }


    _normalize_ticker_data(data) {
        return {
            high: parseFloat(data[9]),
            low: parseFloat(data[10]),
            volume: parseFloat(data[8]),
            last: parseFloat(data[7]),
            ask: parseFloat(data[3]),
            bid: parseFloat(data[1])
        }
    }

}

module.exports = Bitfinex;
