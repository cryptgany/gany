const AbstractExchange = require('./exchange');
const Kucoin = require('kucoin-api')

class Kucoin extends AbstractExchange {
    constructor(logger, pumpEvents, exchangeName, skipVolumes = 0.5) {
        super(logger, pumpEvents, 'Kucoin', 5, 20, 'Kucoin', skipVolumes)
        this.lastData = {}
        this.client = new Kucoin()
    }

    watch(){
        this.getMarkets();
        setTimeout(()=>this.watch(), 1000 * this.ticker_speed);
    }

  	getMarkets () {
        this.client.getTicker({pair: []}).then((result) => {
            this.lastData = result.data
            this.emitData(result.data)
        }).catch(this.logger.error)
  	};

    emitData(data) {
        data.forEach((record) => {
            if (record.volValue >= this._skipVolumes)
                this._pumpEvents.emit('marketupdate', 'TICKER', this._code, record.symbol, this.mapData(data[key]))
        }
    }

    market_url(market) {
        return "https://www.kucoin.com/#/trade/" + market
    }

    marketList() {
        return Object.keys(this.lastData).filter((key) => {return (!key.match(/\_0x/) && this.lastData[key].baseVolume >= this._skipVolumes)}).map((e)=>{ return this.mapName(e) })
    }


    volume_for(pair) {
        return pair.split('-')[1]
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
