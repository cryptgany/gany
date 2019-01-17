// Config vars
require('dotenv').config();

// Constants
const PumpHandler = require('./pump_handler.js');
const Detektor = require('./detektor');
const EventEmitter = require('events');
const Logger = require('./logger');
const Database = require('./database')
const Payment = require("./models/payment")
const GanyTheBot = require('./gany_the_bot')
const ExchangeList = require('./exchange_list')

// Initializers
class PumpEvents extends EventEmitter {}
var pump_events = new PumpEvents();
var logger = new Logger();
var gany_the_bot = new GanyTheBot(logger)
var bittrex = new ExchangeList.Bittrex(logger, pump_events);
var yobit = new ExchangeList.Yobit(logger, pump_events);
var poloniex = new ExchangeList.Poloniex(logger, pump_events);
var cryptopia = new ExchangeList.Cryptopia(logger, pump_events);
let kraken = new ExchangeList.Kraken(logger, pump_events);
let binance = new ExchangeList.Binance(logger, pump_events);
let etherDelta = new ExchangeList.EtherDelta(logger, pump_events);
let kucoin = new ExchangeList.Kucoin(logger, pump_events);
let coin_exchange = new ExchangeList.CoinExchange(logger, pump_events);
let huobi = new ExchangeList.Huobi(logger, pump_events);
let idex = new ExchangeList.IDEX(logger, pump_events);
let bitfinex = new ExchangeList.Bitfinex(logger, pump_events);
var database = new Database();

// Start
pump_events.setMaxListeners(50) // max 50 listeners
gany_the_bot.start()
bittrex.watch()
binance.watch()
if (process.env.ENVIRONMENT == 'production' || process.env.ENVIRONMENT == 'testing') {
  setTimeout(() => {
    yobit.watch()
    poloniex.watch()
    cryptopia.watch()
    kraken.watch()
    etherDelta.watch()
    kucoin.watch()
    coin_exchange.watch()
    huobi.watch()
    idex.watch()
    bitfinex.watch()
  }, 5000)
}
Payment.setupIPNServer()
gany_the_bot.expire_expired_users()

rules = {
  "Bittrex": [
    (first_ticker, last_ticker, time, matcher) => { return matcher.volume_change(first_ticker, last_ticker) > 1.3 },
    (first_ticker, last_ticker, time, matcher) => { return matcher.volume_change(first_ticker, last_ticker) > 1.125 && matcher.last_change(first_ticker, last_ticker) > 1.05 }
  ],
  "Poloniex": [ (first_ticker, last_ticker, time, matcher) => { return matcher.volume_change(first_ticker, last_ticker) > 1.3 } ],
  "Cryptopia": [ (first_ticker, last_ticker, time, matcher) => { return matcher.volume_change(first_ticker, last_ticker) > 1.25 } ],
  "Yobit": [
    (first_ticker, last_ticker, time, matcher) => { return (last_ticker.volume > 0.5 && matcher.volume_change(first_ticker, last_ticker) > 1.25) },
    (first_ticker, last_ticker, time, matcher) => { return (last_ticker.volume < 0.5 && matcher.volume_change(first_ticker, last_ticker) > 2) && matcher.bid_change(first_ticker, last_ticker) > 1.25 }
  ],
  "Kraken": [
    (first_ticker, last_ticker, time, matcher) => { return matcher.volume_change(first_ticker, last_ticker) > 1.15 },
    (first_ticker, last_ticker, time, matcher) => { return matcher.last_change(first_ticker, last_ticker) > 1.05 && matcher.volume_change(first_ticker, last_ticker) > 1.075 },
  ],
  "Binance": [
    (first_ticker, last_ticker, time, matcher) => { return matcher.volume_change(first_ticker, last_ticker) > 1.125 },
    (first_ticker, last_ticker, time, matcher) => { return (time <= 5 * 60) && matcher.volume_change(first_ticker, last_ticker) > 1.05 && matcher.last_change(first_ticker, last_ticker) > 1.05 },
    (first_ticker, last_ticker, time, matcher) => { return (time <= 10 * 60) && matcher.volume_change(first_ticker, last_ticker) > 1.05 }
  ],
  "EtherDelta": [
    (first_ticker, last_ticker, time, matcher) => { return (time <= 20 * 60) && matcher.volume_change(first_ticker, last_ticker) > 1.35 }
  ],
  "Kucoin": [
    (first_ticker, last_ticker, time, matcher) => { return matcher.volume_change(first_ticker, last_ticker) > 1.25 }
  ],
  "CoinExchange": [
    (first_ticker, last_ticker, time, matcher) => { return (time <= 20 * 60) && matcher.volume_change(first_ticker, last_ticker) > 1.25 }
  ],
  "Huobi": [
    (first_ticker, last_ticker, time, matcher) => { return (time <= 20 * 60) && matcher.volume_change(first_ticker, last_ticker) >= 1.08 }
  ],
  "IDEX": [
    (first_ticker, last_ticker, time, matcher) => { return matcher.volume_change(first_ticker, last_ticker) > 1.10 && matcher.last_change(first_ticker, last_ticker) > 1.025 }
  ],
  "Bitfinex": [
    (first_ticker, last_ticker, time, matcher) => { return (time <= 30 * 60) && matcher.volume_change(first_ticker, last_ticker) >= 1.10 }
  ],
}

setInterval(() => { detektor.ticker_handler.storeMinuteDataOnInflux() }, 60 * 1000)

detektor = new Detektor(logger, gany_the_bot, pump_events, database, rules)
gany_the_bot.detektor = detektor
detektor.restore_snapshot()
