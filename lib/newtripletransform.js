/**
 * TempDB uses leveldb to store all graphs that are not contained in another db
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
      callback(undefined);
    } else {
      callback(triple);
    }
  });
};

module.exports = NewTripleTransform;