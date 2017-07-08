// Detector Lib in NodeJS

// REQUIRED LIBS
const PumpHandler = require('./pump_handler.js');
require('./protofunctions.js');

// REAL CODING
function Detektor(logger, api, markets, pump_events, test_mode) {
  this.logger = logger;
  this.api = api;
  this.markets = markets;
  this.pumps_bought = [];
  this.pump_events = pump_events;
  this.pumps = [];
  this.count = 0;
  this.test_mode = test_mode;
}

Detektor.prototype.start = function() {
  // Configure listeners
  // this.logger.log('Detektor', 'Starting watch');
  setTimeout(() => {
    var self = this;
    self.api.websockets.subscribe(self.markets, function(data) {
      if (data.M === 'updateExchangeState') {
        data.A.forEach(function(data_for) {
          self.logger.log_to_file(JSON.stringify(data_for));
          self.analyze_market(data_for);
        });
      }
    });
  }, 1000);
  // // Listen to markets updates
  // setTimeout(function() {
  //     this.api.websockets.listen( function( data ) {
  //     if (data.M === 'updateSummaryState') {
  //       console.log("SECOND UPDATE", data)
  //       data.A.forEach(function(data_for) {
  //         data_for.Deltas.forEach(function(marketsDelta) {
  //           // console.log('Ticker Update for '+ marketsDelta.MarketName, marketsDelta);
  //         });
  //       });
  //     }
  //   });
  // }, 5000); // give time for first subscriber to subscribe

}

Detektor.prototype.analyze_market = function(data) {
  result = false;
  buy_at = 0;
  sell_at = 0;
  btc_amount = 0;
  market_name = data.MarketName;
  self = this;
  if (data.Fills.length > 0) {
    buys = data.Fills.filter(function(e) { return e.OrderType == 'BUY'; });
    buy_amount = buys.length == 0 ? 0 : buys.map(function(e) { return e.Quantity * e.Rate; }).sum();
    first_fill = data.Fills.last();
    last_fill = data.Fills.first();
    change = last_fill.Rate / first_fill.Rate;
    if ( (change > 1.04) && (buys.length > 40 || buy_amount > 3.5) ) {
      result = true; buy_at = 1.01; sell_at = 1.08; btc_amount = 0.01;
    }
    if ( (change > 1.05) && (buys.length > 50 || buy_amount > 5) ) {
      result = true; buy_at = 1.06; sell_at = 1.5; btc_amount = 0.1;
    }
  }
  if (result) {
    self.count += 1;
    if (self.count > 100) {
      self.logger.log(market_name, "PUMP DETECTED BUT ALREADY REACHED MAX BUY/SELLS")
    } else {
      if (self.pumps_bought[market_name] == undefined) {
        // get ticker info and make BUY order
        last_fill = data.Fills.first();
        self.logger.log(market_name, "POSSIBLE PUMP DETECTED -> LAST PRICE: " + last_fill.Rate);
        first_ask = last_fill.Rate;
        // rate = (first_ask * 1.05); // RATE (+) TO BUY ORDER
        rate = first_ask; // RATE (+) TO BUY ORDER
        self.pumps_bought[market_name] = true;
        if (self.test_mode) {
          self.logger.log(market_name, "Test values: Amount: " + btc_amount * 0.9975 / buy_at * rate + " | Buy price " + buy_at * rate + " | Sell price: " + sell_at * rate);
        } else {
          var pump = new PumpHandler(self.pump_events, self.logger, market_name, btc_amount, rate, buy_at, sell_at); // COMMENT THIS LINE FOR REAL TESTING
          pump.start();
          self.pumps.push(pump); // later review
        }
      } else {
        self.logger.log(market_name, "PUMP detected on but already started pump handler");
      }
      sells = data.Fills.filter(function(e) { return e.OrderType == 'SELL'; });
      sell_amount = sells.length == 0 ? 0 : sells.map(function(e) { return e.Quantity * e.Rate; }).reduce(function(sum, e) { return sum+e; });
      winner = buys > sells ? " WINNER: buys" : " WINNER: sells";
      self.logger.log(market_name, "[CHANGE: " + change + "]" + "[OPEN " + first_fill.TimeStamp + " " + first_fill.Rate + "] [CLOSE " + last_fill.TimeStamp + " " + last_fill.Rate + "] buy amount: " + buys.length + " (" + buy_amount.toFixed(4) + " BTC), sell amount: " + sells.length + "(" + sell_amount.toFixed(4) + " BTC)" + winner);
    }
  }
}

module.exports = Detektor;