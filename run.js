// Config vars
require('dotenv').config();

// Constants
const PumpHandler = require('./pump_handler.js');
const Detektor = require('./detektor');
const EventEmitter = require('events');
const Logger = require('./logger');
const Database = require('./database')
const Bittrex = require('./exchanges/bittrex');
const Yobit = require('./exchanges/yobit');
const Poloniex = require('./exchanges/poloniex');
const Cryptopia = require("./exchanges/cryptopia");
const Wallet = require("./wallet")
const Payment = require("./models/payment")
const GanyTheBot = require('./gany_the_bot')

// Initializers
class PumpEvents extends EventEmitter {}
var pump_events = new PumpEvents();
var logger = new Logger();
var gany_the_bot = new GanyTheBot(logger)
var bittrex = new Bittrex(logger, pump_events);
var yobit = new Yobit(logger, pump_events);
var poloniex = new Poloniex(logger, pump_events);
var cryptopia = new Cryptopia(logger, pump_events);
var database = new Database();
var wallet = new Wallet(logger, gany_the_bot);

// Start
pump_events.setMaxListeners(50) // max 50 listeners
wallet.track_subscriptions()
gany_the_bot.start()
bittrex.watch()
yobit.watch()
poloniex.watch()
cryptopia.watch()
Payment.process_payments()

rules = {
  "Bittrex": [ (first_ticker, last_ticker, matcher) => { return matcher.volume_change(first_ticker, last_ticker) > 1.3 } ],
  "Poloniex": [ (first_ticker, last_ticker, matcher) => { return matcher.volume_change(first_ticker, last_ticker) > 1.3 } ],
  "Cryptopia": [ (first_ticker, last_ticker, matcher) => { return matcher.volume_change(first_ticker, last_ticker) > 1.25 } ],
  "Yobit": [
            (first_ticker, last_ticker, matcher) => { return (last_ticker.volume > 0.5 && matcher.volume_change(first_ticker, last_ticker) > 1.25) },
            (first_ticker, last_ticker, matcher) => { return (last_ticker.volume < 0.5 && matcher.volume_change(first_ticker, last_ticker) > 2) && matcher.bid_change(first_ticker, last_ticker) > 1.25 }
          ]
}

detektor = new Detektor(logger, gany_the_bot, pump_events, database, {Bittrex: bittrex, Yobit: yobit, Poloniex: poloniex, Cryptopia: cryptopia}, rules)
gany_the_bot.detektor = detektor
detektor.restore_snapshot()
