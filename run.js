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

// Initializers
class PumpEvents extends EventEmitter {}
var pump_events = new PumpEvents();
var test_mode = false;
var logger = new Logger(true, test_mode);
var bittrex = new Bittrex(pump_events);
var yobit = new Yobit(pump_events);
var poloniex = new Poloniex(pump_events);
var cryptopia = new Cryptopia(pump_events);
var database = new Database();

// Start
pump_events.setMaxListeners(50) // max 50 listeners
bittrex.watch()
yobit.watch()
poloniex.watch()
cryptopia.watch()

rules = {
  "BTRX": [ (first_ticker, last_ticker, matcher) => { return matcher.volume_change(first_ticker, last_ticker) > 1.3 } ],
  "POLO": [ (first_ticker, last_ticker, matcher) => { return matcher.volume_change(first_ticker, last_ticker) > 1.3 } ],
  "CPIA": [ (first_ticker, last_ticker, matcher) => { return matcher.volume_change(first_ticker, last_ticker) > 1.25 } ],
  "YOBT": [
            (first_ticker, last_ticker, matcher) => { return (last_ticker.volume > 0.5 && matcher.volume_change(first_ticker, last_ticker) > 1.25) },
            (first_ticker, last_ticker, matcher) => { return (last_ticker.volume < 0.5 && matcher.volume_change(first_ticker, last_ticker) > 2) && matcher.bid_change(first_ticker, last_ticker) > 1.25 }
          ]
}

detektor = new Detektor(logger, pump_events, test_mode, database, {BTRX: bittrex, YOBT: yobit, POLO: poloniex, CPIA: cryptopia}, rules)
detektor.restore_snapshot()
