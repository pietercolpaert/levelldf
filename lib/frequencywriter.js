/**
 * FrequencyWriter uses leveldb to store frequencies
 * It implements an in memory store before writing things to levelgraph.
 *
 * @author Pieter Colpaert <pieter.colpaert@okfn.org>
 */
var levelup = require('level'),
    leveldown = require('leveldown'),
    levelgraph = require("levelgraph"),
    Writable = require('stream').Writable,
    Transform = require('stream').Transform,
    util = require('util');

util.inherits(FrequencyWriter, Transform);

function FrequencyWriter (dbname) {
  Transform.call(this, {objectMode : true});
  this._dbname = dbname;
  this._db = levelup(dbname);
  this._tmp = levelgraph(levelup(".tmp"));
}


/**
 * Hashes a certain bgp into 1 key
 */
FrequencyWriter.prototype.hashBGP = function (bgp) {
  return (bgp.subject || "?s") + (bgp.predicate || "?p") + (bgp.object || "?o");
};

FrequencyWriter.prototype._flush = function () {
  // Flush is called at the end of everything.
  // Let's now build the frequency db
  console.log("counting...");
  this.countAndStore();
}

FrequencyWriter.prototype._generateBGPArrayFromTriple = function (triple){
  //we need to generate 6 bgps. ?s ?p ?o is left out.
  return [
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
    }
  ];

}

/**
 * Increase 7 BGP counters per triple
 */
FrequencyWriter.prototype._transform = function (triple, encoding, callback) {
  //just store all triples in an empty temporal db
  // we will count these triples afterwards.
  this._tmp.put(triple, function () {
    callback(undefined,triple);
  });
};

/**
 * gets a count
 */
FrequencyWriter.prototype.get = function (bgp, callback) {
  var self = this;
  this._db.get(this.hashBGP(bgp), function (err, value) {
    if(value){
      callback(undefined,value);
    } else if (err && err.notFound){
      callback(undefined,0);
    }else if (err){
      callback(err);
    }
  });
};

FrequencyWriter.prototype.countAndStore = function () {
  console.log("start count and store");
  var self = this;
  //Next, let's start counting the data streams
  var alltriplesstream = this._tmp.getStream({});
  var totalcount = 0;
  alltriplesstream.on("data", function (triple) {
    if(triple){
      //for each unique BGP we find, we need to open up a new stream
      var bgps = self._generateBGPArrayFromTriple(triple);
      bgps.forEach( function (bgp) {
        var bgpstream = self._tmp.getStream(bgp);
        //Next, let's count the stream for this bgp
        var count = 0;
        bgpstream.on("data", function (triple) {
          if (triple){
            count ++;
          }
        });
        bgpstream.on("end", function () {
          //and store the count for this bgp in the new count db
          self._db.get(self.hashBGP(bgp), function( err, value ) {
            if (value) {
              count += value;
            }
            self._db.put(self.hashBGP(bgp), count, function (err) {
              //console.log("Stored this bgp: ", bgp, "with a count of" , count);
            });
          });
        });
      });
    }
    totalcount ++; 
  });
  alltriplesstream.on("end", function () {
    //now also store the total count
    self._db.get(self.hashBGP({}), function( err, value ) {
      if (value) {
        count += value;
      }
      self._db.put(self.hashBGP({}), count, function (err) {
        if(err){
          console.log("something went wrong", err);
        }else{
          console.log("Stored total count: " , count);
          leveldown.destroy('.tmp', function () { console.log('Temporary dir deleted!') })
        }
      });
    });
  });
};

/**
 * repair the counts if something fishy happened (e.g. an already existing leveldb has been initiated)
 * This function works in O(6*n²) = O(n²), so don't run it too often.
 */
FrequencyWriter.prototype.recount = function (db) {
  //First, clear the old count database
  var self= this;
  //Next, let's start counting the data streams
  var alltriplesstream = db.getStream({});
  var totalcount = 0;
  alltriplesstream.on("data", function (triple) {
    if(triple){
      //for each unique BGP we find, we need to open up a new stream
      var bgps = self._generateBGPArrayFromTriple(triple);
      bgps.forEach( function (bgp) {
        //first check whether the bgp already exists in the counts db
        //because of the fact that parallellization kicks in, this might just not work at all
        self._db.get(self.hashBGP(bgp), function (err, value) {
          if (err && err.notFound){
            //if not, let's open a stream
            var bgpstream = db.getStream(bgp);
            //Next, let's count the stream for this bgp
            var count = 0;
            bgpstream.on("data", function (triple) {
              if (triple){
                count ++;
              }
            });
            bgpstream.on("end", function () {
              //and store the count for this bgp in the new count db
              self._db.put(self.hashBGP(bgp), count, function (err) {
                //console.log("Stored this bgp: ", bgp, "with a count of" , count);
              });
            });
          }
        });
      });
    }
    totalcount ++; 
  });
  alltriplesstream.on("end", function () {
    //now also store the total count
    setTimeout(function () {
      self._db.put(self.hashBGP({}), totalcount, function (err) {
        console.log("Stored this bgp: ", self.hashBGP({}), "with a count of" , totalcount);
      });
    }, 2000); // make sure that the other streams are done.
  });
};

module.exports = FrequencyWriter;