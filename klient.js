require('dotenv').config();
var bittrex = require('node.bittrex.api');
var datetime = require('node-datetime');
require('./protofunctions.js');

bittrex.options({
  'apikey' : process.env.KEY,
  'apisecret' : process.env.SECRET,
  'stream' : false, // will be removed from future versions
  'verbose' : false,
  'cleartext' : false
});

Klient = {
  balance: function(currency = 'BTC') {
    bittrex.getbalance({ currency : currency }, function( data ) {
      console.log( currency + ": " + data.result.Available );
    });
  },
  getOrder: function(orderId, callback) {
    bittrex.getorder({ uuid : orderId }, callback);
  },
  buyOrder: function(market, quantity, rate, callback) {
    var url = 'https://bittrex.com/api/v1.1/market/buylimit?market=' + market + "&quantity=" + quantity + "&rate=" + rate;

    bittrex.sendCustomRequest( url, callback, true );
  },
  sellOrder: function(market, quantity, rate, callback) {
    var url = 'https://bittrex.com/api/v1.1/market/selllimit?market=' + market + "&quantity=" + quantity + "&rate=" + rate;

    bittrex.sendCustomRequest( url, callback, true );
  },
  cancelOrder: function(uuid) {
    var url = 'https://bittrex.com/api/v1.1/market/cancel?uuid=' + uuid;

    bittrex.sendCustomRequest( url, function( data ) {
      console.log( data );
    }, true);
  },
  orders: function() {
    bittrex.getopenorders( {}, function( data ) {
      console.log( data );
    });
  },
  x: function() {
    bittrex.getopenorders( {}, function( data ) {
      data.result.map(function(e) {
        Klient.cancelOrder(e.OrderUuid);
      });
    });
  },
  updateTicker: function (market, object) {
    object[market]
  }
}
