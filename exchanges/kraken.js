const AbstractExchange = require('./exchange');
const key          = process.env.KRAKEN_KEY; // API Key
const secret       = process.env.KRAKEN_SECRET; // API Private Key
const KrakenClient = require('kraken-exchange-api');

class Kraken extends AbstractExchange {

    constructor(logger, pumpEvents, exchangeName, ticketSpeed, cycleTime){
        super(exchangeName, ticketSpeed, cycleTime);
        this.client = new KrakenClient(key,secret);
    }

    watch(){
        console.log('watch function impl');
        this.client.api('Ticker', {"pair": 'XXDGXXBT'},(err,data) => {
        //this.client.api('AssetPairs', {},(err,data) => {
            if(err) 
                console.log('error: ', JSON.stringify(err));
            else
                console.log('data' + data);
        });
    }

    marketUrl(){
        console.log('marketUrl function impl')
    }

}

module.exports = Kraken;