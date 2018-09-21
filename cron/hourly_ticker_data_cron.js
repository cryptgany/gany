const Logger = require('../logger');

let CronJob = require('cron').CronJob;
let InfluxTicker = require('../models/influx_ticker')

let logger = new Logger();

let hourlyTickerDataJob = new CronJob('00 00 */1 * * *', function() {
  logger.log("Starting Hourly Ticker Data Job")

  let now = new Date() // ticker time
  let time = new Date() // query calculation
  time.setHours(time.getHours() - 1) // 1 hour ago

  let influxData = []
  InfluxTicker.getResumeByTypeAndTime(1, time).then((data) => {
    data.forEach((row) => {
      let fields = {high: row.high, low: row.low, open: row.open, close: row.close, volume: row.volume, volume24: row.volume24}
      influxData.push({
        measurement: 'ticker_data',
        tags: { market: row.market, exchange: row.exchange, type: '60' },
        fields: fields,
        timestamp: now
      })
    })

    InfluxTicker.storeMany(influxData, () => { logger.log("Hourly tickers stored into influx for", influxData.length, "exchange-markets")})
  })

}, function () {
    /* This function is executed when the job stops */
},
true,
'America/Los_Angeles'
);
