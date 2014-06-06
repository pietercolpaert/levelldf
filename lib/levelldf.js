/**
 * LevelLDF can add, delete and read triples from a database. The only query mechanism is a triplePattern, which can also return the count of the triples requested.
 * @author Pieter Colpaert <pieter.colpaert@okfn.org>
 */
var n3 = require("n3"),
    levelgraph = require("levelgraph"),
    newtripletransform = require('./newtripletransform.js'),
    counttriples = require('./counttriples.js'),
    redis = require("redis");

function LevelLDF (dbname, config) {
  if(!config){
    config = {
      "disjointadditions" : false,
      "counts" : false
    };
  }
  this._config = config;
  this._dbname = dbname;
  this._db = levelgraph(this._dbname);
}

LevelLDF.prototype = {

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


  get : function (pattern, callback) {
    this._get(pattern, callback);
  }

  /**
   * Returns a writestream on which triples can be put
   */
  putStream : function () {
    // store counts
    this._counts = redis.createClient();

    var countTripleStream = new counttriples(this._counts);

    //var writestream = new newtripletransform(this._db);
    //writestream.pipe(countTripleStream);
    countTripleStream.pipe(this._db.putStream());
    countTripleStream.on("end", function (error) {
      this._counts.quit();
    });
    //return writestream;
    return countTripleStream;

  },

  /**
   * Returns a writestream on which triple strings in N3 serialization can be put
   */
  putN3Stream : function () {
    var transform = n3.StreamParser();
    transform.pipe(this.putStream());
    return transform;
  },

  /**
   * get the count of a triple pattern
   * When the subject is given, count by hand. This is because in our use case, the number of subjects are exploding, but the number of predicates remain equal 
   */
  count : function (triplePattern, callback) {
    if(triplePattern.subject){
      this._db.get(triplePattern, function (err, list) {
        if (list[0]){
          callback(list.length);
        } else {
          callback(0);
        }
      });
    } else {
      this._counts = redis.createClient();
      var pattern = this.hashTP(triplePattern);
      var self = this;
      this._counts.pfcount(pattern, function(error, count) {
        if (count) {
          callback(count);
          self._counts.quit();
        } else if (error) {
          console.error(error);
          callback(0);
          self._counts.quit();
        } else {
          callback(0);
          self._counts.quit();
        }
      });
    }
  }
}

module.exports = LevelLDF;