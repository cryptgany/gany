// Handles all the subscription process
var bitcoin = require("bitcoinjs-lib");
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/detektor');

var subscriberSchema = mongoose.Schema({
    telegram_id: Number,
    btc_address: String,
    btc_private_key: String,
    exchanges: {
      Bittrex: { type: Boolean, default: true },
      Poloniex: { type: Boolean, default: true },
      Cryptopia: { type: Boolean, default: true },
      Yobit: { type: Boolean, default: true },
    },
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

subscriberSchema.methods.generate_btc_address = function() {
  return new Promise((resolve, reject) => {
    var keyPair = bitcoin.ECPair.makeRandom()
    var address = keyPair.getAddress();
    var pkey = keyPair.toWIF();
    this.btc_address = address
    this.btc_private_key = pkey
    this.save(function(err, subscriber){
      if (err) {
        console.error(err);
        reject(err)
      } else { resolve(subscriber.btc_address) }
    })
  })
}

subscriberSchema.methods.exchange_status = function(exchange) {
  return this.exchanges[exchange] ? "enabled" : "disabled"
}

module.exports = mongoose.model('subscribers', subscriberSchema);
