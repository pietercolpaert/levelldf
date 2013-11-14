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

NewTripleTransform.prototype._transform = function (triple, encoding, callback) {
  this._db.get(triple, function (err, list ){
    if (list[0]) {
      callback();
    } else {
      callback(undefined,triple);
    }
  });
};

module.exports = NewTripleTransform;