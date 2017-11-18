const BASE_URL = 'https://socket.etherdelta.com'
const io = require('socket.io-client');

class EtherDelta {
    // constructor(logger, pumpEvents, exchangeName, skipVolumes = 0.5) {
    //     super(logger, pumpEvents, 'EtherDelta', 10, 20, 'EtherDelta', skipVolumes)
    constructor(){
        this.client = io.connect(BASE_URL, { transports: ['websocket'] })
        this.x = []

	    this.client.on('connect', () => {
	        console.log('socket connected');
	    });

	    this.client.on('disconnect', () => {
	        console.log('socket disconnected');
	    });

	    this.client.on('market', (returnTicker, orders, trades, myOrders, myTrades, myFunds) => {
            console.log(returnTicker, orders, trades, myOrders, myTrades, myFunds)
            // this.emitData(returnTicker.returnTicker)
	    })
    }

    watch(){
        this.getMarkets();
        setTimeout(()=>this.watch(),1000 * this.ticker_speed);
    }

  	getMarkets () {
    	this.client.emit('getMarket', {});
  	};

    emitData(data){
        Object.keys(data).forEach(key => {
            if (!key.match(/\_0x/))
                this._pumpEvents.emit('marketupdate', 'TICKER', this._code, this.mapName(key), this.mapData(data[key]))
        });
    }

    market_url(market){
        return "https://etherdelta.com/#" + market
    }

    mapName(market) {
    	return market.replace(/\_/, '-')
    }

    mapData(ticker) {
        return {
            high: 0, // replace with real calculated value
            low: 0, // replace with real calculated value
            volume: parseFloat(ticker.baseVolume),
            last: parseFloat(ticker.last),
            ask: parseFloat(ticker.ask),
            bid: parseFloat(ticker.bid),
        }
    }
}

module.exports = EtherDelta;
