// This is a very basic alert system
// We can grow from this later
require('dotenv').config();
var mongoose = require('mongoose');

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

alertSchema.methods.trigger = function(price) {
	if (this.price_start > this.price_target) { // downtrend, price was 100, alert was on 80 for example
		return price <= this.price_start && price <= this.price_target
	} else { // uptrend, price was 100, alert was on 120 for example
		return price >= this.price_start && price >= this.price_target
	}
}

alertSchema.methods.triggerAndDeactivate = function() {
	this.status = 'finished';
	this.time_of_detection = new Date()
	this.save()
}

AlertModel = mongoose.model('alerts', alertSchema);

module.exports = AlertModel;
module.exports.MAX_ALERTS_PER_CHAT_ID = MAX_ALERTS_PER_CHAT_ID