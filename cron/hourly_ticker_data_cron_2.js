const Logger = require('../logger');

var CronJob = require('cron').CronJob;
var TickerData = require('../models/ticker_data')
var InfluxTicker = require('../models/influx_ticker')

var logger = new Logger();

var hourlyTickerDataJob = new CronJob('00 00 */1 * * *', function() {
	logger.log("Starting Hourly Ticker Data Job")

	var now = new Date()
	now.setHours(now.getHours() - 1) // 1 hour ago

	var ret = []
	var tree = {}
	var influxData = []
	InfluxTicker.query(`select * from ticker_data where time >= '${InfluxTicker.timeSql(now)}'`).then((data) => {
		// set tree with data
		data.forEach((row) => { // it's already sorted in ascending order, 58, 59, 00, 01, etc
			tree[row.exchange] = tree[row.exchange] || {}
			tree[row.exchange][row.market] = tree[row.exchange][row.market] || []
			tree[row.exchange][row.market].push(row)
		})


		Object.keys(data).forEach((exchange) => {
			Object.keys(data[exchange]).forEach((market) => {
				Ticker.getHourlyHighLowResume(data[exchange][market]).then((resume) => { // we reverse it because that way the [0] element is the real first one


// INFLUX TICKER
  'POWR-BTC': 
   [ { time: [Object],
       close: 0.0000215,
       exchange: 'Binance',
       high: 0.0000215,
       low: 0.0000215,
       market: 'POWR-BTC',
       open: 0.0000215,
       type: '1',
       volume: 0,
       volume24: 57.72452327 },
     { time: [Object],
       close: 0.00002149,
       exchange: 'Binance',
       high: 0.00002149,
       low: 0.00002149,
       market: 'POWR-BTC',
       open: 0.0000215,
       type: '1',
       volume: 0,
       volume24: 57.7173238 },



// CURRENT TICKER
  { high: 0.002849,
    low: 0.002592,
    volume: 1341.94479864,
    last: 0.00281,
    ask: 0.00281,
    bid: 0.002808,
    updated: '2018-09-13T02:59:49.396Z',
    open: 0.00281,
    close: 0.00281,
    minuteHigh: 0.002812,
    minuteLow: 0.00281 } ]



				influxData.push({
                    measurement: 'ticker_data',
                    tags: { market: market, exchange: exchange, type: '60' },
                    fields: {
                        open: handled_data.open,
                        high: handled_data.minuteHigh,
                        low: handled_data.minuteLow,
                        close: handled_data.close,
                        volume: vol || 0,
                        volume24: handled_data.volume
                    },
                    timestamp: date
                })
			})
		})



	})

}, function () {
		/* This function is executed when the job stops */
},
true,
'America/Los_Angeles'
);
