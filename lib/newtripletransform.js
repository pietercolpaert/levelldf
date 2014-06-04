/**
 * NewTripleTransform checks whether the triple already exists and only returns the non existent
 *
 * @author Pieter Colpaert <pieter.colpaert@okfn.org>
 */
var Transform = require('stream').Transform,
    util = require('util');

util.inherits(NewTripleTransform, Transform);

function NewTripleTransform (db) {
  Transform.call(this, {objectMode : true});
  this._db = db;
}

NewTripleTransform.prototype._flush = function () {
}

NewTripleTransform.prototype._hashTP = function (tp) {
  return (tp.subject || "?s") + (tp.predicate || "?p") + (tp.object || "?o");
};

NewTripleTransform.prototype._transform = function (triple, encoding, callback) {
  this._db.get(this._hashTP(triple), function (err, count){
    if (count > 0) {
      callback();
    } else {
      callback(undefined,triple);
    }
  });
};

module.exports = NewTripleTransform;