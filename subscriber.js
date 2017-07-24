// Handles all the subscription process
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/detektor');

var subscriberSchema = mongoose.Schema({
    telegram_id: Number,
    exchanges: {
      Bittrex: { type: Boolean, default: true },
      Poloniex: { type: Boolean, default: true },
      Cryptopia: { type: Boolean, default: true },
      Yobit: { type: Boolean, default: true },
    }
});

module.exports = mongoose.model('subscribers', subscriberSchema);
