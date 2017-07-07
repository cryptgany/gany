// Config vars
require('dotenv').config();

// Constants
const Detektor = require('./detektor');
const EventEmitter = require('events');
const Logger = require('./logger');
require('./klient');

// Initializers
class PumpEvents extends EventEmitter {}
var pump_events = new PumpEvents();
var logger = new Logger(true, false);

// API
var api = require('node.bittrex.api');
api.options({
  'apikey' : process.env.KEY,
  'apisecret' : process.env.SECRET,
  'stream' : false, // will be removed from future versions
  'verbose' : false,
  'cleartext' : false 
});


markets = ["BTC-1ST", "BTC-2GIVE", "BTC-ABY", "BTC-ADT", "BTC-AEON", "BTC-AGRS", "BTC-AMP", "BTC-ANS", "BTC-ANT", "BTC-APX", "BTC-ARDR", "BTC-ARK", "BTC-AUR", "BTC-BAT", "BTC-BAY", "BTC-BCY", "BTC-BITB", "BTC-BLITZ", "BTC-BLK", "BTC-BLOCK", "BTC-BNT", "BTC-BRK", "BTC-BRX", "BTC-BSD", "BTC-BTA", "BTC-BTCD", "BTC-BTS", "BTC-BURST", "BTC-BYC", "BTC-CANN", "BTC-CFI", "BTC-CLAM", "BTC-CLOAK", "BTC-CLUB", "BTC-COVAL", "BTC-CPC", "BTC-CRB", "BTC-CRW", "BTC-CURE", "BTC-DAR", "BTC-DASH", "BTC-DCR", "BTC-DCT", "BTC-DGB", "BTC-DGD", "BTC-DMD", "BTC-DOGE", "BTC-DOPE", "BTC-DRACO", "BTC-DTB", "BTC-DYN", "BTC-EBST", "BTC-EDG", "BTC-EFL", "BTC-EGC", "BTC-EMC", "BTC-EMC2", "BTC-ENRG", "BTC-ERC", "BTC-ETC", "BTC-ETH", "BTC-EXCL", "BTC-EXP", "BTC-FAIR", "BTC-FCT", "BTC-FLDC", "BTC-FLO", "BTC-FTC", "BTC-GAM", "BTC-GAME", "BTC-GBG", "BTC-GBYTE", "BTC-GCR", "BTC-GEO", "BTC-GLD", "BTC-GNO", "BTC-GNT", "BTC-GOLOS", "BTC-GRC", "BTC-GRS", "BTC-GUP", "BTC-HKG", "BTC-HMQ", "BTC-INCNT", "BTC-INFX", "BTC-IOC", "BTC-ION", "BTC-IOP", "BTC-KMD", "BTC-KORE", "BTC-LBC", "BTC-LGD", "BTC-LMC", "BTC-LSK", "BTC-LTC", "BTC-LUN", "BTC-MAID", "BTC-MCO", "BTC-MEME", "BTC-MLN", "BTC-MONA", "BTC-MUE", "BTC-MUSIC", "BTC-MYR", "BTC-MYST", "BTC-NAUT", "BTC-NAV", "BTC-NBT", "BTC-NEOS", "BTC-NLG", "BTC-NMR", "BTC-NXC", "BTC-NXS", "BTC-NXT", "BTC-OK", "BTC-OMNI", "BTC-PDC", "BTC-PINK", "BTC-PIVX", "BTC-PKB", "BTC-POT", "BTC-PPC", "BTC-PTC", "BTC-PTOY", "BTC-QRL", "BTC-QWARK", "BTC-RADS", "BTC-RBY", "BTC-RDD", "BTC-REP", "BTC-RISE", "BTC-RLC", "BTC-SBD", "BTC-SC", "BTC-SEC", "BTC-SEQ", "BTC-SHIFT", "BTC-SIB", "BTC-SJCX", "BTC-SLR", "BTC-SLS", "BTC-SNGLS", "BTC-SNRG", "BTC-SNT", "BTC-SPHR", "BTC-SPR", "BTC-START", "BTC-STEEM", "BTC-STRAT", "BTC-SWIFT", "BTC-SWT", "BTC-SYNX", "BTC-SYS", "BTC-THC", "BTC-TIME", "BTC-TKN", "BTC-TKS", "BTC-TRIG", "BTC-TRST", "BTC-TRUST", "BTC-TX", "BTC-UBQ", "BTC-UNB", "BTC-UNO", "BTC-VIA", "BTC-VOX", "BTC-VRC", "BTC-VRM", "BTC-VTC", "BTC-VTR", "BTC-WAVES", "BTC-WINGS", "BTC-XAUR", "BTC-XBB", "BTC-XCP", "BTC-XDN", "BTC-XEL", "BTC-XEM", "BTC-XLM", "BTC-XMG", "BTC-XMR", "BTC-XRP", "BTC-XST", "BTC-XVC", "BTC-XVG", "BTC-XWC", "BTC-XZC", "BTC-ZCL", "BTC-ZEC", "BTC-ZEN", "BTC-FUN"];

detektor = new Detektor(logger, api, markets, pump_events);

detektor.start();
