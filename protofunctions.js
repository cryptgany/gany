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
