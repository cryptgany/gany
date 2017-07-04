require('dotenv').config();
var bittrex = require('node.bittrex.api');
var datetime = require('node-datetime');
require('./protofunctions.js');


bittrex.options({
  'apikey' : process.env.KEY,
  'apisecret' : process.env.SECRET, 
  'stream' : false, // will be removed from future versions 
  'verbose' : true,
  'cleartext' : false 
});

Klient = {
  balance: function(currency = 'BTC') {
    bittrex.getbalance({ currency : currency }, function( data ) {
      console.log( currency + ": " + data.result.Available );
    });
  },
  getOrder: function(orderId) {
    bittrex.getorder({ uuid : orderId }, function( data ) {
      console.log( data );
    });
  },
  buyOrder: function(market, quantity, rate) {
    var url = 'https://bittrex.com/api/v1.1/market/buylimit?market=' + market + "&quantity=" + quantity + "&rate=" + rate;

    bittrex.sendCustomRequest( url, function( data ) {
      console.log( data );
    }, true);
  },
  cancelOrder: function(uuid) {
    var url = 'https://bittrex.com/api/v1.1/market/cancel?uuid=' + uuid;

    bittrex.sendCustomRequest( url, function( data ) {
      console.log( data );
    }, true);
  },
  updateTicker: function (market, object) {
    object[market]
  }
}
