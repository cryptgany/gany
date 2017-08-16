const AbstractExchange = require('./exchange');
const key          = process.env.KRAKEN_KEY; // API Key
const secret       = process.env.KRAKEN_SECRET; // API Private Key
const KrakenClient = require('kraken-exchange-api');

class Kraken extends AbstractExchange {

    constructor(logger, pumpEvents, exchangeName, tickerSpeed, cycleTime){
        super(logger, pumpEvents,exchangeName, tickerSpeed, cycleTime);
        this.client = new KrakenClient(key,secret);
    }

    watch(){
        console.log('watch function impl');
        this.watchTickers();   
    }

    watchTickers(){
        this.marketUrl()
        .then((data) => {
            return this.fetchTicker(data.result);
        })
        .then((data)=>{
            this.emitData(data.result);
        })
        .catch((e)=> console.error('Error fetching data: ',e));
        setTimeout(()=>this.watchTickers(),1000 * this._tickerSpeed); 
    }

    marketUrl(){
        console.log('marketUrl function impl');
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

    fetchTicker(assetPairs){
        console.log('fetchTicker function!...');
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
        console.log('Emitting Data!...');
        Object.keys(data).forEach(key => {
            this.pumpEvents.emit('marketupdate', 'TICKER', this.code, key, this.mapData(ticker));
        });
    }

    mapData(ticker){
        console.log('mapping data!');
        return {
            id: null,//it does not seem to have an ID XD
            high: ticker.h[0],
            low: ticker.l[0],
            volume: ticker.v[0],
            last: ticker.c[0],
            ask: ticker.a[0],
            bid: ticker.b[0],
        }
    }

}

module.exports = Kraken;