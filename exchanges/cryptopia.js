const AbstractExchange = require('./exchange');
var https = require("https")

class Cryptopia extends AbstractExchange {
    constructor(logger, pumpEvents, exchangeName, skipVolumes = 0.5) {
        super(logger, pumpEvents, skipVolumes)
        this.all_markets = [];
        this.market_data = [];
    }

    watch(){
        this.watchFunction(() => { this._watch_tickers() }, this.ticker_speed * 1000)
    }

    _watch_tickers() {
        this.get_markets((err, tickers) => {
            if (err) {
                this.logger.error('Failed to retrieve Cryptopia data: ', err)
            } else {
                this.markets = tickers.map((e) => { return e.Label.replace(/\//, '-') })
                tickers.forEach((ticker) => {
                    if (this._filter_market(ticker)) {
                        let market = ticker.Label
                        this.pumpEvents.emit('marketupdate', 'TICKER', this.code, market.replace(/\//, '-'), this._normalize_ticker_data(ticker));
                    }
                })
            }
        })
    }

    static volume_for(pair) {
        return 'BTC' // all markets on Cryptopia are BTC
    }

    static symbol_for(pair) {
        return pair.split("-")[0]
    }

    static market_url(market) {
        return "https://www.cryptopia.co.nz/Exchange/?market=" + market.replace(/\-/, "_")
    }


    get_markets(callback) {
        let fetched_data = []
        this.public_request('GetMarkets/BTC', (err, data) => {
            if (err) {
               callback(err, data)
            } else {
                let matched = data.match(/\"Error\"\:null/)
                if (matched) { // doesnt matters where is the end
                    if (matched.index + 13 == data.length) {
                        fetched_data.push(data)
                    } else {
                        fetched_data.push(data.substr(0, matched.index + 13))
                    }
                    let json_data = this._parse_ticker_json(fetched_data.join(""))
                    if (json_data)
                       callback(null, json_data)
                } else { fetched_data.push(data) }
            }
        })
    }

    public_request(api_method, _callback) {
        var params = params || {}

        var options = {
            host: 'www.cryptopia.co.nz',
            path: '/Api/' + api_method,
            method: 'GET'
        }

        var req = https.request(options, (res) => {
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                _callback(false, chunk);
            });
        });

        req.on('error', (e) => {
            _callback(e, []);
        });

        req.end();
    }

    _parse_ticker_json(tickers_json) {
        let parsed_json = false
        try {
            parsed_json = JSON.parse(tickers_json).Data;
        } catch(e) {
            this.logger.error("Could not parse json", e); // error in the above string (in this case, yes)!
        }
        return parsed_json;
    }

    _filter_market(data) {
        return (data.BaseVolume > this.skipVolumes) && data.Label.match(/BTC/)
    }

    marketList() {
        return this.markets
    }

    _normalize_ticker_data(data) {
        return {
            id: data.TradePairId,
            high: data.High,
            low: data.Low,
            volume: data.BaseVolume,
            last: data.LastPrice,
            ask: data.AskPrice,
            bid: data.BidPrice,
        }
    }
}

module.exports = Cryptopia;
