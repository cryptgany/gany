const AbstractExchange = require('./exchange');
const STELLARPORT_URL = 'https://stellar.api.stellarport.io/Ticker';
var request = require('request');

class StellarDex extends AbstractExchange {

    constructor(logger, pumpEvents) {
        super(logger, pumpEvents)
    }

    fetchTicker() {
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

    marketList() {
        return this.markets
    }

    static market_url(market) {
        return "https://bittrex.com/Market/Index?MarketName=" + market
    }

    _normalize_ticker_data(data) {
        return {
            high: data.High,
            low: data.Low,
            volume: data.BaseVolume,
            last: data.Last,
            ask: data.Ask,
            bid: data.Bid,
            updated: data.TimeStamp
        }
    }
}

module.exports = StellarDex;
