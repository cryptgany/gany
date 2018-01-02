const AbstractExchange = require('./exchange');
const key          = process.env.KRAKEN_KEY; // API Key
const secret       = process.env.KRAKEN_SECRET; // API Private Key
const KrakenClient = require('kraken-exchange-api');
const CurrencyMap = {
    'XXBT': 'BTC',
    'XBT':  'BTC',
    'XETC': 'ETC',
    'XETH': 'ETH',
    'ZEUR': 'EUR',
    'ZUSD': 'USDT',
    'ZCAD': 'CAD',
    'ZGBP': 'GBP',
    'ZJPY': 'JPY',
    'XICN': 'ICN',
    'XLTC': 'LTC',
    'XMLN': 'MLN',
    'XREP': 'REP',
    'XXDG': 'XDG',
    'XXLM': 'XLM',
    'XXMR': 'XMR',
    'XXRP': 'XRP',
    'XZEC': 'ZEC'
}

class Kraken extends AbstractExchange {

    constructor(logger, pumpEvents, exchangeName,skipVolumes = 0.5){
        super(logger, pumpEvents, skipVolumes);
        this.client = new KrakenClient(key,secret);
    }

    watch(){
        this.watchFunction(()=>this.watchTickers(),1000 * this.ticker_speed);
    }

    getAssets() {
        this.client.api('Assets', {asset: 'XBT'},(err,data) => {
            if(err)
                this.logger.log(JSON.stringify(err));
            else
                this.logger.log(JSON.stringify(data));
        });
    }

    static market_url(market){
        return "https://www.kraken.com/charts"
    }

    watchTickers(){
        this.fetchAssetPairs()
        .then((data) => {
            return this.fetchTicker(data.result);
        })
        .then((data)=>{
            this.emitData(data.result);
        })
        .catch((e)=> this.logger.error('Error fetching data for KRAKEN.'));
    }

    fetchAssetPairs() {
        let that = this;
        return new Promise(function (resolve, reject){
            that.client.api('AssetPairs', {},(err,data) => {
                if(err)
                    reject(err);
                else
                    resolve(data);
            });
        });
    }

    /**
     * It is not necessary because Kraken is too picky to provide URL for a market :)
     */

    marketList() {
        return this.markets.filter((e)=>{ return e != 'USDTZUSD' && e.match(/(XBT|XXBT|ETH)/) && !e.match(/\.d$/) }).map((e)=>{ return this.mapName(e) })
    }

    fetchTicker(assetPairs){
        let pairs = Object.keys(assetPairs).join();
        this.markets = Object.keys(assetPairs)

        let that = this;
        return new Promise(function (resolve, reject){
            that.client.api('Ticker', {pair:pairs},(err,data) => {
                if(err)
                    reject(err);
                else
                    resolve(data);
            });
        });
    }

    emitData(data){
        var that = this;
        Object.keys(data).forEach(key => {
            if (key != 'USDTZUSD' && key.match(/(XBT|XXBT|ETH)/))
            that.pumpEvents.emit('marketupdate', 'TICKER', this.code, this.mapName(key), this.mapData(data[key]));
        });
    }

    mapName(market) {
        if (market.length == 6) { // simple name ex: BCHUSD
            return this.mapCurrencyName(market.substr(0,3)) + "-" + this.mapCurrencyName(market.substr(3,6))
        }
        if (market.length == 7) { // specific DASH market
            return this.mapCurrencyName(market.substr(0,4)) + "-" + this.mapCurrencyName(market.substr(4,7))
        }
        if (market.length == 8) { // simple name ex XXBTZUSD
            return this.mapCurrencyName(market.substr(0,4)) + "-" + this.mapCurrencyName(market.substr(4,8))
        }
        return market
    }

    mapCurrencyName(name) {
        return CurrencyMap[name] || name
    }

    mapData(ticker){
        return {
            high: parseFloat(ticker.h[1]),
            low: parseFloat(ticker.l[1]),
            volume: parseFloat(ticker.v[1]),
            last: parseFloat(ticker.c[0]),
            ask: parseFloat(ticker.a[0]),
            bid: parseFloat(ticker.b[0]),
        }
    }

}

module.exports = Kraken;
