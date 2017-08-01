require('dotenv').config();
const Receive = require('blockchain.info/Receive')
const Wallet = require('./wallet')
const _ = require('underscore')

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/detektor');
var wallet = new Wallet()

receiver = new Receive(
  process.env.XPUB,
  process.env.BLOCKCHAIN_CALLBACK_URL,
  process.env.BLOCKCHAIN_API_CODE
)

var paymentSchema = mongoose.Schema({
  telegram_id: Number,
  btc_address: String,
  payment_address: String,
  status: {
    type: String,
    enum: ['pending', 'completed', 'expired'],
  },
  expires_at: Date
}, { timestamps: true });

paymentSchema.statics.available_account = function() {
  return _.find(wallet.accounts, async (account) => {
    Payment.count({btc_address: account.receiveAddress, status: 'pending'}, (err, c) => {
      return c < 20;
    })
  })
  // if we are here, no accounts available
  // return wallet.createAccount()
  // to fix in the future, meanwhile we rely on many accounts
}

paymentSchema.statics.payment_address = function(subscriber_id) {
  account = Payment.available_account()
  if (account) {
    btc_address = account.receiveAddress
    xpub = account.extendedPublicKey
  } else {
    // tell user that his payment can't be processed right now, try later
  }
}

paymentSchema.statics.generate_payment = function(subscriber_id) {

}

Payment = mongoose.model('payments', paymentSchema);

module.exports = Payment;
