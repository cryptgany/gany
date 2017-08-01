require('dotenv').config();
const MyWallet = require('blockchain.info/MyWallet')

// For each wallet, we can have 20 simultaneous payments
// If we get past those 20 payments, we need to generate another wallet for the new payment address
// When a payment is completed, "close" the address (remove from recognized addresses)
// Keep  track of: payments, wallets and generated payment addresses
// payment: subscriber_id, wallet (main), payment_address, amount, date
// wallet: address, xpub

function Wallet() {
  this.options = { apiCode: process.env.BLOCKCHAIN_API_CODE, apiHost: 'http://localhost:3000' }
  this.wallet = new MyWallet(process.env.WALLET_UID, process.env.WALLET_PASSWD, this.options)
  this.accounts = []
  this.refresh()
}

Wallet.prototype.refresh = function() {
  return this._accounts().then((data) => { this.accounts = data; })
}

Wallet.prototype.create_account = function(label = 'main') {
  this.wallet.createAccount({label: label}).then(
    (data) => { this.refresh(); }
  )
}

Wallet.prototype._accounts = function() { return this.wallet.listAccounts() }

module.exports = Wallet;

// accounts
// extendedPublicKey: 'XPUB FOR CREATING PAYMENT ADDRESSES'

// create account
// { archived: false,
//   xpriv: '...',
//   xpub: 'XPUB FOR CREATING PAYMENT ADDRESSES',
//   address_labels: [],
//   cache: 
//    { receiveAccount: '...',
//      changeAccount: '...' } }
