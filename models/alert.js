// This is a very basic alert system
// We can grow from this later
require('dotenv').config();
var mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/detektor');

const MAX_ALERTS_PER_CHAT_ID = 10 // alerts will display on call channel, rather than user id

var alertSchema = mongoose.Schema({
		telegram_id: Number,
		exchange: String,
		market: String,
		price_start: Number, // price of X when creating alert
		price_target: Number, // alert if price gets to this point
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
module.exports.MAX_ALERTS_PER_CHAT_ID = MAX_ALERTS_PER_CHAT_ID