const Subscriber = require('./src/models/subscriber')
const markets = ['BTC', 'ETH', 'NEO', 'DOGE', 'ETC', 'LTC', 'USDT', 'TUSD', 'USD', 'GBP', 'EUR', 'XLM'];

function hasAnyOff(sub) {
	let hasAny = false
	markets.forEach((market) => {
		if (sub.markets[market] == false)
			hasAny = true
	})
	return hasAny
}

Subscriber.find({}, function(err, subscribers) {
	if (err) throw err;
	subscribers.forEach((sub) => {
		if (hasAnyOff(sub)) {
			this.markets[market] = decision
			this.save(function (err, subscriber) {
				if (err) return console.error(err);
			});
		}
	})
});
