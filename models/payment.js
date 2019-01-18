require('dotenv').config();

const Coinpayments = require("coinpayments");
const client = new Coinpayments({key: process.env.COINPAYMENTS_KEY, secret: process.env.COINPAYMENTS_SECRET});
const express = require('express');
const app = express();

const COINPAYMENTS_HOST_URL = process.env.COINPAYMENTS_HOST_URL || 'http://localhost'
const COINPAYMENTS_IPN_SERVER_PORT = process.env.PORT || 3000
const COINPAYMENTS_IPN_SERVER_ENDPOINT = process.env.COINPAYMENTS_IPN_SERVER_ENDPOINT || "payme"
const COINPAYMENTS_POST_URL = COINPAYMENTS_HOST_URL + "/" + COINPAYMENTS_IPN_SERVER_ENDPOINT


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
		client.getCallbackAddress({currency: symbol, ipn_url: COINPAYMENTS_POST_URL}).then((data)=> {
			let pmt = new this({telegram_id: user_id, address: data.address, symbol: symbol, amount: amount})
			pmt.save((err) => {
				if (err) { reject(err) } else { resolve(data.address); }
			})
		}).catch(reject);
	});
}

paymentSchema.statics.setupIPNServer = function() {
	// Receives POST request with payment updates
	// more info: https://www.coinpayments.net/merchant-tools-ipn
	app.post(('/' + COINPAYMENTS_IPN_SERVER_ENDPOINT), (req, res) => {
		console.log("received!")
		console.log("Headers: ", req.headers)
		console.log("Query: ", req.query)
		console.log("Path: ", req.path)
		console.log("baseUrl: ", req.baseUrl)
		console.log("body: ", req.body)
		console.log("params: ", req.params)
		console.log("originalUrl: ", req.originalUrl)
		console.log("ip: ", req.ip)
		res.send('An alligator approaches!');
	});

	app.get("/", (req, res) => { res.send("IM Alive!")})

	app.listen(COINPAYMENTS_IPN_SERVER_PORT, () => { console.log('IPN server listening on port ', COINPAYMENTS_IPN_SERVER_PORT) });
}

PaymentModel = mongoose.model('payments', paymentSchema);

module.exports = PaymentModel;
