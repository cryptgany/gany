const Logger = require('../logger');
var logger = new Logger();

var Ticker = require('../models/ticker')
var TickerData = require('../models/ticker_data')

TickerData.remove({ticker_type: 'day'}).then(() => {console.log("Done")})

let count = 3251;
let start = new Date();
let end = [];
let cnt = 0;
let errs = [];
let callStack = []; // call stack

Ticker.getExchangeMarkets((err,exchangeMarkets) => {
  exchangeMarkets.filter((e) => e.match(/\./)).forEach((exchangeMarket) => {
    callStack.push(() => { return new Promise((resolve, reject) => {
      let spt = exchangeMarket.split('.')
      TickerData.find({exchange: spt[0], market: spt[1], ticker_type: 'hour'}).sort([['createdAt', 'descending']]).exec((err, data) => {
        if (data) {
          let len = parseInt(data.length/24)
          setTimeout(() => { reject(exchangeMarket, 'timeout') }, 60*1000)
          if (len > 0) {
            for (let i = 0; i < len; i++) {
              let tempData = data.slice(i*24, (i+1)*24)
              let tempDate = tempData[10].createdAt
              Ticker.getDailyHighLowResume(tempData.reverse()).then((tdata) => {
                let tickerData = new TickerData()
                tickerData.exchange = spt[0]
                tickerData.market = spt[1]
                tickerData.ticker_type = 'day'
                tickerData.open = tdata.open
                tickerData.high = tdata.high
                tickerData.low = tdata.low
                tickerData.close = tdata.close
                tickerData.volume = tdata.volume
                tickerData.createdAt = new Date(tempDate.getFullYear(), tempDate.getMonth(), tempDate.getDate(), 0,0,0,0)

                if (i == len-1) {
                  cnt += 1;
                  if (cnt == 3250) {
                    end = new Date() // so we know how long it took
                  }
                  logger.log("[" + cnt + "/" + count + "]", "finished storing", spt[0], spt[1], len)
                  resolve()
                }
                return tickerData.save()

              }).catch((err) => {reject(exchangeMarket, err)})
            }
          }
        } else { reject(exchangeMarket, 'no data found'); }
      })
    })})
  })
})


function runStack(id = 0) {
  callStack[id]().then((r) => {runStack(id+1)}).catch( (exchangeMarket, e) => { cnt += 1; logger.error("Error generating daily data for " + exchangeMarket + ":", e); runStack(id+1);} )
}

runStack()
