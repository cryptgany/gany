require('dotenv').config();

const Logger = require('../logger');
const Subscriber = require('./subscriber');

const util = require('util');
const IPNServer = require('../ipn-server.js')

const Coinpayments = require("coinpayments");
const client = new Coinpayments({key: process.env.COINPAYMENTS_KEY, secret: process.env.COINPAYMENTS_SECRET});

const { COINPAYMENTS_POST_URL } = process.env;

var mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/detektor');

let logger = new Logger();

var paymentSchema = mongoose.Schema({
	telegram_id: Number,
	btc_address: String, // old payments system
	address: String, // coinpayments given address
	private_key: String,
	symbol: String, // btc / xlm / ganytoken / etc (for future usage)
	completed_at: Date,
	amount: Number,
	real_amount: Number,
	paid_on_tx: String,
	status: {
		type: String,
		enum: ['pending', 'completed', 'error'],
		default: 'pending'
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
	console.log("Generating IPN for", COINPAYMENTS_POST_URL)
	return new Promise((resolve, reject) => {
		client.getCallbackAddress({currency: symbol, ipn_url: COINPAYMENTS_POST_URL}).then((data)=> {
			let pmt = new this({telegram_id: user_id, address: data.address, symbol: symbol, amount: amount, status: 'pending'})
			pmt.save((err) => {
				if (err) { reject(err) } else { resolve(data.address); }
			})
		}).catch(reject);
	});
}

paymentSchema.statics.setupIPNServer = function() {
	// Receives POST request with payment updates
	// more info: https://www.coinpayments.net/merchant-tools-ipn
	IPNServer.notify = function(req, res, next) {
		let address = req.body.address
		let status = req.body.status
		let amount = parseFloat(req.body.amount)
		logger.log("Received IPN for address:", address, "amount:", amount, "status:", status)
		console.log("parseInt(status) is", parseInt(status))

		if (parseInt(status) >= 100 || status == '2') {
			logger.log("Processing it, as it's completed")

			// example of what comes from notify
			// address: 'QSKAjhEst5rwyEfYYEVYxxyYy8XNjHknTz',
			// amount: '1.00000000',
			// confirms: '0',
			// currency: 'LTCT',
			// fee: '0.00500000',
			// fiat_amount: '3614.45071764',
			// fiat_coin: 'USD',
			// fiat_fee: '18.07225359',
			// status: '100',
			// status_text: 'Deposit confirmed',
			// txn_id: '3e0997db7f978ae828b6ed8925979113263ac07de7e72d3e56465ef80512e93e'

			PaymentModel.findOne({address: address}, (err, pmt) => {
				if (pmt.status == 'pending') {
					logger.log("Updating payment for address", address)
					pmt.status = 'completed'
					pmt.paid_on_tx = req.body.txn_id
					pmt.real_amount = amount
					pmt.save()
					logger.log("Marking user as paid")
					// Approach here so we dont rely on class including/mixing:
					// We will check payments on this class and when it's done
					// mark the user as a paid subscriber, then on gany we have a
					// loop that finds users who have to 'notify_user_paid'
					// users with that field on true will be notified that
					// their payment was received and that they are now a paid sub
					Subscriber.findOne({telegram_id: pmt.telegram_id}, (err, sub) => {
						sub.notify_user_paid = true
						sub.add_subscription_time(30)
						sub.save();
						logger.log("User", sub.telegram_id, "got 30 days as a paid member")
					})
				} else { logger.log("payment was already completed") }
			})

		}

		res.send('received');
	}
	IPNServer.start()
}

PaymentModel = mongoose.model('payments', paymentSchema);

module.exports = PaymentModel;
