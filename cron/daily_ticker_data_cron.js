const Logger = require('../logger');

var CronJob = require('cron').CronJob;
var Ticker = require('../models/ticker')
var TickerData = require('../models/ticker_data')

var logger = new Logger();

var dailyTickerDataJob = new CronJob('00 30 00 */1 * *', function() { // run at 12:30 so we don't interfere with hourly cron workers
  logger.log("Starting Daily Ticker Data Job")
  let count = 0
  let tempDate = new Date()
  tempDate = new Date(tempDate.getFullYear(), tempDate.getMonth(), tempDate.getDate(), 0,0,0,0) // consistence over daily charts time
  Ticker.getExchangeMarkets((err,exchangeMarkets) => {
    exchangeMarkets.forEach((exchangeMarket) => {
      setTimeout(() => {
        spt = exchangeMarket.split('.')
        logger.log("Saving daily data for", spt[0], spt[1])
        TickerData.find({exchange: spt[0], market: spt[1], ticker_type: 'hour'}).limit(24).sort([['createdAt', 'descending']]).exec((err, data) => {
          Ticker.getDailyHighLowResume(data.reverse()).then((tdata) => {
            tickerData = new TickerData()
            tickerData.exchange = spt[0]
            tickerData.market = spt[1]
            tickerData.ticker_type = 'day'
            tickerData.open = tdata.open
            tickerData.high = tdata.high
            tickerData.low = tdata.low
            tickerData.close = tdata.close
            tickerData.volume = tdata.volume
            tickerData.createdAt = tempDate
            return tickerData.save()

          }).catch((e) => { logger.error("Error generating daily data for " + spt[0] + "/" + spt[1] + ":", e)})
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
