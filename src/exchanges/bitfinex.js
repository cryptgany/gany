const AbstractExchange = require('./exchange');
const request = require('request')

class Bitfinex extends AbstractExchange {
    constructor(logger, pumpEvents, exchangeName) {
        super(logger, pumpEvents)
        this.markets = []
    }

    watch(){
        this.marketList().then((tickers) => {
            this.markets = tickers
            this.watchFunction(() => { this.refresh() }, this.ticker_speed * 1000)
        }).catch((err) => { this.logger.error("COULD NOT INITIALIZE BITFINEX: ", err) });
    }

    static volume_for(pair) { return pair.split("-")[1] }
    static symbol_for(pair) { return pair.split("-")[0] }
    static market_url(market) {
        return "https://www.bitfinex.com/t/" + market.replace(/\-/,':')
    }

    refresh() {
        this.getTickersData().then((data) => {
            return this.emit(data)
        }).catch((er) => {
            this.logger.error("Could not fetch bitfinex data:", er)
        })
    }

    getTickersData() {
        return new Promise((resolve, reject) => {
            var tickers_url = this.markets.map((e) => 't' + e.toUpperCase()).join(',')
            request.get('https://api.bitfinex.com/v2/tickers?symbols=' + tickers_url, (error, response, body) => {
                if (error) { reject(error) }
                resolve(JSON.parse(body))
            })
        })

    }

    marketList() {
        let that = this;
        return new Promise((resolve, reject) => {
            request.get('https://api.bitfinex.com/v1' + '/symbols',
              function(error, response, body) {
                if (error) { reject(error) }
                let parsedBody = {}
                try {
                    parsedBody = JSON.parse(body); // sometimes fails
                    resolve(parsedBody)
                } catch (e) {
                    that.logger.error("Error on bitfinex exchange:", e)
                }
            })
        })
    }

    emit(data) {
        return new Promise((resolve, reject) => {
            data.forEach((d) => {
                if (d[0].match(/\:/)) {
                    // skipping market
                } else {
                    this.pumpEvents.emit('marketupdate', 'TICKER', this.code, this._normalizeMarketName(d[0]), this._normalize_ticker_data(d));
                }
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
            volume: parseFloat(data[8] * data[7]),
            last: parseFloat(data[7]),
            ask: parseFloat(data[3]),
            bid: parseFloat(data[1])
        }
    }

}

module.exports = Bitfinex;
