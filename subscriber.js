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
}, { timestamps: true });

subscriberSchema.methods.change_exchange_status = function (exchange, decision) {
  decision = decision == 'enabled' ? true : false
  if (this.exchanges[exchange] != decision) {
    this.exchanges[exchange] = decision
    this.save(function (err, subscriber) {
      if (err) return console.error(err);
    });
  }
}

subscriberSchema.methods.exchange_status = function(exchange) {
  return this.exchanges[exchange] ? "enabled" : "disabled"
}

module.exports = mongoose.model('subscribers', subscriberSchema);
