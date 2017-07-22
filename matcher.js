Matcher = {}
Matcher.volume_change = function(first_ticker, last_ticker) { return last_ticker.volume / first_ticker.volume }
Matcher.bid_change = function(first_ticker, last_ticker) { return last_ticker.bid / first_ticker.bid }
Matcher.ask_change = function(first_ticker, last_ticker) { return last_ticker.ask / first_ticker.ask }
Matcher.last_change = function(first_ticker, last_ticker) { return last_ticker.last / first_ticker.last }

module.exports = Matcher;
