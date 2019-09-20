require('dotenv').config();
const Logger = require('../logger');
const Influx = require('influx');
const INSERT_BATCH_SIZE = 5000; // https://github.com/influxdata/docs.influxdata.com/issues/454
const SLEEP_BETWEEN_INSERTS = 300; // Some small MS to wait before sending additional batches to server

let logger = new Logger();

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

config.host = process.env.INFLUX_HOST || "influx"
config.username = process.env.INFLUX_USER || "ganyuser"
config.password = process.env.INFLUX_PASS || "ganypassword"

const influx = new Influx.InfluxDB(config)

class TickerData { // replace me with "Ticker" once "TickerData" and "Ticker" classes die (replaced by influxdb)
  static storeMany(values, callback) {
    // 'values' data array example:
    // measurement: 'ticker_data',
    // tags: { market: 'LTC-BTC', exchange: 'Binance', type: '1' },
    // fields: { open: open, high: high, low: low, close: close, volume: volume, volume24: volume24 },
    // timestamp: new Date(d.getTime()-60000 * i)
    influx.writePoints(values, {precision: 's'}).then(callback)
  }

  static storeManyInBatches(values, callback) {
    let cycle = 0;
    let batchCount = values.length;
    for (let i = 0; i < batchCount; i += INSERT_BATCH_SIZE) {
        let temparray = values.slice(i, i+INSERT_BATCH_SIZE);
        let batchN = cycle;
        // do whatever
        setTimeout(() => {
          logger.log("Uploading batch", batchN, "for", temparray.length, "records")
          influx.writePoints(temparray, {precision: 's'}).then(function() {})
          if ((i+INSERT_BATCH_SIZE) >= batchCount) { callback() } // submitted last batch
        }, batchN * SLEEP_BETWEEN_INSERTS)
        cycle += 1;
    }
  }

  static query(sql) { // returns promise
    return influx.query(sql)
  }

  static toNanoDate(args) {
    return Influx.toNanoDate(args)
  }

  static queryLastVolumeForAll() { // returns promise, ".last" as the last volume24 for each exchange market
    return TickerData.query(`select exchange, market, LAST(volume24) from ticker_data GROUP BY exchange, market`)
  }

  static timeSql(datetime) { return Influx.toNanoDate(datetime.getTime() + '000000').toNanoISOString() }

  static getResumeByTypeAndTime(type, from, to = new Date()) {
    let query = 'select FIRST(open) as open, MAX(high) as high, MIN(low) as low, LAST(close) as close, '
    query += "SUM(volume) as volume, LAST(volume24) as volume24 "
    query += `from ticker_data where type='${type}' and time >= '${this.timeSql(from)}' and time <= '${this.timeSql(to)}' `
    query += "group by exchange, market"
    return this.query(query)
  }

  static getTimeComparisson(type, exchange = 'All', time) { // time: 0-60 in minutes
    let from = new Date()
    from.setMinutes(from.getMinutes()-time)
    let to = new Date()

    let query = 'select FIRST(volume) as open_volume, LAST(volume) as close_volume, '
    query += 'FIRST(volume24) as open_volume24, LAST(volume24) as close_volume24, '
    query += 'FIRST(high) as open_high, LAST(high) as close_high, '
    query += 'FIRST(low) as open_low, LAST(low) as close_low, '
    query += 'FIRST(open) as open_open, LAST(open) as close_open, '
    query += 'FIRST(close) as open_close, LAST(close) as close_close from ticker_data '
    query += `where type='${type}' and time >= '${this.timeSql(from)}' and time <= '${this.timeSql(to)}' `
    if (exchange != 'All')
      query += ` and exchange = '${exchange}' `
    query += "group by exchange, market"

    return this.query(query)
  }

  static getMarketTimeComparisson(userInput) {
    let type = '1'
    let from = new Date()
    from.setMinutes(from.getMinutes()-userInput.time)
    let to = new Date()
    if (userInput.timeIsDays()) { type = '60' } // for days, we use type(influx) in hours

    let query = 'select FIRST(volume) as open_volume, LAST(volume) as close_volume, '
    query += 'FIRST(volume24) as open_volume24, LAST(volume24) as close_volume24, '
    query += 'FIRST(high) as open_high, LAST(high) as close_high, '
    query += 'FIRST(low) as open_low, LAST(low) as close_low, '
    query += 'FIRST(open) as open_open, LAST(open) as close_open, '
    query += 'FIRST(close) as open_close, LAST(close) as close_close from ticker_data '
    query += `where type='${type}'`
    if (userInput.exchange != undefined)
      query += ` and exchange = '${userInput.exchangeCamelCase()}' `

    if (userInput.market.match(/\-/)) { // /see neo-btc /see eth-usd
      query += ` and (market = '${userInput.market}' or market = '${userInput.inverseMarket()}') `
    } else { // /see neo | /see btc
      query += ` and market =~ /^${userInput.market}\\-|\\-${userInput.market}$/ `
    }

    // there is a problem here, this influx query can target every single minute between selected dates
    // there should be some kind of range depending on the query
    // for days, 3 hour range should be enough
    // for hours, 30 minutes
    // for minutes, dont use any range
    // if (userInput.timeIsMinutes()) {
      query += ` and time >= '${this.timeSql(from)}' and time <= '${this.timeSql(to)}' `
    // } // TODO: This is not working because influx doesn't supports OR with TIME.
    // if (userInput.timeIsHours() || userInput.timeIsDays()) {
    //   let fromRange = new Date()
    //   let toRange = new Date()
    //   if (userInput.timeIsHours()) {
    //     // findings should be in ranges of 30 minutes
    //     fromRange.setMinutes(from.getMinutes()-(userInput.time+30))
    //     toRange.setMinutes(to.getMinutes()-30)
    //   } else {
    //     // findings should be in ranges of 3 hours
    //     fromRange.setMinutes(from.getMinutes()-(userInput.time+(60*3)))
    //     toRange.setMinutes(to.getMinutes()-(60*3))
    //   }
    //   query += ` and ((time >= '${this.timeSql(fromRange)}' and time <= '${this.timeSql(from)}')`
    //   query += `  OR (time >= '${this.timeSql(toRange)}' and time <= '${this.timeSql(to)}')) `
    // }

    query += "group by exchange, market"
    return this.query(query)
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

module.exports = TickerData;
