/**
 * LevelLDF can add, delete and read triples from a database. The only query mechanism is a triplePattern, which can also return the count of the triples requested.
 *
 * @author Pieter Colpaert <pieter.colpaert@okfn.org>
 */
var n3 = require("n3"),
    levelup = require('level'),
    levelgraph = require("levelgraph"),
    newtripletransform = require('./newtripletransform.js')
    redis = require("redis");
function LevelLDF (dbname) {
  this._dbname = dbname;
  this._db = levelgraph(levelup(this._dbname));
}

LevelLDF.prototype = {
  _generateTPArrayFromTriple : function (triple){
    return [
      {},
      {
        subject : triple.subject
      },
      {
        predicate : triple.predicate
      },
      {
        object : triple.object
      },
      {
        predicate : triple.predicate,
        object : triple.object
      },
      {
        subject : triple.subject,
        object : triple.object
      },
      {
        subject : triple.subject,
        predicate : triple.predicate
      },
      {
        subject : triple.subject,
        predicate : triple.predicate,
        object : triple.object
      }
    ]; 
  },


  /**
   * A stream which can be filtered with a triplePattern. Use an empty triplePattern to get a stream of all triples.
   */
  getStream : function (triplePattern) {
    return this._db.getStream(triplePattern);
  },

  /**
   * Creates a hash for a triple pattern which can be used as a key for the count table
   */
  hashTP : function (tp) {
    return (tp.subject || "?s") + (tp.predicate || "?p") + (tp.object || "?o");
  },

  /**
   * Returns a writestream on which triples can be put
   */
  putStream : function () {
    // store counts
    this._counts = redis.createClient();
    var writestream = new newtripletransform(this._db);
    writestream.pipe(this._db.putStream());
    var self = this;
    writestream.on("data", function (triple) {
      if(triple){
        var tp = self._generateTPArrayFromTriple(triple);
        tp.forEach( function (pattern) {
          self._counts.incr(self.hashTP(pattern));
        });
      }
    });
    writestream.on("end", function () {
      self._counts.quit();
    });
    return writestream;
  },

  /**
   * Returns a writestream on which triple strings in N3 serialization can be put
   */
  putN3Stream : function () {
    var transform = new n3.Transform();
    transform.pipe(this.putStream());
    return transform;
  },

  /**
   * get the triple count of a basic graph pattern
   */
  count : function (triplePattern, callback) {
    this._counts = redis.createClient();
    var pattern = this.hashTP(triplePattern);
    var self = this;
    this._counts.get(pattern, function(error, count) {
      if (count) {
        callback(count);
        self._counts.quit();
      }
    });
  }
}

module.exports = LevelLDF;