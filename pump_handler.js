// Should place order
// Should keep track of order
// Should make sell order after buying
function PumpHandler(event_handler, logger, client, exchange, market, btc_amount, base_rate, buy_at, sell_at, detektor) {
  this.event_handler = event_handler;
  this.logger = logger;
  this.client = client
  this.exchange = exchange;
  this.market = market;
  this.btc_amount = btc_amount * 0.9975; // ensure we don't use more than expected BTC amount (fees)
  this.base_rate = base_rate;
  this.buy_rate = this.base_rate * buy_at; // * 1.5;
  this.quantity = this.btc_amount / this.buy_rate;
  this.detektor = detektor

  this.pump_canceled = false

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
    if (!this.pump_canceled) { // only if we are in pump
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
    }
  });

  // configure events
  this.event_handler.on('ordercanceled', (order_id) => {
    console.log("HERE", this.buy_order_id, this.sell_order_id, order_id)
    if (this.buy_order_id == order_id) {// pump didn't work, delete everything
      this.logger.log(this.market, "Could not buy, pump canceled.", true);
    }
    if (this.sell_order_id == order_id) {// is a sell order, couldn't sell, try to sell at better price
      this.logger.log(this.market, "Could not sell, order canceled, trying to sell at current price", true);
      this.sell_rate = this.detektor.tickers[this.exchange][this.market].bid * 0.99 // sell at whatever person is buying
      this.sell_on_peak();
    }
  });

  // start buy process
  this.logger.log(this.market, "Placing buy order... ", true);

  this.client.buy_order(this.market, this.quantity, this.buy_rate, (data) => {
    this.buy_order_id = data.result.id;
    // wait order completion
    this.logger.log(this.market, "Waiting for BUY order to complete... rate: " + this.buy_rate, true);
    this.cancel_order_if_not_complete(data.result.id, 15*1000)
    console.log("cancel ifnot complete seted up")
    this.waitForComplete(data.result.id);
    console.log("wait for complete setted up")
  });
}

PumpHandler.prototype.waitForComplete = function(order_id) {
  if (this.pump_canceled) return false; // do not track orders if pump canceled
  this.client.get_order(order_id, (order) => {
    if (order.result.closed) { // order completed
      this.event_handler.emit('ordercomplete', order.result);
    } else {
      setTimeout(() => { this.waitForComplete(order_id) }, 500);
    }
  });
}

PumpHandler.prototype.cancel_order_if_not_complete = function(order_id, time) {
  setTimeout(() => { // if after this time order is not complete, cancel it
    if (this.buy_order_id == order_id) {
      // is the buy order but could not complete, pump canceled
      if (!this.buy_order_completed) {
        console.log("canceling pump")
        this.pump_canceled = true
        this.cancel_order_and_emit(order_id)
      }
    }
    if (this.sell_order_id == order_id) {
      // sell order not completed
      if (!this.sell_order_completed){
        console.log("could not sell, selling lower")
        this.cancel_order_and_emit(order_id)
      }
    }
  }, time)
}

PumpHandler.prototype.cancel_order_and_emit = function(order_id) {
  console.log("canceling and emiting ", order_id)
  this.client.cancel_order(order_id, (result) => {
    if (result.success) { // order cancelled
      this.event_handler.emit('ordercanceled', order_id)
    } else {
      this.logger.log(this.market,"Error trying to cancel order " + order_id)
    }
  });
}

PumpHandler.prototype.sell_on_peak = function() {
  // TO DO: IMPLEMENT SELL PEAK DETECTION STRATEGY
  this.logger.log(this.market, "Placing sell order...", true)
  this.client.sell_order(this.market, this.quantity, this.sell_rate, (data) => {
    this.sell_order_id = data.result.id;
    // wait order completion
    this.logger.log(this.market, "Waiting for SELL order to complete... rate: " + this.sell_rate, true);
    this.cancel_order_if_not_complete(data.result.id, 30 * 1000) // wait 5 minutes
    this.waitForComplete(data.result.id);
  });
}

PumpHandler.prototype.print_result = function() {
  var buy_price = this.buy_order.price_per_unit;
  var sell_price = this.sell_order.price;
  var buy_cost = this.buy_order.quantity * buy_price * 1.0025; // 0.0025% fee
  var sell_return = this.sell_order.quantity * sell_price * 0.9975; // 0.0025% fee
  var profit = sell_return - buy_cost;
  this.logger.log(this.market, "PUMP COMPLETE! [ BUY: " + buy_price + " ]|[ SELL: " + sell_price + " ]|[ RESULT: " + profit + " ]", true);
  this = null // finish
}

module.exports = PumpHandler;
