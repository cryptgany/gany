// Config vars
require('dotenv').config();

// Constants
const PumpHandler = require('./pump_handler.js');
const Detektor = require('./detektor');
const EventEmitter = require('events');
const Logger = require('./logger');
const Database = require('./database')
const Bittrex = require('./bittrex');
const Yobit = require('./yobit');
const Poloniex = require('./poloniex');
const Cryptopia = require("./cryptopia");

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
detektor = new Detektor(logger, pump_events, test_mode, database, {BTRX: bittrex, YOBT: yobit, POLO: poloniex, CPIA: cryptopia})
detektor.restore_tickers_history()