require('dotenv').config();
const Influx = require('influx');

var config = {
  database: 'gany',
  schema: [
    {
      measurement: 'ticker_data',
      fields: {
        open: Influx.FieldType.FLOAT,
        high: Influx.FieldType.FLOAT,
        low: Influx.FieldType.FLOAT,
        close: Influx.FieldType.FLOAT,
        volume: Influx.FieldType.FLOAT,
        volume24: Influx.FieldType.FLOAT,
      },
      tags: [ // BTC-NEO, Binance, 1D|1H|1|3|5|15
        'market', 'exchange', 'type'
      ]
    }
  ]
}

if (process.env.ENVIRONMENT == 'development') {
  config.host = 'localhost'
} else {
  config.host = process.env.INFLUX_HOST
  config.username = process.env.INFLUX_USER
  config.password = process.env.INFLUX_PASS
}

const influx = new Influx.InfluxDB(config)

class InfluxTicker { // replace me with "Ticker" once "TickerData" and "Ticker" classes die (replaced by influxdb)
  static storeMany(values, callback) {
    // 'values' data array example:
    // measurement: 'ticker_data',
    // tags: { market: 'LTC-BTC', exchange: 'Binance', type: '1' },
    // fields: { open: open, high: high, low: low, close: close, volume: volume, volume24: volume24 },
    // timestamp: new Date(d.getTime()-60000 * i)
    influx.writePoints(values, {precision: 's'}).then(callback)
  }

  static query(sql) { // returns promise
    return influx.query(sql)
  }

  static toNanoDate(args) {
    return Influx.toNanoDate(args)
  }

  static queryLastVolumeForAll() { // returns promise, ".last" as the last volume24 for each exchange market
    return InfluxTicker.query(`select exchange, market, LAST(volume24) from ticker_data GROUP BY exchange, market`)
  }

  static getByTime(exchange, market, type, from, to) {
    let nanoFrom = Influx.toNanoDate(from.getTime()  + '000000')
    let nanoTo = Influx.toNanoDate(to.getTime()  + '000000')
    let _query = `select * from ticker_data
      where market='${pair}'
      and exchange='${exchange}'
      and type='${type}'
      and time >= '${nanoFrom.toNanoISOString()}'
      and time <= '${nanoTo.toNanoISOString()}'`;
    return influx.query(_query)
  }
}

module.exports = InfluxTicker;
