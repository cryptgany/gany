const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const { verify } = require('coinpayments-ipn');
const CoinpaymentsIPNError = require('coinpayments-ipn/lib/error');

const { MERCHANT_ID, COINPAYMENTS_IPN_SECRET, COINPAYMENTS_IPN_SERVER_ENDPOINT } = process.env;

const COINPAYMENTS_IPN_SERVER_PORT = process.env.PORT || process.env.COINPAYMENTS_IPN_SERVER_PORT || 3123

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const router = express.Router();

router.get('/', function (req, res, next) {
	return res.end('IPN Online');
});

let IPNServer = {}


router.post(('/' + COINPAYMENTS_IPN_SERVER_ENDPOINT), function (req, res, next) {
	if (false && process.env.ENVIRONMENT == 'production') {
		if(!req.get('HMAC') || !req.body || !req.body.ipn_mode || req.body.ipn_mode !== 'hmac' || MERCHANT_ID !== req.body.merchant) {
			return next(new Error('Invalid request'));
		}

		let isValid, error;

		try {
			isValid = verify(req.get('HMAC'), COINPAYMENTS_IPN_SECRET, req.body);
		} catch (e) {
			error = e;
		}

		if (error && error instanceof CoinpaymentsIPNError) {
			return next(error);
		}

		if (!isValid) {
			return next(new Error('Hmac calculation does not match'));
		}
	}

	return next();
}, function (req, res, next) {
	IPNServer.notify(req, res, next)
	return next();
});

app.use(router);

app.use(function (err, req, res, next) {
	console.log("Error handler", err);
	res.end("Error");
});

IPNServer.app = app;

IPNServer.start = function () {
	app.listen(COINPAYMENTS_IPN_SERVER_PORT, function () {
		console.log(`IPN listening on port ${COINPAYMENTS_IPN_SERVER_PORT}`)
	});
}

module.exports = IPNServer;