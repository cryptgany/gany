require('dotenv').config();

// TODO: Refactor me in an specific "payment gateways" folder/logic
const BitcoinGateway = require('bitcoin-receive-payments');
const gateway = new BitcoinGateway(process.env.BTC_WALLET_XPUB, undefined);

module.exports = {
	createAddress: function(userId) { return gateway.createAddress(userId) }
}
