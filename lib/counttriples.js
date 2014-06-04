/**
 * NewTripleTransform checks whether the triple already exists and only returns the non existent
 *
 * @author Pieter Colpaert <pieter.colpaert@okfn.org>
 */
var Transform = require('stream').Transform,
    util = require('util');

util.inherits(CountTriples, Transform);

function CountTriples (redis) {
  Transform.call(this, {objectMode : true});
  this._counts = redis;
}

CountTriples.prototype._flush = function () {
}

CountTriples.prototype._hashTP = function (tp) {
  return (tp.subject || "?s") + (tp.predicate || "?p") + (tp.object || "?o");
};


CountTriples.prototype._generateTPArrayFromTriple = function (triple){
  return [
    {},
    {
      predicate : triple.predicate
    },
    {
      object : triple.object
    },
    {
      predicate : triple.predicate,
      object : triple.object
    }
  ];
};

CountTriples.prototype._transform = function (triple, encoding, callback) {
  if (triple) {
    var tp = this._generateTPArrayFromTriple(triple);
    var self = this;
    tp.forEach( function (pattern) {
      self._counts.pfadd(self._hashTP(pattern),triple.subject+triple.predicate+triple.object);
    });
    callback(undefined,triple);
  }
};

module.exports = CountTriples;