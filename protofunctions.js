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
Number.prototype.humanize = function() {
  if (this > 1) { return parseFloat(this.toFixed(2)).toLocaleString() }// 2 decimals max
  return this.toFixed(this.decimalPoints())
}
Number.prototype.decimalPoints = function() {
  let clone = this.toFixed(8)
  if (clone.indexOf('.') == -1)
    return 0
  else {
    while(clone.slice(-1) == 0) // remove trailing 0
      clone = clone.slice(0, -1)
  }
  return clone.split('.')[1].length
}