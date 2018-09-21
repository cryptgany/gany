// Migrates previously stored ticker data from mongodb to influx
// If anything bad happens while running this migration, make sure you influx.delete(time < now && type = 60/1D)
require('dotenv').config();
var mongoose = require('mongoose');
const Logger = require('../logger');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/detektor');

let TickerData = require('../models/ticker_data')

var tickerDataSchema = mongoose.Schema({
    exchange: String,
    market: String,
    ticker_type: { type: String, enum: ['hour', 'day'] },
    open: Number,
    high: Number,
    low: Number,
    close: Number,
    volume: { type: Number, default: 0 }
}, { timestamps: true });

let OldTickerData = mongoose.model('ticker_datas', tickerDataSchema)

// We find by day so it brings an usable amount of records
// in any time we run this, we should only run until 2018-Sept-21, as that's the date when it was merged to prod
var now = new Date(2018, 8, 21);
let logger = new Logger();

// HOURLY data
function work(date) {
	if (date < now) {
		let influxData = []
		let from = new Date(date.getFullYear(), date.getMonth(), date.getDate())
		from.setDate(from.getDate() - 1)
		from.setSeconds(from.getSeconds() + 1)
		let newDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()) // for next loop
		newDate.setDate(newDate.getDate() + 1)
		logger.log("Working for date:", date)
		OldTickerData.find({ticker_type: 'hour', createdAt: { $gte: from, $lte: date }}, (err, tickers) => {
			logger.log("Response from mongo: ", tickers.length)
			if (tickers.length > 0) {
				tickers.forEach((ticker) => {
					let fields = {high: ticker.high, low: ticker.low, open: ticker.open, close: ticker.close, volume: 0, volume24: ticker.volume}
					influxData.push({
						measurement: 'ticker_data',
						tags: { market: ticker.market, exchange: ticker.exchange, type: '60' },
						fields: fields,
						timestamp: ticker.createdAt
					})
				})
				TickerData.storeManyInBatches(influxData, () => {
					logger.log("Stored", influxData.length, "exchange-markets, running next date")
					work(newDate)
				})
			} else {
				logger.log("No records found, running next date")
				work(newDate)
			}
		})
	}
}

work(new Date(2017, 9, 31)) // we started storing our data on 31th October
