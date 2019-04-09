const Detektor = require('../../detektor.js')
var assert = require('assert');

describe('Detektor functions', function() {
	it('refreshAlertsTree() sets up a tree with all alerts created', function(done) {
		// let detektor = new Detektor()
		assert.equal(alert.trigger(130), true)
		assert.equal(alert.trigger(120.000001), true)
		assert.equal(alert.trigger(120), true)
		assert.equal(alert.trigger(119.9999), false)
		assert.equal(alert.trigger(90), false)
		done();
	});

	it('trigger(price) returns true when price is going down and alert is down', function(done) {
		// let alert = new Alert({price_start: 100, price_target: 80})
		assert.equal(alert.trigger(79), true)
		assert.equal(alert.trigger(79.9999), true)
		assert.equal(alert.trigger(80), true)
		assert.equal(alert.trigger(80.01), false)
		assert.equal(alert.trigger(120), false)
		assert.equal(alert.trigger(85), false)
		done();
	});
});
