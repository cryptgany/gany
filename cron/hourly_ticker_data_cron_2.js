const Logger = require('../logger');

var CronJob = require('cron').CronJob;
var Ticker = require('./models/ticker')
var TickerData = require('../models/ticker_data')
var InfluxTicker = require('../models/influx_ticker')

var logger = new Logger();

var hourlyTickerDataJob = new CronJob('00 00 */1 * * *', function() {
	logger.log("Starting Hourly Ticker Data Job")

	var now = new Date() // ticker time
	var time = new Date() // query calculation
	time.setHours(time.getHours() - 1) // 1 hour ago

	var ret = []
	var tree = {}
	var influxData = []
	InfluxTicker.query(`select * from ticker_data where type='1' and time >= '${InfluxTicker.timeSql(time)}'`).then((data) => {
		// set tree with data
		data.forEach((row) => { // it's already sorted in ascending order, 58, 59, 00, 01, etc
			tree[row.exchange] = tree[row.exchange] || {}
			tree[row.exchange][row.market] = tree[row.exchange][row.market] || []
			tree[row.exchange][row.market].push(row)
		})


		Object.keys(tree).forEach((exchange) => {
			Object.keys(tree[exchange]).forEach((market) => {
				Ticker.getHourlyHighLowResume(tree[exchange][market]).then((resume) => { // we reverse it because that way the [0] element is the real first one
					influxData.push({
	                    measurement: 'ticker_data',
	                    tags: { market: market, exchange: exchange, type: '60' },
	                    fields: resume,
	                    timestamp: now
	                })
				})
			})
		})

		InfluxTicker.storeMany(influxData, (ret) => { this.logger.log("Hourly tickers stored into influx for", influxData.length, "exchange-markets", ret)})
	})

}, function () {
		/* This function is executed when the job stops */
},
true,
'America/Los_Angeles'
);
