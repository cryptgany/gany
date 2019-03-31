// This is a very basic alert system
// We can grow from this later
const Subscriber = require('./subscriber');

require('dotenv').config();
var mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/detektor');

var alertSchema = mongoose.Schema({
		telegram_id: Number,
		exchange: String,
		market: String,
		price: Number, // alert if price gets to this point
		time_of_detection: Date,
		subscriber: { type: mongoose.Schema.Types.ObjectId, ref: 'subscribers' },
		status: {
			type: String,
			enum: ['active', 'finished'],
			default: 'active'
		},
}, { timestamps: true });

AlertModel = mongoose.model('alerts', alertSchema);

module.exports = AlertModel;
