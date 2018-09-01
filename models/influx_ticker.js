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
  static storeMany(values) {
    // 'values' data array example:
    // measurement: 'ticker_data',
    // tags: { market: 'LTC-BTC', exchange: 'Binance', type: '1' },
    // fields: { open: open, high: high, low: low, close: close, volume: volume, volume24: volume24 },
    // timestamp: new Date(d.getTime()-60000 * i)
    influx.writePoints(values, {precision: 's'}).then((e) => { console.log("Inserted all records") })
  }

  static query(sql) { // returns promise
    return influx.query(sql)
  }

  static queryLastVolumeForAll() {
    return InfluxTicker.query("select exchange, market, LAST(volume24) from ticker_data GROUP BY exchange, market")
  }

  static getByTime(exchange, market, type, from, to) {
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

// insert random data
// d = new Date(2018, 7, 11, 12, 31, 11, 0)
// data = []
// var open=10.32, close=10.30, high=10.35, low=10.31, volume=100; volume24=120;
// for(let i = 1000000; i >= 0; i--) {
//   let dir = Math.random() > 0.5 // wether we went "up" or "down"
//   if (dir) {
//     open += Math.random() * 0.1
//     high += Math.random() * 0.1
//     low += Math.random() * 0.1
//     close += Math.random() * 0.1
//     volume = Math.random() * 100
//     volume24 = Math.random() * 1000
//   } else {
//     open -= Math.random() * 0.1
//     high -= Math.random() * 0.1
//     low -= Math.random() * 0.1
//     close -= Math.random() * 0.1
//     volume = Math.random() * 100
//     volume24 = Math.random() * 1000
//   }
//   data.push({
//     measurement: 'ticker_data',
//     tags: { market: 'LTC-BTC', exchange: 'Binance', type: '1' },
//     fields: { open: open, high: high, low: low, close: close, volume: volume, volume24: volume24 },
//     timestamp: new Date(d.getTime()-60000 * i)
//   })
//   if (i % 5000 == 0) {
//     influx.writePoints(data, {precision: 's'}).then((e) => { if (i == 0) { console.log("Inserted all records") } })
//     data = [];
//   }
// }

// // querying
// z = []
// d = new Date(2018, 7, 10, 12, 31, 11, 0)
// nanoDate = Influx.toNanoDate(d.getTime()  + '000000')


// influx.query(`select * from ticker_data where time >= '${nanoDate.toNanoISOString()}'`).then(results => {
//   console.log(results)
//   z = results
// })


// influx.query(`select * from ticker_data`).then(results => {
//   console.log(results)
//   z = results
// })


// influx.query(`select count(*) from ticker_data where market='NEO-BTC'`).then(results => {
//   console.log(results)
//   z = results
// })



// influx.query(`delete from ticker_data`).then(results => {
//   console.log(results)
//   z = results
// })
