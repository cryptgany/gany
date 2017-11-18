const BASE_URL = 'https://socket.etherdelta.com'
const io = require('socket.io-client');

class EtherDelta {
    constructor(logger, pumpEvents, exchangeName, skipVolumes = 0.5) {
        super(logger, pumpEvents, 'EtherDelta', 5, 20, 'EtherDelta', skipVolumes)
        this.client = io.connect(BASE_URL, { transports: ['websocket'] })

	    this.client.on('connect', () => {
	        console.log('socket connected');
	    });

	    this.client.on('disconnect', () => {
	        console.log('socket disconnected');
	    });

	    this.client.on('market', (returnTicker, orders, trades, myOrders, myTrades, myFunds) => {
	    	console.log("MARKET", returnTicker, orders, trades, myOrders, myTrades, myFunds)
	    })
    }

    watch(){
        this.getMarkets();
        setTimeout(()=>this.watch(),1000 * this.ticker_speed);
    }

  	getMarkets () {
    	this.client.emit('getMarket', {});
  	};
}

module.exports = EtherDelta;
