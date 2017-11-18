const AbstractExchange = require('./exchange');
const io = require('socket.io-client');
const BASE_URL = 'https://socket.etherdelta.com'

class EtherDelta extends AbstractExchange {
    constructor(logger, pumpEvents, exchangeName, skipVolumes = 0.5) {
        super(logger, pumpEvents, 'EtherDelta', 10, 20, 'EtherDelta', skipVolumes)
        this.client = io.connect(BASE_URL, { transports: ['websocket'] })
        this.lastData = {} // for when however it fails

	    this.client.on('connect', () => {
	        this._logger.log('EtherDelta socket connected');
	    });

	    this.client.on('disconnect', () => {
	        this._logger.log('EtherDelta socket disconnected, reconnecting...');
            this.client = io.connect(BASE_URL, { transports: ['websocket'] })
	    });

	    this.client.on('market', (returnTicker, orders, trades, myOrders, myTrades, myFunds) => {
            if (returnTicker.returnTicker) {
                this.lastData = returnTicker.returnTicker
            } else {
                this._logger.error("EtherDelta fetch failed, emitting last stored data", Object.keys(this.lastData))
            }
            this.emitData(this.lastData) // failsafe for when fetching fails
	    })
    }

    watch(){
        this.getMarkets();
        setTimeout(()=>this.watch(), 1000 * this.ticker_speed);
    }

  	getMarkets () {
    	this.client.emit('getMarket', {});
  	};

    emitData(data) {
        Object.keys(data).forEach(key => {
            if (!key.match(/\_0x/) && data[key].baseVolume >= this._skipVolumes) // also skip < 0.5 ETH volumes
                this._pumpEvents.emit('marketupdate', 'TICKER', this._code, this.mapName(key), this.mapData(data[key]))
        });
    }

    market_url(market){
        return "https://etherdelta.com/#" + market
    }

    mapName(market) {
    	return market.replace(/\_/, '-')
    }


    volume_for(pair) {
        return 'ETH'
    }

    mapData(ticker) {
        return {
            high: 0, // replace with real calculated value
            low: 0, // replace with real calculated value
            volume: parseFloat(ticker.baseVolume), // using ETH volume
            last: parseFloat(ticker.last),
            ask: parseFloat(ticker.ask),
            bid: parseFloat(ticker.bid),
        }
    }
}

module.exports = EtherDelta;
