const AbstractExchange = require('./exchange');
const PoloniexClient = require('poloniex-api-node');

class Poloniex extends AbstractExchange {
    constructor(logger, pumpEvents, exchangeName, skipVolumes = 0.5) {
        super(logger, pumpEvents, 10, 20, skipVolumes)
        this.market_data = [];
        this.client = new PoloniexClient('nothing', 'nothing', { socketTimeout: 15000 })
    }

    watch() {
      this.watchFunction(() => { this._watch_tickers() }, this.ticker_speed * 1000)
    }

    static market_url(market) {
        return "https://poloniex.com/#/exchange/" + market.toLowerCase().replace(/\-/, "_")
    }


    marketList() {
        return this.markets.map((e)=>{return e.replace(/\_/, '-')})
    }

    _watch_tickers() {
        this.client.returnTicker().then((tickers) => {
            this.markets = Object.keys(tickers)
            Object.keys(tickers).forEach((market) => {
                if (this._filter_market(tickers[market])) {
                    this.pumpEvents.emit('marketupdate', 'TICKER', this.code, market.replace(/\_/, '-'), this._normalize_ticker_data(tickers[market]));
                }
            })
        }).catch((e) => { this.logger.error("Error trying to fetch POLONIEX:", e) })
    }

    _filter_market(data) {
        return (data.baseVolume > this.skipVolumes) && (data.isFrozen == '0')
    }

    _normalize_ticker_data(data) {
        return {
            id: data.id,
            high: parseFloat(data.high24hr),
            low: parseFloat(data.low24hr),
            volume: parseFloat(data.baseVolume),
            last: parseFloat(data.last),
            ask: parseFloat(data.lowestAsk),
            bid: parseFloat(data.highestBid),
            updated: data.updated,
            is_frozen: data.isFrozen
        }
    }
}

module.exports = Poloniex;
