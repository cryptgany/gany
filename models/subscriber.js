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
    subscription_type: { type: String, default: 'basic', enum: ['basic', 'advanced', 'pro'] },
    blocked: { type: Boolean, default: false },
    balance: { type: Number, default: 0 },
    exchanges: {
      Bittrex: { type: Boolean, default: true },
      Poloniex: { type: Boolean, default: true },
      Cryptopia: { type: Boolean, default: true },
      Yobit: { type: Boolean, default: true },
      Kraken: { type: Boolean, default: true },
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

subscriberSchema.methods.add_balance = function(balance) {
  this.balance += balance
  this.save(function(err, subscriber){
    if (err) { console.error(err); }
  })
}

subscriberSchema.methods.set_subscription_confirmed = function(added_balance = 0) { // added_balance = total transfered amount
  expiry_date = new Date()
  if (this.subscription_expires_on && this.subscription_expires_on >= expiry_date) {
    // is currently subscribed
    expiry_date.setDate(this.subscription_expires_on.getDate()+30)
  } else {
    expiry_date.setDate(expiry_date.getDate()+30);
  }
  this.balance += added_balance
  this.subscription_status = true
  this.subscription_expires_on = expiry_date
  this.save(function(err, subscriber){
    if (err) { console.error(err); }
  })
}

subscriberSchema.statics.unpaid_or_almost_expired = function(days, callback) {
  date = new Date();
  date.setDate(date.getDate()+days);
  SubscriberModel.find({
    $and: [
      { btc_address: {$ne: null} },
      { $or: [{subscription_status: false}, {subscription_expires_on: {$lt: date}}] }
    ]
  }, callback)
}

subscriberSchema.methods.exchange_status = function(exchange) {
  return this.exchanges[exchange] ? "enabled" : "disabled"
}

SubscriberModel = mongoose.model('subscribers', subscriberSchema)

module.exports = SubscriberModel;
