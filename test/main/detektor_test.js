const dbURI = 'mongodb://localhost:27017/detektor-test'
const Detektor = require('../../detektor.js')
const chai = require("chai");
const expect = chai.expect;
const sinon = require("sinon");
const Alert = require('../../models/alert')
const clearDB = require('mocha-mongoose')(dbURI);
mongoose = require('mongoose')

function createAlert(tg_id, priceStart, priceTarget, exchange, market, status) {
	return new Promise((resolve, reject) => {
		let alert = new Alert({
			telegram_id: tg_id,
			price_start: priceStart,
			price_target: priceTarget,
			exchange: exchange,
			market: market,
			status: status
		})

		alert.save((err) => {
			if (err) {
				reject(err)
			} else {
				resolve(alert)
			}
		})
	})
}

describe('Detektor functions', function() {
	beforeEach(function(done) {
		if (mongoose.connection.db) return done();
		mongoose.connect(dbURI, done);
	});
	it('checkAlertsFor() triggers the right alerts if they are in the ranges defined', async () => {
		let alert1 = await createAlert(123, 10, 20, 'Binance', 'NEO-BTC', 'active')
		let alert2 = await createAlert(123, 30, 25, 'Binance', 'NEO-BTC', 'active')
		let eventM = {on: sinon.spy()}
		alert1.triggerAndDeactivate = sinon.spy()
		alert2.triggerAndDeactivate = sinon.spy()
		let detektor = new Detektor({}, {}, eventM)
		detektor.addAlertToTree(alert1)
		detektor.addAlertToTree(alert2)
		detektor.checkAlertsFor('Binance', 'NEO-BTC', 9)
		expect(alert1.triggerAndDeactivate.calledOnce).to.be.false;
		expect(alert2.triggerAndDeactivate.calledOnce).to.be.true; // 30 => 9
		detektor.checkAlertsFor('Binance', 'NEO-BTC', 12)
		expect(alert1.triggerAndDeactivate.calledOnce).to.be.false;
		expect(alert2.triggerAndDeactivate.calledOnce).to.be.false;
		detektor.checkAlertsFor('Binance', 'NEO-BTC', 25)
		expect(alert1.triggerAndDeactivate.calledOnce).to.be.true;
		expect(alert2.triggerAndDeactivate.calledOnce).to.be.false;
	});
});
