const repl = require('repl');


const Payment = require('./models/payment.js')
const Signal = require('./models/signal.js')
const Subscriber = require('./models/subscriber.js')
const Ticker = require('./models/ticker.js')
const TickerData = require('./models/ticker_data.js')
const InfluxTicker = require('./models/influx_ticker')

const Wallet = require("./wallet")
const ExchangeList = require('./exchange_list')

var replServer = repl.start({})

replServer.context.Payment = Payment;
replServer.context.Signal = Signal;
replServer.context.Subscriber = Subscriber;
replServer.context.Ticker = Ticker;
replServer.context.TickerData = TickerData;
replServer.context.InfluxTicker = InfluxTicker;
replServer.context.Wallet = Wallet;
replServer.context.ExchangeList = ExchangeList;
