require('dotenv').config();

const Coinpayments = require("coinpayments");
const client = new Coinpayments({key: process.env.COINPAYMENTS_KEY, secret: process.env.COINPAYMENTS_SECRET});

const COINPAYMENTS_POST_URL = process.env.COINPAYMENTS_POST_URL || 'http://localhost/payme'

var mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/detektor');

var paymentSchema = mongoose.Schema({
	telegram_id: Number,
	btc_address: String,
  address: String,
	private_key: String,
	symbol: String, // btc / xlm / ganytoken / etc (for future usage)
	completed_at: Date,
	amount: Number,
	real_amount: Number,
	paid_on_tx: String,
	status: {
		type: String,
		enum: ['pending', 'completed', 'error'],
},
	error: String,
}, { timestamps: true });

paymentSchema.statics.pending = function(callback) {
	PaymentModel.find({status: 'pending'}, callback).limit(PROCESS_MAXIMUM_INPUTS)
}

paymentSchema.statics.getPaymentAddress = function(symbol, amount, user_id) {
  // start payment processing for User X on XLM/BTC/NEO/etc
  // Creates an internal payment model while also starting a callback payment (IPN) on coinpayments
  // When payment is received on coinpayments, we should receive a POST to whatever we send as "ipn_url"
  // https://www.npmjs.com/package/coinpayments#get-callback-address
  return new Promise((resolve, reject) => {
    client.getCallbackAddress({currency: symbol, ipn_url: COINPAYMENTS_POST_URL}).then((address)=> {
      let pmt = new this({telegram_id: user_id, address: address, symbol: symbol, amount: amount})
      pmt.save((err) => {
        if (err) { reject(err) } else { resolve(address); }
      })
    }).catch(reject);
  });
}

PaymentModel = mongoose.model('payments', paymentSchema);

module.exports = PaymentModel;
