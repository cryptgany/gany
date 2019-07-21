const AbstractExchange = require('./exchange');
var request = require('request');
const TICKER_ENDPOINT = 'https://api.kucoin.com/api/v1/market/allTickers'

class Kucoin extends AbstractExchange {
    constructor(logger, pumpEvents) {
        super(logger, pumpEvents)
    }

    watch(){
        this.watchFunction(()=>this.getMarkets(), 1000 * this.ticker_speed);
    }

  	getMarkets () {
        return this._makeRequest(TICKER_ENDPOINT).then((response) => {
            return response.data.ticker;
        }).then((tickers) => {
            this.lastData = tickers;
            this.emitData(tickers);
        }).catch((error) => {
            this.logger.error("Error in kucoin api: ", error)
        })

        // this.client.getTicker({pair: []}).then((result) => {
        //     this.lastData = result.data
        //     this.emitData(result.data)
        // }).catch(this.logger.error)
  	};

    emitData(data) {
        data.forEach((record) => { this.pumpEvents.emit('marketupdate', 'TICKER', this.code, record.symbol, this.mapData(record)) })
    }

    marketList() {
        return this.lastData.map((e) => { return e.symbol })
    }


    static volume_for(pair) {
        return pair.split('-')[1]
    }

    static symbol_for(pair) {
        return pair.split('-')[0]
    }

    static market_url(market) {
        return "https://www.kucoin.com/#/trade/" + market
    }

    mapData(ticker) {
        return {
            high: parseFloat(ticker.high),
            low: parseFloat(ticker.low),
            volume: parseFloat(ticker.volValue),
            last: parseFloat(ticker.last),
            ask: parseFloat(ticker.sell),
            bid: parseFloat(ticker.buy)
        }
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
}

module.exports = Kucoin;
