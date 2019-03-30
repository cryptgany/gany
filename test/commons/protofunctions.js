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
});