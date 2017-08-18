const AbstractExchange = require('./exchange');
const key          = process.env.KRAKEN_KEY; // API Key
const secret       = process.env.KRAKEN_SECRET; // API Private Key
const KrakenClient = require('kraken-exchange-api');

class Kraken extends AbstractExchange {

    constructor(logger, pumpEvents, exchangeName,skipVolumes = 0.5){
        super(logger, pumpEvents,'Kraken', 5, 20, 'Kraken', skipVolumes);
        this.client = new KrakenClient(key,secret);
    }   

    watch(){
        this.watchTickers();   
        setTimeout(()=>this.watch(),1000 * this.ticker_speed);
    }

    getAssets() {
        this.client.api('Assets', {asset: 'XBT'},(err,data) => {
            if(err) 
                this._logger.log(JSON.stringify(err));
            else
                this._logger.log(JSON.stringify(data));
        });
    }

    watchTickers(){
        this.fetchAssetPairs()
        .then((data) => {
            return this.fetchTicker(data.result);
        })
        .then((data)=>{
            this.emitData(data.result);
        })
        .catch((e)=> this._logger.error('Error fetching data: ',e));
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
    market_url(market){
        return "https://www.kraken.com/charts"
    }

    fetchTicker(assetPairs){
        let pairs = Object.keys(assetPairs).join();
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
            that._pumpEvents.emit('marketupdate', 'TICKER', this._code, key, this.mapData(data[key]));
        });
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
