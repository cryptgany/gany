require('../../config')
const Detektor = require('../../detektor.js')
const chai = require("chai");
const expect = chai.expect;
const sinon = require("sinon");
const Alert = require('../../models/alert')

function createAlert(tg_id, priceStart, priceTarget, exchange, market, status) {
	return new Alert({
		telegram_id: tg_id,
		price_start: priceStart,
		price_target: priceTarget,
		exchange: exchange,
		market: market,
		status: status
	})
}

describe('Detektor functions', function() {
	it('refreshAlertsTree() sets up a tree with all alerts created', function(done) {
		let eventM = {on: sinon.spy()}
		let detektor = new Detektor({}, {}, eventM)
		console.log("ENV IS", process.env.ENVIRONMENT, process.env.NODE_ENV)
		expect(eventM.on.calledOnce).to.be.true;
		done();
	});
});
