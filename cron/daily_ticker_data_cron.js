const Logger = require('../logger');

var CronJob = require('cron').CronJob;
var Ticker = require('../models/ticker')
var TickerData = require('../models/ticker_data')

var logger = new Logger();

var dailyTickerDataJob = new CronJob('00 30 00 */1 * *', function() { // run at 12:30 so we don't interfere with hourly cron workers
  logger.log("Starting Daily Ticker Data Job")
  let count = 0
  Ticker.getExchangeMarkets((err,exchangeMarkets) => {
    exchangeMarkets.forEach((exchangeMarket) => {
      setTimeout(() => {
        spt = exchangeMarket.split('.')
        logger.log("Saving daily data for", spt[0], spt[1])

        TickerData.find({exchange: spt[0], market: spt[1]}).limit(24).sort([['createdAt', 'descending']]).exec((err, data) => {
          Ticker.getDailyHighLowResume(data).then((tdata) => {
            tickerData = new TickerData()
            tickerData.exchange = spt[0]
            tickerData.market = spt[1]
            tickerData.ticker_type = 'day'
            tickerData.open = tdata.open
            tickerData.high = tdata.high
            tickerData.low = tdata.low
            tickerData.close = tdata.close
            return tickerData.save()

          }).catch((e) => { logger.error("Error generating daily data:", e)})
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
