const Logger = require('../logger');

let CronJob = require('cron').CronJob;
let TickerData = require('../models/ticker_data')

let logger = new Logger();

var dailyTickerDataJob = new CronJob('00 30 00 */1 * *', function() { // run at 12:30 so we don't interfere with hourly cron workers
  logger.log("Starting Daily Ticker Data Job")
  let now = new Date() // ticker time
  let time = new Date() // query calculation
  time.setDate(time.getDate() - 1); // 1 day ago

  let influxData = []
  TickerData.getResumeByTypeAndTime(60, time).then((data) => {
    data.forEach((row) => {
      let fields = {high: row.high, low: row.low, open: row.open, close: row.close, volume: row.volume, volume24: row.volume24}
      influxData.push({
        measurement: 'ticker_data',
        tags: { market: row.market, exchange: row.exchange, type: '1D' },
        fields: fields,
        timestamp: now
      })
    })

    TickerData.storeMany(influxData, () => { logger.log("Daily tickers stored into influx for", influxData.length, "exchange-markets")})
  })
}, function () {
  /* This function is executed when the job stops */
},
true,
'America/Los_Angeles'
);
