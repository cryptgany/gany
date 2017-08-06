// Handles all the subscription process
var bitcoin = require("bitcoinjs-lib");
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/detektor');

var subscriberSchema = mongoose.Schema({
    telegram_id: Number,
    btc_address: String,
    btc_private_key: String,
    subscription_status: { type: Boolean, default: false },
    subscription_expires_on: Date,
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

subscriberSchema.methods.set_subscription_confirmed = function() {
  this.subscription_status = true
  today = new Date()
  if (this.subscription_expires_on && this.subscription_expires_on >= today) {
    // is currently subscribed
    this.subscription_expires_on = this.subscription_expires_on.setDate(this.subscription_expires_on.getDate()+30)
  } else {
    today.setDate(today.getDate()+30);
    this.subscription_expires_on = today
  }
  this.save(function(err, subscriber){
    if (err) { console.error(err); }
  })
}

subscriberSchema.statics.unpaid_or_almost_expired = function(days, callback) {
  date = new Date();
  date.setDate(date.getDate()-days);
  Subscriber.find({
    $and: [
      { btc_address: {$ne: null} },
      { $or: [{subscription_status: false}, {subscription_expires_on: {$gt: date}}] }
    ]
  }, callback)
}

subscriberSchema.methods.exchange_status = function(exchange) {
  return this.exchanges[exchange] ? "enabled" : "disabled"
}

module.exports = Subscriber = mongoose.model('subscribers', subscriberSchema);
