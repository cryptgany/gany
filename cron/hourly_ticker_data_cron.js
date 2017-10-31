const Logger = require('../logger');

var CronJob = require('cron').CronJob;
var Ticker = require('../models/ticker')
var TickerData = require('../models/ticker_data')

var logger = new Logger();

var hourlyTickerDataJob = new CronJob('00 00 */1 * * *', function() {
  logger.log("Starting Hourly Ticker Data Job")
  let count = 0
  Ticker.getExchangeMarkets((err,exchangeMarkets) => {
    exchangeMarkets.forEach((exchangeMarket) => {
      setTimeout(() => {
        spt = exchangeMarket.split('.')
        logger.log("Saving hourly data for", spt[0], spt[1])
        Ticker.getRange(spt[0], spt[1], 0, 59, (err, data) => {
          Ticker.getHourlyHighLowResume(data).then((tdata) => {
            tickerData = new TickerData()
            tickerData.exchange = spt[0]
            tickerData.market = spt[1]
            tickerData.ticker_type = 'hour'
            tickerData.open = tdata.open
            tickerData.high = tdata.high
            tickerData.low = tdata.low
            tickerData.close = tdata.close
            return tickerData.save()

          }).catch((e) => { logger.error("Error generating hourly data:", e)})
        })
      }, count * 30) // very small delay for not fucking up mongo/redis
      count += 1
    })
  })
  }, function () {
    /* This function is executed when the job stops */
  },
  true,
  'America/Los_Angeles'
);
