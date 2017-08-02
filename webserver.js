require('dotenv').config();
var express = require('express');
var app = express();

app.get('/eroigregjdlkgjoeri3', function(req, res) {
  confirmations = req.query['confirmations']
  console.log('[', Date(), "] query!", req.query)
  // req.query['invoice_id']
  // req.query['transaction_hash']
  // req.query['value']
  // req.query['test']

  if (req.query['test']) {
    res.send("")
  } else {
    if (confirmations >= 6) {
      res.send('*ok*')
      // do something on db
    } else {
      // wait
    }
  }

});

app.listen(process.env.BLOCKCHAIN_SERVER_PORT, function () {
  console.log('Example app listening on port',process.env.BLOCKCHAIN_SERVER_PORT);
});
