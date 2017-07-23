// Should place order
// Should keep track of order
// Should make sell order after buying
function PumpHandler(event_handler, logger, client, exchange, market, btc_amount, base_rate, buy_at, sell_at, detektor, strategy = 0, verbose = false) {
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
  this.canceled_orders = []

  this.pump_ended = false
  this.sold_on_peak = false
  this.downtrend = 0
  this.last_price = 0
  this.profit = 0 // will store end profit

  this.sell_price_percentage = sell_at; // used for fixed price sells
  this.sell_rate = this.base_rate * this.sell_price_percentage;

  this.buy_order = undefined;
  this.buy_order_completed = false;
  this.buy_order_id = undefined;
  this.sell_order = undefined;
  this.sell_order_completed = false;
  this.sell_order_id = undefined;

  this.strategy = strategy // 0: smart, 1: fixed %

  this.smart_strategy = { // params for strategy 0
    time_for_peak_detection: 60 * 24, // minutes, give this time for trying to reach peak price
    time_for_fixed_sell_detection: 0.15, // when doing fixed sells at certain price, wait if they do not complete
    percentage_for_selling_on_downtrend: 1.1, // if on downtrend, sell if bigger than this price
    minumum_sells_to_consider_downtrend: 2, // each unit is 10 seconds
    expected_percentage_to_sell: 1.5 // if reached this percentage, sell
  }

  this.verbose = verbose
  this.ticker_event_handler_method = this.analyze_ticker.bind(this)
}

PumpHandler.prototype.start = function() {
  if (this.verbose) console.log("CALL TO ", this.market, "start")
  this.logger.log(this.exchange + "/" + this.market, "Starting pump. Base rate: " + this.base_rate.toFixed(8), true);

  // start buy process
  if (this.verbose) console.log(this.market, "Placing buy order... ");

  this.client.buy_order(this.market, this.quantity, this.buy_rate, (data) => {
    this.buy_order_id = data.result.id;
    // wait order completion
    if (this.verbose) console.log(this.market, "Waiting for BUY order to complete... rate: " + this.buy_rate.toFixed(8));
    this.cancel_order_if_not_complete(data.result.id, 15*1000)
    this.waitForComplete(data.result.id, (order) => { this.notify_buy_complete_and_sell(order) });
  });
}

PumpHandler.prototype.notify_buy_complete_and_sell = function(order) {
  if (this.verbose) console.log("CALL TO ", this.market, "notify_buy_complete_and_sell")
  if (this.verbose) console.log(this.market, "BUY ORDER COMPLETE! ID = " + order.id);
  this.buy_order = order;
  this.buy_order_completed = true;
  this.sell_on_peak();
}

PumpHandler.prototype.waitForComplete = function(order_id, callback) {
  if (this.verbose) console.log("CALL TO ", this.market, "waitForComplete")
  if (this.pump_ended) return false; // do not track orders if pump canceled
  if (this.canceled_orders.includes(order_id)) return false;
  this.client.get_order(order_id, (order) => {
    if (order.result.closed) { // order completed
      callback(order.result)
    } else {
      setTimeout(() => { this.waitForComplete(order_id, callback) }, 1000);
    }
  });
}

PumpHandler.prototype.cancel_order_if_not_complete = function(order_id, time) {
  if (this.verbose) console.log("CALL TO ", this.market, "cancel_order_if_not_complete")
  setTimeout(() => { // if after this time order is not complete, cancel it
    if (this.buy_order_id == order_id) {
      // is the buy order but could not complete, pump canceled
      if (!this.buy_order_completed) {
        this.pump_ended = true
        this.canceled_orders.push(order_id)
        if (this.verbose) console.log(this.market, "Could not buy, pump canceled.");
      }
    }
    if (this.sell_order_id == order_id) {
      // sell order not completed
      if (!this.sell_order_completed){
        this.canceled_orders.push(order_id)
        this.cancel_order_and_emit(order_id, () => {
          if (this.verbose) console.log(this.market, "Could not sell, order canceled, trying to sell at current price");
          this.sell_rate = this.detektor.tickers[this.exchange][this.market].bid * 0.98 // sell at whatever person is buying
          this.sell_on_peak(1);
        })
      }
    }
    if (order_id == 'new') { // could not find good peak, sell at current price
      if(this.verbose) { console.log(this.market, 'Could not sell at peak, selling current price and receive loss') }
      this.sell_rate = this.detektor.tickers[this.exchange][this.market].bid * 0.98
      this.event_handler.removeListener('marketupdate', this.ticker_event_handler_method)
      this.sell_on_peak(1)
    }
  }, time)
}

PumpHandler.prototype.cancel_order_and_emit = function(order_id, callback) {
  if (this.verbose) console.log("CALL TO ", this.market, "cancel_order_and_emit")
  if (this.verbose) console.log("canceling and emiting ", order_id)
  this.client.cancel_order(order_id, (result) => {
    if (result.success) { // order cancelled
      callback()
    } else {
      if (this.verbose) console.log(this.market,"Error trying to cancel order " + order_id)
    }
  });
}

PumpHandler.prototype.sell_on_peak = function(strategy = this.strategy, last_price = this.base_rate, downtrend = 0) { // sell based on strategies
  if (this.verbose) console.log("CALL TO ", this.market, "sell_on_peak", "strategy", strategy,"with price " + last_price, "and downtrend = " + downtrend)
  // TO DO: IMPLEMENT SELL PEAK DETECTION STRATEGY
  if (strategy == 0) { // peak detector
    this.sold_on_peak = false
    this.cancel_order_if_not_complete('new', this.smart_strategy.time_for_peak_detection * 60 * 1000)// this should be like 1 hour
    this.last_price = last_price
    this.event_handler.on('marketupdate', this.ticker_event_handler_method)
  }
  if (strategy == 1) { // fixed price
    if (this.verbose) console.log(this.market, "Placing sell order...")
    this.client.sell_order(this.market, this.quantity, this.sell_rate, (data) => {
      this.sell_order_id = data.result.id;
      // wait order completion
      if (this.verbose) console.log(this.market, "Waiting for SELL order to complete... rate: " + this.sell_rate.toFixed(8));
      this.cancel_order_if_not_complete(data.result.id, this.smart_strategy.time_for_fixed_sell_detection * 1000) // wait 5 minutes
      this.waitForComplete(data.result.id, (order) => { this.notify_complete_and_print_result(order) });
    });
  }
}

PumpHandler.prototype.analyze_ticker = function(operation, exchange, market, data) {
  if(this.verbose && operation=="TICKER" && exchange==this.exchange && market==this.market)
    console.log("event alive:", exchange,market)
  if (!this.pump_ended && !this.sold_on_peak && operation == 'TICKER' && exchange == this.exchange && market == this.market) {
    if(this.verbose) console.log("analyzing", this.market, "downtrend", this.downtrend, "last", this.last_price.toFixed(8))
    if (data.ask < this.last_price) {
      this.downtrend++
      if (this.downtrend >= this.smart_strategy.minumum_sells_to_consider_downtrend) { // reached
        if (this.verbose) console.log("downtrend detected on price " + data.ask.toFixed(8), "vs " + this.last_price.toFixed(8), "(started on " + this.base_rate.toFixed(8) + ")")
        if (data.ask / this.base_rate > this.smart_strategy.percentage_for_selling_on_downtrend) {// and is bigger than 5%
          if (this.verbose) console.log("and price is bigger than 5%, selling")
          this.sell_rate = data.ask * 0.98
          this.sold_on_peak = true // stop cycle
          this.event_handler.removeListener('marketupdate', this.ticker_event_handler_method)
          this.sell_on_peak(1)
        } else {  } // check next cycle
      } else {  } // check next cycle
    } else {
      this.downtrend = 0 // reset to 0
      this.last_price = data.ask
      if ((data.ask / this.base_rate) > this.smart_strategy.expected_percentage_to_sell) {
        this.sell_rate = data.ask * 0.98
        this.sold_on_peak = true // stop cycle
        this.event_handler.removeListener('marketupdate', this.ticker_event_handler_method)
        this.sell_on_peak(1)
      }
      // this.sell_on_peak(0, data.ask, downtrend) // check next cycle
    }
    this.last_price = data.ask // update last price
  }
}

PumpHandler.prototype.notify_complete_and_print_result = function(order) {
  if (this.verbose) console.log("CALL TO ", this.market, "notify_complete_and_print_result")
  this.pump_ended = true
  if (this.verbose) console.log(this.market, "SELL ORDER COMPLETED ID = " + order.id);
  this.sell_order = order;
  this.sell_order_completed = true;
  this.print_result();
}

PumpHandler.prototype.print_result = function() {
  if(this.verbose) console.log("CALL TO ", this.market, "print_result")
  var buy_price = this.buy_order.price_per_unit;
  var sell_price = this.sell_order.price_per_unit;
  var buy_cost = this.buy_order.quantity * buy_price * 1.0025; // 0.0025% fee
  var sell_return = this.sell_order.quantity * sell_price * 0.9975; // 0.0025% fee
  var profit = sell_return - buy_cost;
  this.profit = profit
  this.logger.log(this.exchange + "/" + this.market, "Pump complete! [ BUY: " + buy_price.toFixed(8) + " ]|[ SELL: " + sell_price.toFixed(8) + " ]|[ RESULT: " + profit.toFixed(8) + " ]", true);
}

module.exports = PumpHandler;
