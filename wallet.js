require('dotenv').config();
var blockexplorer = require('blockchain.info/blockexplorer')
var Payment = require('./models/payment')

function Wallet(gany_the_bot) {
  this.options = { apiCode: process.env.BLOCKCHAIN_API_CODE }
  this.subscriber_list = [] // address list to check
  this.days_for_subscription_ending = 2 // days
  this.gany_the_bot = gany_the_bot
  this.subscription_price = {
    basic: 300000, // now 0.003, should be 1000000
    advanced: 3000000, // 0.03
    pro: 5000000, // 0.05
  }
}

Wallet.prototype.track_subscriptions = function() {
  this.refresh()
  setTimeout(() => { this.check_transactions() }, 15*1000) // so they never run at the same time
}

Wallet.prototype.refresh = function() { // update list of accounts to check
  // list should be: subscribers with btc address and subscription close to ending (in days)
  date = new Date();
  date.setDate(date.getDate()+this.days_for_subscription_ending);
  this.subscriber_list = this.gany_the_bot.subscribers.filter((subscriber) => {
    return subscriber.btc_address && (subscriber.subscription_status == false || subscriber.subscription_expires_on < date)
  })
  setTimeout(() => { this.refresh() }, 1 * 60 * 1000)
}

Wallet.prototype.check_transactions = function() {
  // should check every subscriber's address for balance
  // if person has balance >= 0.01 then sechedule address for withdrawal and mark as subscribed
  addresses_sub_type = {}
  this.subscriber_list.forEach((sub) => { addresses_sub_type[sub.btc_address] = sub.subscription_type })
  blockexplorer.getBalance(Object.keys(addresses_sub_type), this.options).then((addr_data) => {
    Object.keys(addr_data).forEach((addr) => {
      if (addr_data[addr].final_balance >= this.subscription_price[addresses_sub_type[addr]]) { // now 0.003, should be 1000000
        // detected address with enough money, mark subscriber as subscribed and schedule for withdrawal
        this.mark_subscriber_paid_and_withdraw(addr, this.subscription_price[addresses_sub_type[addr]])
      }
    })
  }).catch((e) => { console.log("Error on check_transactions", Date.now(), e) })
  setTimeout(() => { this.check_transactions() }, 5 * 60 * 1000)
}

Wallet.prototype.mark_subscriber_paid_and_withdraw = function(address, price) {
  subscriber = this.subscriber_list.filter((sub) => { return sub.btc_address == address })[0]
  if (subscriber) {
    // alert subscriber that we got his payment and until when he/she is subcribed
    subscriber.set_subscription_confirmed()
    this.gany_the_bot.notify_user_got_confirmed(subscriber)

    this.schedule_for_withdrawal(subscriber.telegram_id, address, subscriber.btc_private_key, price)
  }
}

Wallet.prototype.schedule_for_withdrawal = function(subscriber_id, address, pkey, amount) {
  Payment.create({
    telegram_id: subscriber_id,
    btc_address: address,
    private_key: pkey,
    amount: amount,
    status: "pending"
  })
  // will store the addresses for withdrawing money
  // will run a procedure every X minutes to withdraw money from many accounts at the same time
}

module.exports = Wallet;
