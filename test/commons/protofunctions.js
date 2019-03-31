require('../../protofunctions')
var assert = require('assert');

describe('Common shared functions', function() {
	it('smartTimeConvert converts seconds to minutes as expected', function(done) {
		assert.equal(smartTimeConvert(300), "5 minutes");
		assert.equal(smartTimeConvert(720), "12 minutes");
		assert.equal(smartTimeConvert(60), "1 minute");
		assert.equal(smartTimeConvert(30), "30 seconds");
		done();
	});

	it('smartTimeConvert converts seconds to hours as expected', function(done) {
		assert.equal(smartTimeConvert(60 * 60 * 5), "5 hours");
		assert.equal(smartTimeConvert(60 * 60 * 7), "7 hours");
		assert.equal(smartTimeConvert(60 * 60), "1 hour");
		done();
	});

	it ('convertUserTimeToMinutes converts user input time into the right minutes', function(done) {
		assert.equal(convertUserTimeToMinutes("30"), 30);
		assert.equal(convertUserTimeToMinutes("360"), 360);
		assert.equal(convertUserTimeToMinutes("1H"), 60);
		assert.equal(convertUserTimeToMinutes("10H"), 600);
		done();
	});

	it ('extractMinBtc understands user input-min btc value filter', function(done) {
		assert.equal(extractMinBtc("/VOLCHANGE BINANCE 1 5 10BTC"), 10);
		assert.equal(extractMinBtc("/VOLCHANGE BINANCE 1 5"), undefined);
		assert.equal(extractMinBtc("/VOLCHANGE BINANCE 1 5 0.5BTC"), 0.5);
		assert.equal(extractMinBtc("/VOLCHANGE BINANCE 1BTC"), 1);
		assert.equal(extractMinBtc("/VOLCHANGE BINANCE BTC"), undefined);
		done();
	});
});