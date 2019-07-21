require('dotenv').config();
const repl = require('repl');
require('./src/config');

const Alert = require('./src/models/alert.js')
const Payment = require('./src/models/payment.js')
const Signal = require('./src/models/signal.js')
const Subscriber = require('./src/models/subscriber.js')
const Ticker = require('./src/models/ticker.js')
const TickerData = require('./src/models/ticker_data.js')
const IPNServer = require('./src/ipn-server.js')

const ExchangeList = require('./src/exchange_list')

var replServer = repl.start({})

replServer.context.Alert = Alert;
replServer.context.Payment = Payment;
replServer.context.Signal = Signal;
replServer.context.Subscriber = Subscriber;
replServer.context.Ticker = Ticker;
replServer.context.TickerData = TickerData;
replServer.context.ExchangeList = ExchangeList;
replServer.context.IPNServer = IPNServer;
