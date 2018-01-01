const AbstractExchange = require('./exchange');
require('dotenv').config();

var ccxt = require ('ccxt')

class Yobit extends AbstractExchange {
    constructor(logger, pumpEvents, exchangeName, skipVolumes = 0.5) {
        super(logger, pumpEvents, 5, 20, skipVolumes)
        this.all_markets = [];
        this.market_data = [];
        this.client = ccxt.yobit({
            apiKey: process.env.YOBIT_BUY_KEY,
            secret: process.env.YOBIT_BUY_SECRET
        })
    }

    watch() {
        this.get_markets((e) => {
            Object.keys(e).forEach((key) => {
                if (e[key].info.hidden == 0 && e[key].id.endsWith('btc'))
                    this.all_markets.push(e[key].id)
            })
        });

        setTimeout(() => { this.watchFunction(() => { this._select_good_volume_markets() }, 15 * 60 * 1000) }, 3 * 1000)
        setTimeout(() => { this.watchFunction(() => { this._watch_tickers() }, this.ticker_speed * 1000)    }, 5 * 1000)
    }

    static volume_for(pair) {
        return 'BTC' // all markets on Yobit are BTC
    }

    static symbol_for(pair) {
        return pair.split('-')[0]
    }

    static market_url(market) {
        let cur = market.split("-")[0].toLowerCase(0)
        return "http://yobit.net/en/trade/" + cur + "/BTC"
    }

    _watch_tickers() {
        let cycles = Math.ceil(this.markets.length / 50)
        for(let i = 0; i < cycles; i++) {
            let ticker_str = this.markets.slice(i * 50, (i+1) * 50).join("-")
            this.client.apiGetTickerPairs({'pairs': ticker_str}).then((data) => {
                if (data.error) {
                    this.logger.error("Error trying to retrieve yobit data on _watch_tickers:", data.error)
                } else {
                    Object.keys(data).forEach((market) => {
                        this.pumpEvents.emit('marketupdate', 'TICKER', this.code, market.toUpperCase().replace(/\_/, '-'), this._normalize_ticker_data(data[market]));
                    })
                }
            }).catch((e) => { this.logger.error("Error fetching YOBIT data:", e) })
        }
    }

    _select_good_volume_markets() {
        this.markets = []
        let cycles = Math.ceil(this.all_markets.length / 50)
        for(let i = 0; i < cycles; i++) {
            let ticker_str = this.all_markets.slice(i * 50, (i+1) * 50).join("-")
            this.client.apiGetTickerPairs({'pairs': ticker_str}).then((data) => {
                if (data.error) {
                    this.logger.error("Error trying to retrieve yobit data on _select_good_volume_markets:", data.error)
                } else {
                    Object.keys(data).forEach((market) => {
                        if (data[market].vol >= this.skipVolumes)
                            this.markets.push(market)
                    })
                }
            })
        }
    }

    marketList() {
        return this.markets.map((e)=>{ return e.toUpperCase().replace(/\_/, '-') })
    }

    get_markets(callback) {
        this.client.load_products().then(callback)
    }

    _normalize_ticker_data(data) {
        return {
            high: data.high,
            low: data.low,
            avg: data.avg,
            volume: data.vol,
            last: data.last,
            ask: data.sell,
            bid: data.buy
        }
    }
}

module.exports = Yobit;
