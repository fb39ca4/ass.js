InterpolatingBase = function(value) {
  this.value = value;
}

InterpolatingBase.prototype.get = function(t) {
  return this.value;
}

InterpolatingBase.prototype.isConstant = function(t) {
  return true;
}

Interpolating = function(v1, v2, t1, t2, power) {
  this.v1 = (typeof(v1.get) == "function") ? v1 : new InterpolatingBase(v1);
  this.v2 = (typeof(v2.get) == "function") ? v2 : new InterpolatingBase(v2);
  this.t1 = t1;
  this.t2 = t2;
  this.power = power;
}

Interpolating.prototype.get = function(t) {
  if (typeof(t) != "number") t = 0;
  if (this.t1 == this.t2) return (t < this.t1) ? this.v1.get(t) : ((t == this.t1) ? 0.5 * (this.v1.get(t) + this.v2.get(t)) : this.v2.get(t));
  var x = t;
  x -= this.t1;
  x /= this.t2 - this.t1;
  x = Math.min(Math.max(x, 0), 1);
  x = Math.pow(x, this.power);
  return (1 - x) * this.v1.get(t) + x * this.v2.get(t);
}

Interpolating.prototype.isConstant = function(t) {
  return false;
}