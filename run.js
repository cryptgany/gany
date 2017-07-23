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
logger.gany_the_bot.detektor = detektor
detektor.restore_snapshot()



prolo = { _id: '5972af30f0ede45c14f6763c',
    exchange: 'BTRX',
    market: 'BTC-QTUM',
    change: 1.3188318649883306,
    time: 10,
    first_ticker: 
     { high: 0.09,
       low: 0.00249999,
       volume: 786.85974311,
       last: 0.00301,
       ask: 0.00307619,
       bid: 0.00303,
       updated: '2017-07-21T05:14:49.977' },
    last_ticker: 
     { high: 0.00515,
       low: 0.00261101,
       volume: 1037.73570249,
       last: 0.00284834,
       ask: 0.00284834,
       bid: 0.00281,
       updated: '2017-07-22T01:49:24.3' } }

this.logger.gany_the_bot.send_signal(bittrex, prolo)