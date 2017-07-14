// Should place order
// Should keep track of order
// Should make sell order after buying
function PumpHandler(event_handler, logger, client, exchange, market, btc_amount, base_rate, buy_at, sell_at) {
  this.event_handler = event_handler;
  this.logger = logger;
  this.client = client
  this.exchange = exchange;
  this.market = market;
  this.btc_amount = btc_amount * 0.9975; // ensure we don't use more than expected BTC amount (fees)
  this.base_rate = base_rate;
  this.buy_rate = this.base_rate * buy_at; // * 1.5;
  this.quantity = this.btc_amount / this.buy_rate;

  this.sell_price_percentage = sell_at; // 2 by now
  this.sell_rate = this.base_rate * this.sell_price_percentage;

  this.buy_order = undefined;
  this.buy_order_completed = false;
  this.buy_order_id = undefined;
  this.sell_order = undefined;
  this.sell_order_completed = false;
  this.sell_order_id = undefined;
}

PumpHandler.prototype.start = function() {
  this.logger.log(this.market, "Starting pnd! base rate: " + this.base_rate, true);

  // configure events
  this.event_handler.on('ordercomplete', (order) => {
    if (this.buy_order_id == order.id) {// is a buy order
      this.logger.log(this.market, "BUY ORDER COMPLETE! ID = " + order.id, true);
      this.buy_order = order;
      this.buy_order_completed = true;
      this.sell_on_peak();
    }
    if (this.sell_order_id == order.id) {// is a sell order
      this.logger.log(this.market, "SELL ORDER COMPLETED ID = " + order.id, true);
      this.sell_order = order;
      this.sell_order_completed = true;
      this.print_result();
    }
  });

  // start buy process
  this.logger.log(this.market, "Placing buy order... ", true);

  this.client.buy_order(this.market, this.quantity, this.buy_rate, (data) => {
    this.buy_order_id = data.result.id;
    // wait order completion
    this.logger.log(this.market, "Waiting for BUY order to complete... rate: " + this.buy_rate + ", order_id: " + data.result.id, true);
    this.waitForComplete(data.result.id);
  });
}

PumpHandler.prototype.waitForComplete = function(order_id) {
  this.client.get_order(order_id, (order) => {
    if (order.result.closed) { // order completed
      this.event_handler.emit('ordercomplete', order.result);
    } else {
      setTimeout(() => { this.waitForComplete(order_id) }, 500);
    }
  });
}

PumpHandler.prototype.sell_on_peak = function() {
  // TO DO: IMPLEMENT SELL PEAK DETECTION STRATEGY
  this.logger.log(this.market, "Placing sell order...", true)
  this.client.sell_order(this.market, this.quantity, this.sell_rate, (data) => {
    this.sell_order_id = data.result.id;
    // wait order completion
    this.logger.log(this.market, "Waiting for SELL order to complete... rate: " + this.sell_rate + ", order_id: " + data.result.id, true);
    this.waitForComplete(data.result.id);
  });
}

PumpHandler.prototype.print_result = function() {
  var buy_price = this.buy_order.PricePerUnit;
  var sell_price = this.sell_order.Limit;
  var buy_cost = this.buy_order.Quantity * buy_price * 1.0025; // 0.0025% fee
  var sell_return = this.sell_order.Quantity * sell_price * 0.9975; // 0.0025% fee
  var profit = sell_return - buy_cost;

  this.logger.log(this.market, "PUMP COMPLETE! [ BUY: " + buy_price + " ]|[ SELL: " + sell_price + " ]|[ PROFIT: " + profit + " ]", true);
}

module.exports = PumpHandler;
