Array.prototype.sum = function() {
  return this.reduce(function(sum, e) { return sum+e; });
}

Array.prototype.first = function() {
  return this[0];
}

Array.prototype.last = function() {
  return this[this.length-1];
}

// converts date into an usable string for filename
Date.prototype.toFileName = function() {
  return this.toJSON().replace(/(\-|\:|(\..*[A-Z]))/gi, "");
}

Date.prototype.addMinutes = function(minutes) {
  return new Date(this.getTime() + minutes*60000);
}

Object.defineProperty(Array.prototype, 'chunk', {
    value: function(chunkSize) {
        var R = [];
        for (var i=0; i<this.length; i+=chunkSize)
            R.push(this.slice(i,i+chunkSize));
        return R;
    }
});

/*
/ 1234567.2 = 1,234,567.2
/ 2.234242 = 2.23
/ 0.234234982 = 0.234
/ 0.00000030 = 0.0000003
*/
Number.prototype.humanize = function(options = {}) {
  if (this > 1) { return parseFloat(this.toFixed(2)).toLocaleString('en-US', options) }// 2 decimals max
  if (options.style == 'currency') { return symbolFor(options.currency) + this.toFixed(this.decimalPoints(true)) }
  return this.toFixed(this.decimalPoints(options.significance))
}
Number.prototype.humanizeCurrency = function(currency = 'USD') { return this.humanize({style: 'currency', currency: safeCurrency(currency)})  }
Number.prototype.decimalPoints = function(significance = false) {
  let clone = this.toFixed(8)
  if (clone.indexOf('.') == -1)
    return 0
  else {
    while(clone.slice(-1) == 0) // remove trailing 0
      clone = clone.slice(0, -1)
  }
  if (significance) { // 0.0023233 = 0.0023
    let decimals = this.toFixed(8).split('.')[1]
    if (decimals === '00000000') return 0
    while (decimals.charAt(0) === '0') { decimals = decimals.substring(1); }
    let res = (8 - decimals.length) + 2 // 2 is the significance
    return res > 8 ? 8 : res == 1 ? 2 : res
  } else {
    return clone.split('.')[1].length
  }
}

safeCurrency = function(cur) {
  if (cur == 'USDT') return 'USD'
  if (cur == 'EURT') return 'EUR'
  return cur
}

symbolFor = function(cur = 'USD') {
  if (safeCurrency(cur) == 'USD') return '$'
  if (safeCurrency(cur) == 'EUR') return '€'
  if (safeCurrency(cur) == 'GBP') return '£'
}