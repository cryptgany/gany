require('dotenv').config();

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/detektor');

var paymentSchema = mongoose.Schema({
  telegram_id: Number,
  btc_address: String,
  payment_address: String,
  completed_at: Date,
  amount: Number,
  status: {
    type: String,
    enum: ['pending', 'completed'],
  },
}, { timestamps: true });

PaymentModel = mongoose.model('payments', paymentSchema);

module.exports = PaymentModel;
