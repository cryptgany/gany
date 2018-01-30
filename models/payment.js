require('dotenv').config();
require('../protofunctions')
var bitcoin = require("bitcoinjs-lib");
var pushtx = require('blockchain.info/pushtx')
var request = require('request');

var mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/detektor');

const PROCESS_MAXIMUM_INPUTS = 60 // maximum addresses into one transaction
const CHECK_PAYMENTS_EVERY = 1 // hours
const SATS_FEE_PER_BYTE = 25 // in satoshis
const MIN_PAYMENTS_TO_PROCESS = 5 // minimum pending payments to start a transaction
const MIN_CONFIRMATIONS_TO_PROCESS = 3 // tx confirmations

var paymentSchema = mongoose.Schema({
  telegram_id: Number,
  btc_address: String,
  private_key: String,
  completed_at: Date,
  amount: Number,
  real_amount: Number,
  paid_on_tx: String,
  status: {
    type: String,
    enum: ['pending', 'completed', 'error'],
  },
  error: String,
}, { timestamps: true });

paymentSchema.statics.pending = function(callback) {
  PaymentModel.find({status: 'pending'}, callback).limit(PROCESS_MAXIMUM_INPUTS)
}

paymentSchema.statics.process_payments = function() {
  console.log("running process_payments...")
  setTimeout(() => { PaymentModel.process_payments() }, CHECK_PAYMENTS_EVERY * 60 * 60 * 1000) // 1 hour, should probably be every 1 day
  // checks every pending payment
  PaymentModel.pending((err, payments) => {
    if (payments.length >= MIN_PAYMENTS_TO_PROCESS) {
      addresses = payments.map((payment) => { return payment.btc_address })

      request({
        method: 'POST', url: 'https://insight.bitpay.com/api/addrs/utxo', form: { addrs: addresses.join(",") }
      }, (error, response, body) => {
        if (error) {
          console.error(Date.now(), "ERROR FETCHING UNSPENT", error)
        } else {
          // now that we have the unspent outputs we can iterate and transfer from all
          unspent = JSON.parse(body)
          data = []
          payments.forEach((payment) => {
            utxos = unspent.filter((utxo) => { return utxo.address == payment.btc_address && utxo.confirmations >= MIN_CONFIRMATIONS_TO_PROCESS })
            if (utxos.length >= 1) {
              // get from first to last unspent and spend them until we have the entire payment.amount
              // if address does not has sufficient found mark as error and log
              // continue until we have all addresses as paid
              utxos.reverse()
              tx_amount = payment.amount
              txs = []
              total = 0
              utxos.forEach((utxo) => {
                if (tx_amount > 0) {
                  tx_amount -= utxo.satoshis
                  total += utxo.satoshis
                  txs.push([utxo.txid, utxo.vout])
                }
              })
              if (tx_amount <= 0) {
                data.push({payment: payment, txs: txs, total: total})
              }
            } else {
              // this is not really an error, we are waiting on confirmations
              // TODO implement some kind of "wait 48 hours or mark error"
              // console.error(Date.now(), "ERROR FETCHING UNSPENT FOR SPECIFIC ADDRESS", payment.btc_address)
              // payment.status = 'error'
              // payment.error = 'Utxos length was 0'
              // payment.save()
            }
          })
          if (data.length >= 1) {
            console.log("ready for payment:",data)
            PaymentModel.make_payment_transaction(data)
          }
        }
      });
    }
  })
}

paymentSchema.statics.make_payment_transaction = function(tx_data) {
  try {
    var tx = new bitcoin.TransactionBuilder()
    input_txs = 0
    // add inputs
    tx_data.forEach((data) => {
      data.txs.forEach((tx_data) => {
        tx_id = tx_data[0]; tx_vout = tx_data[1]
        console.log("adding tx_id", tx_id, "as id", tx_vout)
        tx.addInput(tx_id, tx_vout)
        input_txs += 1
      })
    })
    // calculate fees
    tx_bytes = (input_txs * 181) + 34 + 10
    tx_fee = tx_bytes * SATS_FEE_PER_BYTE // minimum fee
    // inputs * 181 + outs * 34 + 10

    // add output
    total_amount = tx_data.map((d) => { return d.total }).sum();
    console.log("adding output for ", total_amount, "minus fee of", tx_fee)
    tx.addOutput(process.env.MAIN_BTC_ADDRESS, total_amount - tx_fee)

    // sign tx
    id = 0
    tx_data.forEach((data) => {
      pkey = data.payment.private_key
      keyPair = bitcoin.ECPair.fromWIF(pkey)
      data.txs.forEach((tx_data) => {
        console.log("singing id", tx_data[0], "as id", id)
        tx.sign(id, keyPair)
        id += 1
      })
    })

    // push
    console.log("Pushing TX:", total_amount, tx_fee, tx.build().toHex())

    pushtx.pushtx(tx.build().toHex(), { apiCode: process.env.BLOCKCHAIN_API_CODE }).then((res) => {
      console.log("RESULT IS", res)
      tx_data.forEach((data) => {
        payment = data.payment
        payment.completed_at = Date.now()
        payment.real_amount = data.total
        payment.status = 'completed'
        payment.save()
      })
    })
  } catch(e) {
    console.error('Error on payment creation!', e)
    // we should also send an email notification here
  }
}

PaymentModel = mongoose.model('payments', paymentSchema);

module.exports = PaymentModel;
