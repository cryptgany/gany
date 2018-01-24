require('dotenv').config();
require('./protofunctions')
var blockexplorer = require('blockchain.info/blockexplorer')
var Payment = require('./models/payment')

function Wallet(logger, gany_the_bot) {
  this.logger = logger
  this.options = { apiCode: process.env.BLOCKCHAIN_API_CODE }
  this.subscriber_list = [] // address list to check
  this.days_for_subscription_ending = 2 // days
  this.gany_the_bot = gany_the_bot
  this.minimal_btc_for_withdraw = 1000000
  this.subscription_price = {
    basic:    600000, // 0.006
    advanced: 3000000, // 0.03
    pro:      5000000, // 0.05
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
  setTimeout(() => { this.check_transactions() }, 10 * 60 * 1000)
  // first of all, check if users already have enough balance
  this.subscriber_list = this.subscriber_list.filter((sub) => {
    if (sub.total_balance() >= this.subscription_price[sub.subscription_type]) {
      sub.set_subscription_confirmed(this.subscription_price[sub.subscription_type])
      this.gany_the_bot.notify_user_got_confirmed(sub)
      return false
    } else { return true }
  })
  // should check every subscriber's address for balance
  // if person has balance >= 0.01 then sechedule address for withdrawal and mark as subscribed
  // This has to be done in 80 batches so blockexplorer doesn't complies
  count = 0
  this.subscriber_list.chunk(80).forEach((subs) => {
    setTimeout(() => {
      addresses_sub_type = {}
      subs.forEach((sub) => { addresses_sub_type[sub.btc_address] = {subscriber: sub, final_balance: sub.btc_final_balance} })
      blockexplorer.getBalance(Object.keys(addresses_sub_type), this.options).then((addr_data) => {
        Object.keys(addr_data).forEach((addr) => {
          final_balance = addr_data[addr].final_balance
          if (final_balance >= 0 && final_balance != addresses_sub_type[addr].final_balance) { // add balance to subscriber
            // subscriber paid money, schedule for withdrawing and next cycle will detect user subscription
            this.add_balance_to_subscriber_and_withdraw(addresses_sub_type[addr].subscriber, addr, final_balance)
          }
        })
      }).catch((e) => { this.logger.error("Error on check_transactions", e) })
    },count * 11 * 1000)
    count += 1
  })
}

Wallet.prototype.add_balance_to_subscriber_and_withdraw = function(subscriber, address, total) {
  // add user balance
  // ONLY process if amount from user + balance is enough for subscription
  subscriber.set_final_balance(total)
  if ((subscriber.total_balance()) >= this.subscription_price[subscriber.subscription_type]) {
    // subscriber.add_balance(total)

    subscriber.set_subscription_confirmed(this.subscription_price[subscriber.subscription_type])
    this.gany_the_bot.notify_user_got_confirmed(subscriber)
    this.schedule_for_withdrawal(subscriber.telegram_id, address, subscriber.btc_private_key, total)
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
