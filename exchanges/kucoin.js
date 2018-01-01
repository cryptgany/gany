const AbstractExchange = require('./exchange');
const KucoinClient = require('kucoin-api')

class Kucoin extends AbstractExchange {
    constructor(logger, pumpEvents, exchangeName, skipVolumes = 0.5) {
        super(logger, pumpEvents, 'Kucoin', 5, 20, 'Kucoin', skipVolumes)
        this.client = new KucoinClient()
    }

    watch(){
        this.watchFunction(()=>this.getMarkets(), 1000 * this.ticker_speed);
    }

  	getMarkets () {
        this.client.getTicker({pair: []}).then((result) => {
            this.lastData = result.data
            this.emitData(result.data)
        }).catch(this.logger.error)
  	};

    emitData(data) {
        data.forEach((record) => {
            if (record.volValue >= this.skipVolumes)
                this.pumpEvents.emit('marketupdate', 'TICKER', this.code, record.symbol, this.mapData(record))
        })
    }

    marketList() {
        return this.lastData.map((e) => { return e.symbol })
    }


    static volume_for(pair) {
        return pair.split('-')[1]
    }

    static symbol_for(pair) {
        return pair.split('-')[0]
    }

    static market_url(market) {
        return "https://www.kucoin.com/#/trade/" + market
    }

    mapData(ticker) {
        return {
            high: ticker.high,
            low: ticker.low,
            volume: ticker.volValue,
            last: ticker.lastDealPrice,
            ask: ticker.sell,
            bid: ticker.buy,
        }
    }
}

module.exports = Kucoin;
