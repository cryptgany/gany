const UserInputAnalyzer = require('../../user_input_analyzer')
var assert = require('assert');

describe('User Input Analyzer', function() {
	it ('understands the right values user meant for /VOLCHANGE BINANCE ETH 1 5 10BTC', function(done) {
		uia = new UserInputAnalyzer("/VOLCHANGE BINANCE ETH 1 5 10BTC")
		assert.equal(uia.exchange, 'BINANCE');
		assert.equal(uia.market, 'ETH');
		assert.equal(uia.time, 1);
		assert.equal(uia.limit, 5);
		assert.equal(uia.minVol, 10);
		done();
	});

	it ('understands the right values user meant for /VOLCHANGE IDEX 1 5 10BTC', function(done) {
		uia = new UserInputAnalyzer("/VOLCHANGE IDEX 1 5 10BTC")
		assert.equal(uia.exchange, 'IDEX');
		assert.equal(uia.market, undefined);
		assert.equal(uia.time, 1);
		assert.equal(uia.limit, 5);
		assert.equal(uia.minVol, 10);
		done();
	});

	it ('understands the right values user meant for /VOLCHANGE bittrex neo 5 100BTC', function(done) {
		uia = new UserInputAnalyzer("/VOLCHANGE bittrex neo 5 100BTC")
		assert.equal(uia.exchange, 'BITTREX');
		assert.equal(uia.market, 'NEO');
		assert.equal(uia.time, 5);
		assert.equal(uia.limit, undefined);
		assert.equal(uia.minVol, 100);
		done();
	});

	it ('understands the right values user meant for /VOLCHANGE coinexchange 24h 1BTC', function(done) {
		uia = new UserInputAnalyzer("/VOLCHANGE coinexchange 24h 1BTC")
		assert.equal(uia.exchange, 'COINEXCHANGE');
		assert.equal(uia.market, undefined);
		assert.equal(uia.time, 24*60);
		assert.equal(uia.limit, undefined);
		assert.equal(uia.minVol, 1);
		done();
	});

	it ('understands the right values user meant for /VOLCHANGE bitfinex usdt 6h 500BTC', function(done) {
		uia = new UserInputAnalyzer("/VOLCHANGE bitfinex usdt 6h 500BTC")
		assert.equal(uia.exchange, 'BITFINEX');
		assert.equal(uia.market, 'USDT');
		assert.equal(uia.time, 60*6);
		assert.equal(uia.limit, undefined);
		assert.equal(uia.minVol, 500);
		done();
	});

	it ('understands the right values user meant for /VOLCHANGE BINANCE 50', function(done) {
		uia = new UserInputAnalyzer("/VOLCHANGE BINANCE 50")
		assert.equal(uia.exchange, 'BINANCE');
		assert.equal(uia.market, undefined);
		assert.equal(uia.time, 50);
		assert.equal(uia.limit, undefined);
		assert.equal(uia.minVol, undefined);
		done();
	});

	it ('understands the right values user meant for /VOLCHANGE 6h', function(done) {
		uia = new UserInputAnalyzer("/VOLCHANGE 6h")
		assert.equal(uia.exchange, undefined);
		assert.equal(uia.market, undefined);
		assert.equal(uia.time, 6*60);
		assert.equal(uia.limit, undefined);
		assert.equal(uia.minVol, undefined);
		done();
	});

	it ('understands the right values user meant for /see btc-usdt 30', function(done) {
		uia = new UserInputAnalyzer("/see btc-usdt 30")
		assert.equal(uia.exchange, undefined);
		assert.equal(uia.market, 'BTC-USDT');
		assert.equal(uia.time, 30);
		assert.equal(uia.limit, undefined);
		assert.equal(uia.minVol, undefined);
		done();
	});
});
