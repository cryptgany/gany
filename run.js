// Config vars
require('dotenv').config();

// Constants
const Detektor = require('./detektor');
const EventEmitter = require('events');
const Logger = require('./logger');
const Bittrex = require('./bittrex');
const Yobit = require('./yobit');
require('./klient');

// Initializers
class PumpEvents extends EventEmitter {}
var pump_events = new PumpEvents();
var test_mode = false;
var logger = new Logger(true, test_mode);
var bittrex = new Bittrex(pump_events);
var yobit = new Yobit(pump_events);

// Start
bittrex.watch()
yobit.watch()
detektor = new Detektor(logger, pump_events, test_mode, {BTRX: bittrex, YOBT: yobit})
