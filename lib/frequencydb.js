/**
 * FrequencyDB uses leveldb to store frequencies
 *
 * @author Pieter Colpaert <pieter.colpaert@okfn.org>
 */
var levelup = require('level'),
    levelgraph = require("levelgraph");

function FrequencyDB (dbname) {
  this._dbname = dbname;
  this._db = levelgraph(levelup(this._dbname));
  this._mem = {};
  this._count = 0;
}

FrequencyDB.prototype = {

  cleanUp : function () {
    var i = 0;
    this._mem.forEach( function (key, value) {
      if (value.expiry <= new Date()) {
        this._mem.splice(i, 1);
      }
      i++;
    });
  },

  /**
   * gets a count
   */
  get : function (key, callback) {
    if (this._mem[key]) {
      this._mem[key].expiry = new Date() + 10;
      callback(this._mem[key].count);
    } else {
      var self = this;
      
      // count is the number of counts in the store
      this._count ++;
      if (this._count % 1000 === 0 )
        this.cleanUp();

      this._db.get(key, function (value) {
        self._mem[key] = {
          expiry : new Date() + 10,
          count : value
        }
        callback(value);
      });
    }
  },

  increase : function (key) {
    if (this._mem[key]) {
      this._mem[key].expiry = new Date() + 10;
      this._mem[key].count ++;
    } else {
      this._count ++;
      if (this._count % 1000 === 0 )
        this.cleanUp();

      this._db.get(key, function (value) {
        console.log(value);
        this._mem[key] = {
          expiry : new Date() + 10,
          count : value +1
        };
      });
      
    }
  }
}



module.exports = FrequencyDB;