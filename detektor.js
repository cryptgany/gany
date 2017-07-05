// Detector Lib in NodeJS

// REQUIRED LIBS
require('dotenv').config();

var bittrex = require('node.bittrex.api');

const Logger = require('./logger');

var logger = new Logger('Detektor')

require('./protofunctions.js');
require('./klient.js');

var fs = require('fs');
var util = require('util');
var log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'w'});
var log_stdout = process.stdout;

log_to_file = function(d) { //
  log_file.write(util.format(d) + '\n');
};

bittrex.options({
  'apikey' : process.env.KEY,
  'apisecret' : process.env.SECRET,
  'stream' : false, // will be removed from future versions
  'verbose' : false,
  'cleartext' : false 
});

const PumpHandler = require('./pump_handler.js');
const EventEmitter = require('events');

class PumpEvents extends EventEmitter {}

// var pumpHandler = new PumpHandler(pumpEvents, 'BTC-ANS', 0.3, 0.00292989);



// REAL CODING

app = {}
app.pumps_bought = [];
app.pumpEvents = new PumpEvents();
app.pumps = [];
app.count = 0;

function analyze_trade(e) {
  result = false
  if (e.Fills.length > 0) {
    buys = e.Fills.filter(function(e) { return e.OrderType == 'BUY'; });
    buy_amount = buys.length == 0 ? 0 : buys.map(function(e) { return e.Quantity * e.Rate; }).sum();
    first_fill = e.Fills.last();
    last_fill = e.Fills.first();
    change = last_fill.Rate / first_fill.Rate;
    if ( (change > 1.05) && (buys.length > 50 || buy_amount > 5) )
      result = true;
  }
  if (result) {
    app.count += 1;
    if (app.count > 3) {
      logger.log("PUMP DETECTED ON " + e.MarketName + " BUT ALREADY REACHED MAX BUY/SELLS")
    } else {
      if (app.pumps_bought[e.MarketName] == undefined) {
        // get ticker info and make BUY order
        last_fill = e.Fills.first();
        logger.log("PUMP DETECTED ON " + e.MarketName + " => STARTING PUMP HANDLER, LAST PRICE WAS " + last_fill.Rate);
        first_ask = last_fill.Rate;
        btc_amount = 0.1; // BTC AMOUNT
        // rate = (first_ask * 1.05); // RATE (+) TO BUY ORDER
        rate = first_ask; // RATE (+) TO BUY ORDER
        quantity = btc_amount / rate;
        app.pumps_bought[e.MarketName] = true;
        var pump = new PumpHandler(app.pumpEvents, e.MarketName, quantity, rate); // COMMENT THIS LINE FOR REAL TESTING
        pump.start();
        app.pumps.push(pump); // later review
      } else {
        logger.log("PUMP detected on " + e.MarketName + " but already started pump handler");
      }
      sells = e.Fills.filter(function(e) { return e.OrderType == 'SELL'; });
      sell_amount = sells.length == 0 ? 0 : sells.map(function(e) { return e.Quantity * e.Rate; }).reduce(function(sum, e) { return sum+e; });
      winner = buys > sells ? " WINNER: buys" : " WINNER: sells";
      logger.log("[" + e.MarketName + "] " + " [CHANGE: " + change + "]" + "[OPEN " + first_fill.TimeStamp + " " + first_fill.Rate + "] [CLOSE " + last_fill.TimeStamp + " " + last_fill.Rate + "] buy amount: " + buys.length + " (" + buy_amount.toFixed(4) + " BTC), sell amount: " + sells.length + "(" + sell_amount.toFixed(4) + " BTC)" + winner);

    }
  }
}

// LISTENERS
// Listen information about orders
markets = ["BTC-1ST", "BTC-2GIVE", "BTC-ABY", "BTC-ADT", "BTC-AEON", "BTC-AGRS", "BTC-AMP", "BTC-ANS", "BTC-ANT", "BTC-APX", "BTC-ARDR", "BTC-ARK", "BTC-AUR", "BTC-BAT", "BTC-BAY", "BTC-BCY", "BTC-BITB", "BTC-BLITZ", "BTC-BLK", "BTC-BLOCK", "BTC-BNT", "BTC-BRK", "BTC-BRX", "BTC-BSD", "BTC-BTA", "BTC-BTCD", "BTC-BTS", "BTC-BURST", "BTC-BYC", "BTC-CANN", "BTC-CFI", "BTC-CLAM", "BTC-CLOAK", "BTC-CLUB", "BTC-COVAL", "BTC-CPC", "BTC-CRB", "BTC-CRW", "BTC-CURE", "BTC-DAR", "BTC-DASH", "BTC-DCR", "BTC-DCT", "BTC-DGB", "BTC-DGD", "BTC-DMD", "BTC-DOGE", "BTC-DOPE", "BTC-DRACO", "BTC-DTB", "BTC-DYN", "BTC-EBST", "BTC-EDG", "BTC-EFL", "BTC-EGC", "BTC-EMC", "BTC-EMC2", "BTC-ENRG", "BTC-ERC", "BTC-ETC", "BTC-ETH", "BTC-EXCL", "BTC-EXP", "BTC-FAIR", "BTC-FCT", "BTC-FLDC", "BTC-FLO", "BTC-FTC", "BTC-GAM", "BTC-GAME", "BTC-GBG", "BTC-GBYTE", "BTC-GCR", "BTC-GEO", "BTC-GLD", "BTC-GNO", "BTC-GNT", "BTC-GOLOS", "BTC-GRC", "BTC-GRS", "BTC-GUP", "BTC-HKG", "BTC-HMQ", "BTC-INCNT", "BTC-INFX", "BTC-IOC", "BTC-ION", "BTC-IOP", "BTC-KMD", "BTC-KORE", "BTC-LBC", "BTC-LGD", "BTC-LMC", "BTC-LSK", "BTC-LTC", "BTC-LUN", "BTC-MAID", "BTC-MCO", "BTC-MEME", "BTC-MLN", "BTC-MONA", "BTC-MUE", "BTC-MUSIC", "BTC-MYR", "BTC-MYST", "BTC-NAUT", "BTC-NAV", "BTC-NBT", "BTC-NEOS", "BTC-NLG", "BTC-NMR", "BTC-NXC", "BTC-NXS", "BTC-NXT", "BTC-OK", "BTC-OMNI", "BTC-PDC", "BTC-PINK", "BTC-PIVX", "BTC-PKB", "BTC-POT", "BTC-PPC", "BTC-PTC", "BTC-PTOY", "BTC-QRL", "BTC-QWARK", "BTC-RADS", "BTC-RBY", "BTC-RDD", "BTC-REP", "BTC-RISE", "BTC-RLC", "BTC-SBD", "BTC-SC", "BTC-SEC", "BTC-SEQ", "BTC-SHIFT", "BTC-SIB", "BTC-SJCX", "BTC-SLR", "BTC-SLS", "BTC-SNGLS", "BTC-SNRG", "BTC-SNT", "BTC-SPHR", "BTC-SPR", "BTC-START", "BTC-STEEM", "BTC-STRAT", "BTC-SWIFT", "BTC-SWT", "BTC-SYNX", "BTC-SYS", "BTC-THC", "BTC-TIME", "BTC-TKN", "BTC-TKS", "BTC-TRIG", "BTC-TRST", "BTC-TRUST", "BTC-TX", "BTC-UBQ", "BTC-UNB", "BTC-UNO", "BTC-VIA", "BTC-VOX", "BTC-VRC", "BTC-VRM", "BTC-VTC", "BTC-VTR", "BTC-WAVES", "BTC-WINGS", "BTC-XAUR", "BTC-XBB", "BTC-XCP", "BTC-XDN", "BTC-XEL", "BTC-XEM", "BTC-XLM", "BTC-XMG", "BTC-XMR", "BTC-XRP", "BTC-XST", "BTC-XVC", "BTC-XVG", "BTC-XWC", "BTC-XZC", "BTC-ZCL", "BTC-ZEC", "BTC-ZEN", "BTC-FUN"];
// markets = ["BTC-ANS", "BTC-DGB", "BTC-SC", "BTC-SNT"];
bittrex.websockets.subscribe(markets, function(data) {
  if (data.M === 'updateExchangeState') {
    data.A.forEach(function(data_for) {
      log_to_file(JSON.stringify(data_for));
      analyze_trade(data_for);
    });
  }
});
