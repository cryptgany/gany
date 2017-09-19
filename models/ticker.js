// Stores data for each minute. Should be cleaned for 30+ days old data
require('dotenv').config();
var mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/detektor');

var tickerSchema = mongoose.Schema({
    exchange: String,
    market: String,
    data: {
        high: Number,
        low: Number,
        volume: Number,
        last: Number,
        ask: Number,
        bid: Number
    },
    length: { type: String, enum: ['minute', 'hour'], default: 'minute' }, // in case we ever want to store more than that
}, { timestamps: true });

TickerModel = mongoose.model('tickers', tickerSchema)

module.exports = TickerModel;
