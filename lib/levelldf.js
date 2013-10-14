/**
 * LevelLDF can add, delete and read triples from a database. The only query mechanism is a BGP, which can also return the count of the triples requested.
 *
 * @author Pieter Colpaert <pieter.colpaert@okfn.org>
 */
var N3Parser = require("n3").Parser,
    levelup = require('level'),
    levelhyper = require('level-hyper'),
    levelgraph = require("levelgraph"),
    crypto = require('crypto'),
    exec = require('child_process').exec,
    through2 = require('through2');

function LevelLDF (dbname) {
  this._dbname = dbname;
  this._db = levelgraph(levelup(this._dbname));
  this._counts = levelup("." + this._dbname + "counts"); //hide this directory as it should not be included in e.g. a git or R&Wbase repository
  //TODO: check whether counts actually contain counts, otherwise, start counting the levelgraph
}

LevelLDF.prototype = {

  _hashBGP : function (bgp) {
    //TODO: Is this needed with leveldb? I was afraid that the key would be too big.
    //TODO: if there are conflicts, we might have a big problem with the counts...
    var hash = (bgp.subject || "?s") + (bgp.predicate || "?p");
    if(bgp.object){
      var sha1 = crypto.createHash('sha1');
      sha1.update(bgp.object);
      hash += sha1.digest("base64");
    }else{
      hash += "?o"
    }
    return hash;
  },

  /**
   * A stream which can be filtered with a BGP. Use an empty BGP to get a stream of all triples.
   */
  getStream : function (bgp) {
    return this._db.getStream(bgp);
  },

  /**
   * Increase 7 BGP counters per triple
   */
  _addCounts : function (triple) {
    //we need to generate 7 bgps
    var bgps = [
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
      {}
    ]
    var self = this;
    // this piece of code doesn't work at all...
    bgps.forEach(function (bgp) {
      self._counts.get(self._hashBGP(bgp), {fillCache : false}, function (error, count) {
        if (count) {
          self._counts.put(self._hashBGP(bgp),parseInt(count) + 1, { sync : true});
        } else {
          self._counts.put(self._hashBGP(bgp), 1, {sync:true});
        }
      });

    });
  },

  /**
   * Returns a writestream on which triples can be put
   */
  putStream : function () {
    var self = this;
    var throughstream = through2({objectMode : true},function (data, enc, callback) {
      var that = this;
      N3Parser().parse(data.toString("utf8"), function (error, triple) {
        if(triple){
          that.push(triple);
          //TODO: find better system to store counts. This current implementation has synchronization issues
          //self._addCounts(triple);
        }
      });
      callback();
    });
    throughstream.pipe(this._db.putStream());
    return throughstream;
  },

  /**
   * get the triple count of a basic graph pattern
   */
  count : function (bgp, callback) {
    this._counts.get(this._hashBGP(bgp), function (err, value) {
      if(!err)
        callback(value);
      else
        throw "Could not retrieve count " + err;
    });
  },

  /**
   * repair the counts if something fishy happened (e.g. an already existing leveldb has been initiated
   */
  repairCounts : function () {
    console.log("not yet implemented")
  }
}



module.exports = LevelLDF;