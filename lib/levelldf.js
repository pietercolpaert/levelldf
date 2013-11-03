/**
 * LevelLDF can add, delete and read triples from a database. The only query mechanism is a BGP, which can also return the count of the triples requested.
 *
 * @author Pieter Colpaert <pieter.colpaert@okfn.org>
 */
var n3 = require("n3"),
    levelup = require('level'),
    levelgraph = require("levelgraph"),
    frequency = require('./frequencywriter.js'),
    newtripletransform = require('./newtripletransform.js');

function LevelLDF (dbname) {
  this._dbname = dbname;
  this._db = levelgraph(levelup(this._dbname));
  // Hide this directory as it should not be included in e.g. a git or R&Wbase repository
  this._counts = new frequency("." + this._dbname + "counts");
  // Create a temporal db which will be transformed towards counts afterwards
  this._tmp = levelgraph(levelup(".tmp"));
  //TODO: check whether counts actually contain counts, otherwise, start counting the levelgraph
}

LevelLDF.prototype = {

  /**
   * A stream which can be filtered with a BGP. Use an empty BGP to get a stream of all triples.
   */
  getStream : function (bgp) {
    return this._db.getStream(bgp);
  },

  /**
   * Returns a writestream on which triples can be put
   */
  putStream : function () {
    // store counts
    this._counts.pipe(this._db.putStream());
    var newtriplestream = new newtripletransform(this._db);
//    newtriplestream.pipe(this._counts);
//    return newtriplestream;
    return this._counts;
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
  count : function (bgp, callback) {
    this._counts.get(bgp, function (value, err) {
      if(!err)
        callback(value);
      else{
        throw "Could not retrieve count " + err;
      }
    });
  },

  recount : function () {
    this._counts.recount(this._db);
  }
}

module.exports = LevelLDF;