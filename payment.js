require('dotenv').config();
require('./protofunctions')
var bitcoin = require("bitcoinjs-lib");
var pushtx = require('blockchain.info/pushtx')
var request = require('request');

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/detektor');

const PROCESS_MAXIMUM_INPUTS = 60 // maximum addresses into one transaction
const CHECK_PAYMENTS_EVERY = 1 // hours

var paymentSchema = mongoose.Schema({
  telegram_id: Number,
  btc_address: String,
  private_key: String,
  completed_at: Date,
  amount: Number,
  paid_on_tx: String,
  status: {
    type: String,
    enum: ['pending', 'completed', 'error'],
  },
}, { timestamps: true });

paymentSchema.statics.pending = function(callback) {
  PaymentModel.find({status: 'pending'}, callback).limit(PROCESS_MAXIMUM_INPUTS)
}

paymentSchema.statics.process_payments = function() {
  // checks every pending payment
  PaymentModel.pending((err, payments) => {
    addresses = payments.map((payment) => { return payment.btc_address })

    request({
      method: 'POST', url: 'https://insight.bitpay.com/api/addrs/utxo', form: { addrs: addresses.join(",") }
    }, (error, response, body) => {
      if (error) {
        console.log(Date.now(), "ERROR FETCHING UNSPENT", error)
      } else {
        // now that we have the unspent outputs we can iterate and transfer from all
        unspent = JSON.parse(body)
        data = []
        payments.forEach((payment) => {
          utxos = unspent.filter((utxo) => { return utxo.address == payment.btc_address })
          if (utxos.length >= 1) {
            // get from first to last unspent and spend them until we have the entire payment.amount
            // if address does not has sufficient found mark as error and log
            // continue until we have all addresses as paid
            utxos.reverse()
            tx_amount = payment.amount
            txs = []
            utxos.forEach((utxo) => {
              if (tx_amount > 0) {
                tx_amount -= utxo.satoshis
                txs.push(utxo.txid)
              }
            })
            if (tx_amount <= 0) {
              data.push({payment: payment, txs: txs})
            }
          } else {
            console.log(Date.now(), "ERROR FETCHING UNSPENT FOR SPECIFIC ADDRESS", payment.btc_address)
            payment.status = 'error'
            payment.save()
          }
        })
        console.log("ready for payment:",data)
        PaymentModel.make_payment_transaction(data)
      }
    });
  })
  setTimeout(() => { PaymentModel.process_payments() }, CHECK_PAYMENTS_EVERY * 60 * 60 * 1000) // 1 hour, should probably be every 1 day
}

paymentSchema.statics.make_payment_transaction = function(tx_data) {
  var tx = new bitcoin.TransactionBuilder()
  // add inputs
  id = 0
  tx_data.forEach((data) => {
    data.txs.forEach((tx_id) => {
      console.log("adding tx_id", tx_id)
      tx.addInput(tx_id, id)
      id += 1
    })
  })
  // add output
  total_amount = tx_data.map((d) => { return d.payment.amount}).sum();
  console.log("adding output for ", total_amount)
  tx.addOutput(process.env.MAIN_BTC_ADDRESS, total_amount)

  // sign tx
  id = 0
  tx_data.forEach((data) => {
    pkey = data.payment.private_key
    keyPair = bitcoin.ECPair.fromWIF(pkey)
    data.txs.forEach((tx_id) => {
      tx.sign(id, keyPair)
      id += 1
    })
  })

  // push
  console.log("Pushing TX:", tx.build().toHex(), tx)


  // [ { payment: 
  //    { _id: 5987504a4415c025d875fbed,
  //      updatedAt: 2017-08-06T17:22:18.516Z,
  //      createdAt: 2017-08-06T17:22:18.516Z,
  //      telegram_id: 65954004,
  //      btc_address: '1LrHRgfMASyXkaZTBxVGLj4NrD8LKuRYHU',
  //      payment_address: 'KySCA6y6vsrHR8tkjZ8DqCcg57vnjJfSUY6hTwyxtidhCnoBqzHb',
  //      amount: 300000,
  //      status: 'pending',
  //      __v: 0 },
  //   txs: [ '15715ad91727810ce2673c909b163264049fc0c8bc4d15f3a4c28bc2bc3341de' ] },
  // { payment: 
  //    { _id: 598767c7d22ed13e6bdab05e,
  //      updatedAt: 2017-08-06T19:03:53.797Z,
  //      createdAt: 2017-08-06T19:02:31.821Z,
  //      btc_address: '142Hg7rV9fwzwUwMKQDCfCprrBdQtmqXt7',
  //      amount: 300000,
  //      status: 'pending',
  //      __v: 0 },
  //   txs: [ '89a15ead4280c6ed376191d42c020ade59358c11e90f11e7078e504a8768461e' ] } ]

}

PaymentModel = mongoose.model('payments', paymentSchema);

module.exports = PaymentModel;
