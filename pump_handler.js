// Should place order
// Should keep track of order
// Should make sell order after buying
require('./klient');

function PumpHandler(eventHandler, logger, market, btc_amount, base_rate, buy_at, sell_at) {
  this.market = market;
  this.btc_amount = btc_amount * 0.9975; // ensure we don't use more than expected BTC amount (fees)
  this.base_rate = base_rate;
  this.buy_rate = this.base_rate * buy_at; // * 1.5;
  this.eventHandler = eventHandler;
  this.quantity = this.btc_amount / this.buy_rate;

  this.sell_price_percentage = sell_at; // 2 by now
  this.sell_rate = this.base_rate * this.sell_price_percentage;

  this.buy_order = undefined;
  this.buy_order_completed = false;
  this.buy_order_id = undefined;
  this.sell_order = undefined;
  this.sell_order_completed = false;
  this.sell_order_id = undefined;
  this.logger = logger;
}

PumpHandler.prototype.start = function() {
  var self = this; // for callbacks
  self.logger.log(this.market, "Starting pnd! base rate: " + this.base_rate);

  // configure events
  self.eventHandler.on('ordercomplete', function(order) {
    if (self.buy_order_id == order.OrderUuid) {// is a buy order
      self.logger.log(self.market, "BUY ORDER COMPLETE! ID = " + order.OrderUuid);
      self.buy_order = order;
      self.buy_order_completed = true;
      self.sell_on_peak();
    }
    if (self.sell_order_id == order.OrderUuid) {// is a sell order
      self.logger.log(self.market, "SELL ORDER COMPLETED ID = " + order.OrderUuid);
      self.sell_order = order;
      self.sell_order_completed = true;
      self.print_result();
    }
  });

  // start buy process
  self.logger.log(self.market, "Placing buy order... ");
  Klient.buyOrder(self.market, self.quantity, self.buy_rate, function(data) {
    self.buy_order_id = data.result.uuid;
    // wait order completion
    self.logger.log(self.market, "Waiting for BUY order to complete... rate: " + self.buy_rate + ", order_id: " + data.result.uuid);
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
  var self = this;
  self.logger.log(this.market, "Placing sell order...")
  Klient.sellOrder(this.market, this.quantity, this.sell_rate, function(data) {
    self.sell_order_id = data.result.uuid;
    // wait order completion
    self.logger.log(self.market, "Waiting for SELL order to complete... rate: " + self.sell_rate + ", order_id: " + data.result.uuid);
    self.waitForComplete(data.result.uuid);
  });
}

PumpHandler.prototype.print_result = function() {
  var buy_price = this.buy_order.PricePerUnit;
  var sell_price = this.sell_order.Limit;
  var buy_cost = this.buy_order.Quantity * buy_price * 1.0025; // 0.0025% fee
  var sell_return = this.sell_order.Quantity * sell_price * 0.9975; // 0.0025% fee
  var profit = sell_return - buy_cost;

  this.logger.log(this.market, "PUMP COMPLETE! [ BUY: " + buy_price + " ]|[ SELL: " + sell_price + " ]|[ PROFIT: " + profit + " ]");
}

module.exports = PumpHandler;
