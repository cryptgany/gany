// const Coinigy = require('./coinigy'); coin = new Coinigy(); coin.start();
// const Coinigy = require('./coinigy'); coin = new Coinigy(); coin.fetch_markets();
require('dotenv').config();
var socketCluster = require('socketcluster-client');
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
    secure    : "true"
  };

  this.enabled_exchanges = [/YOBT/, /BTRX/];

  this.SCsocket = {}; // Socked handler
  this.market_data = {}; // handles the market data and keeps it updated
  this.market_info = {}; // stores market data by id
}

Coinigy.prototype.start = function() {
  this.fetch_markets();

  this.SCsocket = socketCluster.connect(this.options);

  this.SCsocket.on('connect', (status) => {
    console.log("Connected!");
    this.SCsocket.on('error', (err) => {
        console.log(err);
    });

    this.SCsocket.emit("auth", this.api_credentials, (err, token) => {
      console.log("Authenticated, doin API")
      if (!err && token) {
        // SUBSCRIBING TO TRADES
        setTimeout(() => {
          operation = 'TRADE';
          console.log("Configuring TRADE")
          Object.keys(this.market_info).forEach((mkt_id) => {
            exchange = this.market_info[mkt_id].exch_code;
            market = this.market_info[mkt_id].mkt_name.replace(/\//, '--');
            subscribe = operation + "-" + exchange + "--" + market;

            this.market_data[mkt_id][operation] = [];
              this.SCsocket.subscribe(subscribe).watch((data) => {
                console.log("RECEIVED! " + mkt_id + " - " + operation + " - " + this.market_info[mkt_id].exch_code + " - " + this.market_info[mkt_id].mkt_name.replace(/\//, '--'));
                this.market_data[mkt_id][operation].push(data);
              });
          });
        }, 1000);

        // SUBSCRIBING TO ORDER
        setTimeout(() => {
          operation = 'ORDER';
          console.log("Configuring ORDER")
          Object.keys(this.market_info).forEach((mkt_id) => {
            exchange = this.market_info[mkt_id].exch_code;
            market = this.market_info[mkt_id].mkt_name.replace(/\//, '--');
            subscribe = operation + "-" + exchange + "--" + market;

            this.market_data[mkt_id][operation] = [];
              this.SCsocket.subscribe(subscribe).watch((data) => {
                console.log("RECEIVED! " + mkt_id + " - " + operation + " - " + this.market_info[mkt_id].exch_code + " - " + this.market_info[mkt_id].mkt_name.replace(/\//, '--'));
                this.market_data[mkt_id][operation].push(data);
              });
          });
        }, 60000);

        // SUBSCRIBING TO TICKER
        setTimeout(() => {
          operation = 'TICKER';
          console.log("Configuring TICKER")
          Object.keys(this.market_info).forEach((mkt_id) => {
            exchange = this.market_info[mkt_id].exch_code;
            market = this.market_info[mkt_id].mkt_name.replace(/\//, '--');
            subscribe = operation + "-" + exchange + "--" + market;

            this.market_data[mkt_id][operation] = [];
              this.SCsocket.subscribe(subscribe).watch((data) => {
                console.log("RECEIVED! " + mkt_id + " - " + operation + " - " + this.market_info[mkt_id].exch_code + " - " + this.market_info[mkt_id].mkt_name.replace(/\//, '--'));
                this.market_data[mkt_id][operation].push(data);
              });
          });
        }, 120000);

      } else {
        console.log(err)
      }
    });
  });
}

Coinigy.prototype.fetch_markets = function() {
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
      this.market_info[e.mkt_id] = e;
      this.market_data[e.mkt_id] = {};
    });
  });
}


module.exports = Coinigy;