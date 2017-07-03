// Detector Lib in NodeJS

var bittrex = require('node.bittrex.api');
var datetime = require('node-datetime');

var fs = require('fs');
var util = require('util');
var log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'w'});
var log_stdout = process.stdout;

log_to_file = function(d) { //
  log_file.write(util.format(d) + '\n');
};



Array.prototype.last = function() {
  return this[this.length-1];
}

bittrex.options({
  'apikey' : '1234',
  'apisecret' : '1234', 
  'stream' : true, // will be removed from future versions 
  'verbose' : true,
  'cleartext' : false 
});


// bittrex.websockets.listen( function( data ) {
//   if (data.M === 'updateSummaryState') {
//     data.A.forEach(function(data_for) {
//       data_for.Deltas.forEach(function(marketsDelta) {
//         // console.log('Ticker Update for '+ marketsDelta.MarketName, marketsDelta);
//       });
//       last = datetime.create();
//       console.log("TIME: " + last.now() + " VS " + start.now());
//       start = datetime.create();
//     });
//   }
// });

// bittrex.getmarketsummaries( function( data ) {
//   var markets = [];
//   for( var i in data.result ) {
//     if (data.result[i].MarketName.match(/^BTC/)) {
//       markets << data.result[i].MarketName; 
//     }
//   }
//   console.log(markets);
// });
// {"MarketName":"BTC-BAT","Nounce":82044,"Buys":[],"Sells":[{"Type":2,"Rate":0.00004749,"Quantity":487.16940985},{"Type":0,"Rate":0.00004993,"Quantity":313.74794816},{"Type":0,"Rate":0.00004994,"Quantity":310.946847}],"Fills":[{"OrderType":"BUY","Rate":0.00004749,"Quantity":31.55237695,"TimeStamp":"2017-07-02T21:01:33.513"},{"OrderType":"BUY","Rate":0.00004749,"Quantity":52.58729491,"TimeStamp":"2017-07-02T21:01:33.14"}]}


function analyze_and_print(e) {
  result = false
  if (e.Fills.length > 0) {
    buys = e.Fills.filter(function(e) { return e.OrderType == 'BUY'; });
    buy_amount = buys.length == 0 ? 0 : buys.map(function(e) { return e.Quantity * e.Rate; }).reduce(function(sum, e) { return sum+e; });

    if (buys.length > 50)
      result = true;

    if (buy_amount > 5)
      result = true;

  } else {
    result = false;
  }
  if (result) {
    buys = e.Fills.filter(function(e) { return e.OrderType == 'BUY'; });
    buy_amount = buys.length == 0 ? 0 : buys.map(function(e) { return e.Quantity * e.Rate; }).reduce(function(sum, e) { return sum+e; });
    sells = e.Fills.filter(function(e) { return e.OrderType == 'SELL'; });
    sell_amount = sells.length == 0 ? 0 : sells.map(function(e) { return e.Quantity * e.Rate; }).reduce(function(sum, e) { return sum+e; });
    first_fill = e.Fills.last();
    last_fill = e.Fills[0];
    winner = buys > sells ? " WINNER: buys" : " WINNER: sells";
    console.log("[" + e.MarketName + "] " + "[OPEN " + first_fill.TimeStamp + " " + first_fill.Rate + "] [CLOSE " + last_fill.TimeStamp + " " + last_fill.Rate + "] buy amount: " + buys.length + " (" + buy_amount.toFixed(4) + " BTC), sell amount: " + sells.length + "(" + sell_amount.toFixed(4) + " BTC)" + winner);
  }
}

markets = ["BTC-1ST", "BTC-2GIVE", "BTC-8BIT", "BTC-ABY", "BTC-AEON", "BTC-AGRS", "BTC-AMP", "BTC-ANS", "BTC-ANT", "BTC-APX", "BTC-ARDR", "BTC-ARK", "BTC-AUR", "BTC-BAT", "BTC-BAY", "BTC-BCY", "BTC-BITB", "BTC-BLITZ", "BTC-BLK", "BTC-BLOCK", "BTC-BNT", "BTC-BRK", "BTC-BRX", "BTC-BSD", "BTC-BTA", "BTC-BTCD", "BTC-BTS", "BTC-BURST", "BTC-BYC", "BTC-CANN", "BTC-CFI", "BTC-CLAM", "BTC-CLOAK", "BTC-CLUB", "BTC-COVAL", "BTC-CPC", "BTC-CRB", "BTC-CRW", "BTC-CURE", "BTC-DAR", "BTC-DASH", "BTC-DCR", "BTC-DGB", "BTC-DGD", "BTC-DMD", "BTC-DOGE", "BTC-DOPE", "BTC-DRACO", "BTC-DTB", "BTC-DYN", "BTC-EBST", "BTC-EDG", "BTC-EFL", "BTC-EGC", "BTC-EMC", "BTC-EMC2", "BTC-ENRG", "BTC-ERC", "BTC-ETC", "BTC-ETH", "BTC-EXCL", "BTC-EXP", "BTC-FAIR", "BTC-FCT", "BTC-FLDC", "BTC-FLO", "BTC-FTC", "BTC-GAM", "BTC-GAME", "BTC-GBG", "BTC-GBYTE", "BTC-GCR", "BTC-GEO", "BTC-GLD", "BTC-GNO", "BTC-GNT", "BTC-GOLOS", "BTC-GRC", "BTC-GRS", "BTC-GUP", "BTC-HKG", "BTC-HMQ", "BTC-INCNT", "BTC-INFX", "BTC-IOC", "BTC-ION", "BTC-IOP", "BTC-KMD", "BTC-KORE", "BTC-LBC", "BTC-LGD", "BTC-LMC", "BTC-LSK", "BTC-LTC", "BTC-LUN", "BTC-MAID", "BTC-MEME", "BTC-MLN", "BTC-MONA", "BTC-MUE", "BTC-MUSIC", "BTC-MYR", "BTC-MYST", "BTC-NAUT", "BTC-NAV", "BTC-NBT", "BTC-NEOS", "BTC-NLG", "BTC-NMR", "BTC-NXC", "BTC-NXS", "BTC-NXT", "BTC-OK", "BTC-OMNI", "BTC-PDC", "BTC-PINK", "BTC-PIVX", "BTC-PKB", "BTC-POT", "BTC-PPC", "BTC-PTC", "BTC-PTOY", "BTC-QRL", "BTC-QTL", "BTC-QWARK", "BTC-RADS", "BTC-RBY", "BTC-RDD", "BTC-REP", "BTC-RISE", "BTC-RLC", "BTC-SBD", "BTC-SC", "BTC-SEC", "BTC-SEQ", "BTC-SHIFT", "BTC-SIB", "BTC-SJCX", "BTC-SLR", "BTC-SLS", "BTC-SNGLS", "BTC-SNRG", "BTC-SNT", "BTC-SPHR", "BTC-SPR", "BTC-START", "BTC-STEEM", "BTC-STRAT", "BTC-SWIFT", "BTC-SWT", "BTC-SYNX", "BTC-SYS", "BTC-THC", "BTC-TIME", "BTC-TKN", "BTC-TKS", "BTC-TRIG", "BTC-TRST", "BTC-TRUST", "BTC-TX", "BTC-UBQ", "BTC-UNB", "BTC-UNO", "BTC-VIA", "BTC-VOX", "BTC-VRC", "BTC-VRM", "BTC-VTC", "BTC-VTR", "BTC-WAVES", "BTC-WINGS", "BTC-XAUR", "BTC-XBB", "BTC-XCP", "BTC-XDN", "BTC-XEM", "BTC-XLM", "BTC-XMG", "BTC-XMR", "BTC-XRP", "BTC-XST", "BTC-XVC", "BTC-XVG", "BTC-XWC", "BTC-XZC", "BTC-ZCL", "BTC-ZEC", "BTC-ZEN", "BTC-XEL", "BTC-MCO"];
bittrex.websockets.subscribe(markets, function(data) {
  if (data.M === 'updateExchangeState') {
    data.A.forEach(function(data_for) {
      log_to_file(JSON.stringify(data_for));
      analyze_and_print(data_for);
    });
  }
});
