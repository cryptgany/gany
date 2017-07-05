// Should place order
// Should keep track of order
// Should make sell order after buying
require('./klient.js');
const DateTime = require('node-datetime');

function PumpHandler(eventHandler, market, quantity, rate) {
  this.market = market;
  this.quantity = quantity;
  this.buy_rate = rate * 1.5;
  this.eventHandler = eventHandler;

  this.sell_price_percentage = 0.8; // 200%, by now
  this.sell_rate = rate * this.sell_price_percentage;

  this.buy_order = undefined;
  this.buy_order_completed = false;
  this.buy_order_id = undefined;
  this.sell_order = undefined;
  this.sell_order_completed = false;
  this.sell_order_id = undefined;
  this.start();
}

PumpHandler.prototype.start = function() {
  var self = this; // for callbacks
  console.log("Starting pnd! market = " + self.market);

  // configure events
  self.eventHandler.on('ordercomplete', function(order) {
    if (self.buy_order_id == order.OrderUuid) {// is a buy order
      console.log("BUY ORDER COMPLETE! ID = " + order.OrderUuid);
      self.buy_order = order;
      self.buy_order_completed = true;
      self.sell_on_peak();
    } else {
      console.log("SELL ORDER COMPLETED ID = " + order.OrderUuid);
      self.sell_order = order;
      self.sell_order_completed = true;
      self.print_result();
    }
  });

  // start buy process
  console.log("Placing buy order... ")
  Klient.buyOrder(self.market, self.quantity, self.buy_rate, function(data) {
    self.buy_order_id = data.result.uuid;
    // wait order completion
    console.log("Waiting for BUY order to complete... rate: " + self.buy_rate + ", order_id: " + data.result.uuid);
    self.waitForComplete(data.result.uuid);
  });
}

PumpHandler.prototype.waitForComplete = function(order_id) {
  var self = this;
  Klient.getOrder(order_id, function(order) {
    if (order.result.Closed) { // order completed
      self.eventHandler.emit('ordercomplete', order.result);
    } else {
      setTimeout(function(){ self.waitForComplete(order_id) }, 500);
    }
  });
}

PumpHandler.prototype.sell_on_peak = function() {
  // TO DO: IMPLEMENT SELL PEAK DETECTION STRATEGY
  console.log("Placing sell order...")
  var self = this;
  Klient.sellOrder(this.market, this.quantity, this.sell_rate, function(data) {
    self.sell_order_id = data.result.uuid;
    // wait order completion
    console.log("Waiting for SELL order to complete... rate: " + self.sell_rate + ", order_id: " + data.result.uuid);
    self.waitForComplete(data.result.uuid);
  });
}

PumpHandler.prototype.print_result = function() {
  var buy_price = this.buy_order.PricePerUnit;
  var sell_price = this.sell_order.Limit;
  var buy_cost = this.buy_order.Quantity * buy_price * 1.0025; // 0.0025% fee
  var sell_return = this.sell_order.Quantity * sell_price * 0.9975; // 0.0025% fee
  var profit = sell_return - buy_cost;

  console.log("PUMP ON MARKET " + this.market + " COMPLETE! [ BUY: " + buy_price + " ]|[ SELL: " + sell_price + " ]|[ PROFIT: " + profit + " ]");
}

module.exports = PumpHandler;
