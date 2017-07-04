Array.prototype.sum = function() {
  return this.reduce(function(sum, e) { return sum+e; });
}

Array.prototype.first = function() {
  return this[0];
}

Array.prototype.last = function() {
  return this[this.length-1];
}
