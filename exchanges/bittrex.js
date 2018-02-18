const AbstractExchange = require('./exchange');
const BittrexClient = require('node.bittrex.api');
require('dotenv').config();

class Bittrex extends AbstractExchange {
    constructor(logger, pumpEvents, exchangeName) {
        super(logger, pumpEvents)
        this.client = BittrexClient;
        this.client.options({
            'apikey' : process.env.BITTREX_KEY,
            'apisecret' : process.env.BITTREX_SECRET,
            'stream' : false, // will be removed from future versions
            'verbose' : false,
            'cleartext' : false
        });
    }

    watch(){
        this.watchFunction( () => { this._select_good_volume_markets() }, 15 * 60 * 1000)
        setTimeout(() => { this.watchFunction(() => { this._watch_tickers() }, this.ticker_speed * 1000) }, 5 * 1000)
    }

    _watch_tickers() { // watches markets every 10 seconds
        this.client.getmarketsummaries((data) => {
            if (data.success) {
                data.result.forEach((data) => {
                    if (this.markets.indexOf(data.MarketName) != -1)
                        this.pumpEvents.emit('marketupdate', 'TICKER', this.code, data.MarketName, this._normalize_ticker_data(data));
                });
            } else {
                this.logger.error("Error getting Bittrex tickers: ", data)
            }
        });
    }

    _select_good_volume_markets() {
        this.markets = []
        this.get_markets((info) => {
            if (info.result) {
                info.result.forEach((market_info) => {
                    if (market_info.MarketName.match(/^(BTC|ETH|(USDT\-ETH|USDT\-BTC))/) && !market_info.MarketName.match(/BITCNY/) && market_info.BaseVolume >= this.skipVolumes)
                        this.markets.push(market_info.MarketName);
                });
            } else {
                this.logger.error("Error trying to fetch data from bittrex:", info)
            }
        });
    }

    get_markets(callback) {
        this.client.getmarketsummaries( callback );
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

module.exports = Bittrex;
