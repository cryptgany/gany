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
var daysOfYear = [];
for (var to = new Date(2017, 4, 1); to <= now; to.setDate(to.getDate() + 1)) {
	var from = new Date(d.getFullYear(), d.getMonth(), d.getDate())
	var influxData = []
	from.setDate(from.getDate() - 1)
	from.setSeconds(from.getSeconds() + 1)
	console.log("Working for date:", to)
	OldTickerData.find({ticker_type: 'hour', createdAt: { $gte: from, $lte: to }}, (err, tickers) => {
		tickers.forEach((ticker) => {
			var fields = {high: ticker.high, low: ticker.low, open: ticker.open, close: ticker.close, volume: 0, volume24: ticker.volume}
			influxData.push({
				measurement: 'ticker_data',
				tags: { market: ticker.market, exchange: ticker.exchange, type: '60' },
				fields: fields,
				timestamp: ticker.createdAt
			})
		})
		TickerData.storeMany(influxData, () => { logger.log("Stored", influxData.length, "exchange-markets")})
	})
}



function storeIterative(type, from, to) {
	OldTickerData.find({ticker_type: type, createdAt: { $gte: from, $lte: to }}, (err, tickers) => {
	})
}

> new Date(2018, 7, 0)
2018-07-31T05:00:00.000Z
> new Date(2018, 6, 1)


storeIterative('hour', new Date(2017,1,1,0,0,0), new Date(2017,7,0,23,59,59))
