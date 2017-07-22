Matcher = {}
Matcher.volume_change = function(first_ticker, last_ticker) { return last_ticker.volume / first_ticker.volume }

module.exports = Matcher;
