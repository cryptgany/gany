// Migrates previously stored ticker data from mongodb to influx

require('dotenv').config();
var mongoose = require('mongoose');
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
var now = new Date();

function work(date) {
	let influxData = []
	let from = new Date(date.getFullYear(), date.getMonth(), date.getDate())
	from.setDate(from.getDate() - 1)
	from.setSeconds(from.getSeconds() + 1)
	console.log("Working for date:", date)
	OldTickerData.find({ticker_type: 'hour', createdAt: { $gte: from, $lte: date }}, (err, tickers) => {
		console.log("Response from mongo: ", tickers.length)
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
			console.log("Stored", influxData.length, "exchange-markets, running next date")
			let newDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
			newDate.setDate(newDate.getDate() + 1)
			work(newDate)
		})
	})
}

work(new Date(2017, 4, 1))
