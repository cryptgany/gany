require('dotenv').config();
const repl = require('repl');
require('./config');

const Alert = require('./models/alert.js')
const Payment = require('./models/payment.js')
const Signal = require('./models/signal.js')
const Subscriber = require('./models/subscriber.js')
const Ticker = require('./models/ticker.js')
const TickerData = require('./models/ticker_data.js')
const IPNServer = require('./ipn-server.js')

const ExchangeList = require('./exchange_list')

var replServer = repl.start({})

replServer.context.Alert = Alert;
replServer.context.Payment = Payment;
replServer.context.Signal = Signal;
replServer.context.Subscriber = Subscriber;
replServer.context.Ticker = Ticker;
replServer.context.TickerData = TickerData;
replServer.context.ExchangeList = ExchangeList;
replServer.context.IPNServer = IPNServer;
