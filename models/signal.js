// Handles all the subscription process
require('dotenv').config();
var mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/detektor');

var signalSchema = mongoose.Schema({
    exchange: String,
    market: String,
    change: Number,
    time: Number,
    first_ticker: {
      high: Number,
      low: Number,
      volume: Number,
      last: Number,
      ask: Number,
      bid: Number
    },
    last_ticker: {
      high: Number,
      low: Number,
      volume: Number,
      last: Number,
      ask: Number,
      bid: Number
    },
}, { timestamps: true });

SignalModel = mongoose.model('signals', signalSchema)

module.exports = SignalModel;
