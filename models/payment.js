require('dotenv').config();

var mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/detektor');

var paymentSchema = mongoose.Schema({
	telegram_id: Number,
	btc_address: String,
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

paymentSchema.statics.newPayment = function(symbol, user_id) { // start payment processing for User X on XLM/BTC/NEO/etc

}

PaymentModel = mongoose.model('payments', paymentSchema);

module.exports = PaymentModel;
