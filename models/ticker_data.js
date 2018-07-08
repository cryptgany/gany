// Handles all the subscription process
require('dotenv').config();
var mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/detektor');

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

TickerDataModel = mongoose.model('ticker_datas', tickerDataSchema)

module.exports = TickerDataModel;
