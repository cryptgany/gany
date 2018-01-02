const AbstractExchange = require('./exchange');
const io = require('socket.io-client');
const BASE_URL = 'https://socket.etherdelta.com'

class EtherDelta extends AbstractExchange {
    constructor(logger, pumpEvents, exchangeName, skipVolumes = 0.5) {
        super(logger, pumpEvents, skipVolumes)
        this.client = io.connect(BASE_URL, { transports: ['websocket'] })
        this.lastData = {}

	    this.client.on('connect', () => {
	        this.logger.log('EtherDelta socket connected');
	    });

	    this.client.on('disconnect', () => {
	        this.logger.log('EtherDelta socket disconnected, reconnecting...');
            this.client.close()
            this.client = io.connect(BASE_URL, { transports: ['websocket'] })
	    });

    }

    watch(){
        this.watchFunction(()=>this.getMarkets(), 1000 * this.ticker_speed)
    }

  	getMarkets () {
        this.client.off('market')
    	this.client.emit('getMarket', {});
        this.client.once('market', (returnTicker, orders, trades, myOrders, myTrades, myFunds) => {
            if (returnTicker.returnTicker) {
                this.lastData = returnTicker.returnTicker
            } else {
                this.logger.error("EtherDelta fetch failed, emitting last stored data")
            }
            this.emitData(this.lastData) // failsafe for when fetching fails
        })
  	};

    emitData(data) {
        Object.keys(data).forEach(key => {
            if (!key.match(/\_0x/) && data[key].baseVolume >= this.skipVolumes) // also skip < 0.5 ETH volumes
                this.pumpEvents.emit('marketupdate', 'TICKER', this.code, this.mapName(key), this.mapData(data[key]))
        });
    }

    mapName(market) {
    	return market.replace(/\_/, '-')
    }

    marketList() {
        return Object.keys(this.lastData).filter((key) => {return (!key.match(/\_0x/) && this.lastData[key].baseVolume >= this.skipVolumes)}).map((e)=>{ return this.mapName(e) })
    }

    static volume_for(pair) {
        return 'ETH'
    }

    static market_url(market) {
        return "https://etherdelta.com/#" + market.split(/\-/).reverse().join('-')
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
