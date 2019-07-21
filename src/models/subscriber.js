// Handles all the subscription process
require('dotenv').config();

var mongoose = require('mongoose');

var subscriberSchema = mongoose.Schema({
    telegram_id: Number,
    full_name: String,
    language: String,
    username: String,
    btc_address: String,
    btc_private_key: String,
    btc_final_balance: { type: Number, default: 0 }, // Current balance in btc address
    subscription_status: { type: Boolean, default: false },
    subscription_expires_on: Date,
    subscription_type: { type: String, default: 'basic', enum: ['basic', 'advanced', 'pro'] },
    blocked: { type: Boolean, default: false },
    balance: { type: Number, default: 0 }, // Leftover after paying subscription
    notify_user_paid: { type: Boolean, default: false }, // we iterate over this to see who recently paid so we can tell them
    notify_user_paid_different_amount: { type: Boolean, default: false }, // when user didn't pay the whole amount
    payments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'payments' }],
    alerts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'alerts' }],
    last_payment: { type: mongoose.Schema.Types.ObjectId, ref: 'payments' },
    exchanges: {
      Bittrex: { type: Boolean, default: true },
      Poloniex: { type: Boolean, default: true },
      Cryptopia: { type: Boolean, default: true },
      Yobit: { type: Boolean, default: true },
      Kraken: { type: Boolean, default: true },
      Binance: { type: Boolean, default: true },
      EtherDelta: { type: Boolean, default: true },
      Kucoin: { type: Boolean, default: true },
      CoinExchange: { type: Boolean, default: true },
      Huobi: { type: Boolean, default: true },
      IDEX: { type: Boolean, default: true },
      Bitfinex: { type: Boolean, default: true },
    },
    markets: {
      BTC:  { type: Boolean, default: true },
      ETH:  { type: Boolean, default: true },
      NEO:  { type: Boolean, default: true },
      DOGE:  { type: Boolean, default: true },
      ETC:  { type: Boolean, default: true },
      LTC:  { type: Boolean, default: true },
      USDT: { type: Boolean, default: true },
      TUSD: { type: Boolean, default: true },
      USD: { type: Boolean, default: true },
      GBP: { type: Boolean, default: true },
      EUR: { type: Boolean, default: true },
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

subscriberSchema.methods.change_market_status = function (market, decision) {
  decision = decision == 'enabled' ? true : false
  if (this.markets[market] != decision) {
    this.markets[market] = decision
    this.save(function (err, subscriber) {
      if (err) return console.error(err);
    });
  }
}

subscriberSchema.methods.set_final_balance = function(amount) {
  this.btc_final_balance = amount
  this.save()
}

subscriberSchema.methods.total_balance = function() {
  return this.balance + this.btc_final_balance
}

// todo: remove this method after people that still has balance runs out of it
subscriberSchema.methods.set_subscription_confirmed = function(price = 0) { // price is the price of subscription
  expiry_date = new Date()
  if (this.subscription_expires_on && this.subscription_expires_on >= expiry_date) {
    // is currently subscribed
    expiry_date.setMonth(this.subscription_expires_on.getMonth()+1)
  } else {
    expiry_date.setMonth(expiry_date.getMonth()+1);
  }
  this.balance = this.btc_final_balance + this.balance
  this.balance -= price
  this.btc_final_balance = 0
  this.subscription_status = true
  this.subscription_expires_on = expiry_date
  this.save(function(err, subscriber){
    if (err) { console.error(this.telegram_id, err); }
  })
}

subscriberSchema.methods.add_subscription_time = function(days) {
  expiry_date = new Date()
  if (this.subscription_expires_on && this.subscription_expires_on >= expiry_date) {
    // is currently subscribed
    expiry_date = new Date(this.subscription_expires_on)
    expiry_date.setDate(expiry_date.getDate()+days)
  } else {
    expiry_date.setDate(expiry_date.getDate()+days);
  }
  this.subscription_status = true
  this.subscription_expires_on = expiry_date
  this.save(function(err, subscriber){
    if (err) { console.error(this.telegram_id, err); }
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

subscriberSchema.methods.market_status = function(market) {
  return this.markets[market] ? "enabled" : "disabled"
}

subscriberSchema.methods.subscriptionDaysLeft = function() {
  if (this.subscription_status) {
    var date1 = new Date();
    var date2 = this.subscription_expires_on
    var timeDiff = Math.abs(date2.getTime() - date1.getTime());
    var diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return diffDays
  } else {
    return 0
  }
}

subscriberSchema.methods.isMod = function() {
  // adam or me
  return this.telegram_id == process.env.PERSONAL_CHANNEL || this.telegram_id == process.env.ADAM_CHANNEL
}

SubscriberModel = mongoose.model('subscribers', subscriberSchema)

module.exports = SubscriberModel;
