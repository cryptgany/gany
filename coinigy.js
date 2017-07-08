// require('./coinigy')
require('dotenv').config();

var socketCluster = require('socketcluster-client');

var api_credentials = {
  "apiKey"    : process.env.COINIGY_KEY,
  "apiSecret" : process.env.COINIGY_SECRET
}

var options = {
  hostname  : "sc-02.coinigy.com",
  port      : "443",
  secure    : "true"
};

console.log(options);
var SCsocket = socketCluster.connect(options);

var store = {};

SCsocket.on('connect', function (status) {

  console.log(status);

  SCsocket.on('error', function (err) {
      console.log(err);
  });

  SCsocket.emit("auth", api_credentials, function(err, token) {

    if (!err && token) {
      ['TRADE', 'ORDER'].forEach((operation) => {
        store[operation] = store[operation] || {};
        ['BTRX', 'YOBT'].forEach((exchange) => {
          store[operation][exchange] = store[operation][exchange] || {};
          ['TX', 'SIB', 'DGB'].forEach((market) => {
            store[operation][exchange][market] = store[operation][exchange][market] || [];
            subscribe = operation + "-" + exchange + "--" + market + '--BTC';
            SCsocket.subscribe(subscribe).watch((data) => {
              store[operation][exchange][market].push(data);
            });
          });
        });
      });

      // SCsocket.emit("exchanges", null, function (err, data) {
      //     if (!err) {
      //         console.log(data);
      //     } else {
      //         console.log(err)
      //     }
      // });

      // SCsocket.emit("channels", "BTRX", function (err, data) {
      //     if (!err) {
      //         console.log("CHANNELS FOR BTRX");
      //         console.log(data);
      //     } else {
      //         console.log(err)
      //     }
      // });
    } else {
        console.log(err)
    }
  });
});
