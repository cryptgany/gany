require('dotenv').config();
const Subscriber = require('./subscriber');
var blockexplorer = require('blockchain.info/blockexplorer')

function Wallet() {
  this.options = { apiCode: process.env.BLOCKCHAIN_API_CODE }
  this.subscriber_list = [] // address list to check
  this.days_for_subscription_ending = 2 // days
  this.refresh()
  this.check_transactions()
}

Wallet.prototype.refresh = function() { // update list of accounts to check
  // list should be: subscribers with btc address and subscription close to ending (in days)
  Subscriber.unpaid_or_almost_expired(this.days_for_subscription_ending,
    (err, subs) => { if(err) { console.log(err) } else { this.subscriber_list = subs }}
  );
  setTimeout(() => { this.refresh() }, 1 * 60 * 1000)
}

Wallet.prototype.check_transactions = function() {
  // should check every subscriber's address for balance
  // if person has balance >= 0.01 then sechedule address for withdrawal and mark as subscribed
  blockexplorer.getBalance(this.subscriber_list.map((sub) => { return sub.btc_address }), this.options).then((addr_data) => {
    Object.keys(addr_data).forEach((addr) => {
      if (addr_data[addr].final_balance >= 10000) { // should be 1000000
        // detected address with enough money, mark subscriber as subscribed and schedule for withdrawal
        this.mark_subscriber_paid_and_withdraw(addr)
      }
    })
  }).catch((e) => { console.log("Error on check_transactions", Date.now(), e) })
  setTimeout(() => { this.check_transactions() }, 5 * 60 * 1000)
}

Wallet.prototype.mark_subscriber_paid_and_withdraw = function(address) {
  subscriber = this.subscriber_list.filter((sub) => { console.log("comparing", sub.btc_address); return sub.btc_address == address })[0]
  if (subscriber) {
    // alert subscriber that we got his payment and until when he/she is subcribed
    subscriber.set_subscription_confirmed()
    this.schedule_for_withdrawal(subscriber.telegram_id, address, subscriber.btc_private_key, 1000000)
  }
}

Wallet.prototype.schedule_for_withdrawal = function(subscriber_id, address, pkey, amount) {
  console.log("scheduling for withdraw:", subscriber_id, address, pkey, amount)
  // will store the addresses for withdrawing money
  // will run a procedure every X minutes to withdraw money from many accounts at the same time
}



module.exports = Wallet;

// accounts
// extendedPublicKey: 'XPUB FOR CREATING PAYMENT ADDRESSES'

// create account
// { archived: false,
//   xpriv: '...',
//   xpub: 'XPUB FOR CREATING PAYMENT ADDRESSES',
//   address_labels: [],
//   cache: 
//    { receiveAccount: '...',
//      changeAccount: '...' } }
