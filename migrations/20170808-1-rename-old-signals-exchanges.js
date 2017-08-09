// because we stored exchanges as CODES (BTRX, YOBT, etc)
const Signal = require('./models/signal')

exchanges = {
  BTRX: "Bittrex",
  YOBT: "Yobit",
  POLO: "Poloniex",
  CPIA: "Cryptopia"
}

Signal.find({}, function(err, signals) {
  if (err) throw err;
  signals.forEach((signal) => {
    if (exchanges[signal.exchange]) {
      signal.exchange = exchanges[signal.exchange]
      signal.save()
    }
  })
});
