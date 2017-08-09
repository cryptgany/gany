// const Coinigy = require('./coinigy'); coin = new Coinigy(); coin.start();
// const Coinigy = require('./coinigy'); coin = new Coinigy(); coin.fetch_markets();
require('dotenv').config();
var request = require('request');

function Coinigy() {
  this.api_credentials = {
    "apiKey"    : process.env.COINIGY_KEY,
    "apiSecret" : process.env.COINIGY_SECRET
  }
  this.headers = {
    'Content-Type': 'application/json',
    'X-API-KEY': this.api_credentials.apiKey,
    'X-API-SECRET': this.api_credentials.apiSecret
  }

  this.options = {
    hostname  : "sc-02.coinigy.com",
    port      : "443",
    secure    : "true",
    multiplex : false
  };

  this.enabled_exchanges = [/YOBT/, /BTRX/];

  this.SCsocket = {}; // Socked handler
  this.market_data = {}; // handles the market data and keeps it updated
  this.market_info = {}; // stores market data by id
  this.market_channels = []; // for all tracked operations-exchanges-markets
  this.sockets = []; // to handle all the required subscribers

  this.fetch_markets((e) => {
    exchange = e.exch_code;
    market = e.mkt_name.replace(/\//, '--');
    exchange_market = exchange + "--" + market;
    this.market_info[exchange_market] = e;
    this.market_data[exchange_market] = {};

    ['TRADE', 'ORDER'].forEach((operation) => {
      subscribe = operation + "-" + exchange_market;
      this.market_channels.push(subscribe);
    });
  }, () => {
    // finished loading
    this.start();
  });

  this.socketCluster = require('socketcluster-client');
}

// Will create a socket for each 250 elements (limitations)
Coinigy.prototype.start = function() {
  length = Math.ceil(this.market_channels.length / 250);
  // console.log("Starting configuration")
  // for each 250, create new socket
  for(var count = 0; count < length; count++) {
    this.create_socket(count);
  }
}

Coinigy.prototype.create_socket = function(id) {
  setTimeout(() => {
    // console.log("Creating socket " + id);
    var SCsocket = this.socketCluster.connect(this.options);
    this.sockets.push(SCsocket);
    // console.log("id: ", id);

    this.sockets[id].on('connect', (status) => {
      // console.log("Connected! socket id " + id);
      this.sockets[id].on('error', (err) => {
          // console.log(err);
      });

      this.sockets[id].emit("auth", this.api_credentials, (err, token) => {
        // console.log("Authenticated " + id + ", doing API")
        if (!err && token) {

          // SUBSCRIBING TO TRADES
          this.market_channels.slice(id * 250, id + 1 * 250).forEach((channel) => {
            if (this.market_data[channel] == undefined)
              this.market_data[channel] = [];
            this.sockets[id].subscribe(channel).watch(this.socket_callback);
          });
        } else {
          // console.log(err)
        }
      });
    });
  }, 1000 * id);

}

Coinigy.prototype.socket_callback = function(body) {
  if (body.channel != undefined) { // this is a TRADE
    exchange = body.exchange;
    market = body.label;
    type = "trade";
    channel = body.channel;
    data = body
  }
  if (body.length == 20) {// orderbook
    exchange = body[0].exchange;
    market = body[0].label;
    type = "order";
    channel = "ORDER-" + exchange + "--" + market.replace(/\//, "--");
    data = body;
  }
  console.log("Incoming info from channel " + channel);
  // this.market_data[mkt_id][operation].push(data);
}

Coinigy.prototype.fetch_markets = function(callback, on_finish) {
  request({
    method: 'POST',
    url: 'https://api.coinigy.com/api/v1/markets',
    headers: this.headers,
  }, (error, response, body) => {
    // parse response
    var resp = JSON.parse(body);
    // filter only selected markets
    var filtered = resp.data.filter((e) => { return this.enabled_exchanges.filter((exch) => { return e.exch_code.match(exch); }).length > 0; });
    // filter only BTC markets
    var filtered = filtered.filter((e) => { return e.mkt_name.endsWith('BTC'); });
    filtered.forEach((e) => {
      callback(e);
    });
    on_finish();
  });
}


module.exports = Coinigy;
