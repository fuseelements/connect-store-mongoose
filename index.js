/*
 * Copyright (c) 2012 Fuse Elements, LLC. All rights reserved.
 */

module.exports = function(connect, mongoose) {
  'use strict';

  var Store = connect.session.Store,
      util = require('util'),
      Schema = mongoose.Schema,
      SessionSchema = new mongoose.Schema({
        d: {
          type: Schema.Types.Mixed,
          required: true
        },
        x: {
          type: Date,
          index: true
        }
      }),
      Session = mongoose.model('Session', SessionSchema);


  function _fn(fn) {
    return typeof(fn) === 'function' ? fn : function() {
    };
  }

  function _scheduleReaper(interval) {
    setTimeout(function() {
      Session.remove({x: {$lte: Date.now()}}, function(err) {
        if (err) {
          util.error('Unable to reap sessions. ' + err.toString());
        }
        else {
          _scheduleReaper(interval);
        }
      });
    }, interval);
  }

  function MongooseStore(options) {
    Store.call(this, options);
    _scheduleReaper(options.reapInterval || 5 * 60 * 1000);
  }

  util.inherits(MongooseStore, Store);


  MongooseStore.prototype.get = function(sid, fn) {
    fn = _fn(fn);

    Session.findOne({_id: sid}, function(err, session) {
      var sess;
      if (err || !session) {
        fn(err);
      }
      else {
        sess = JSON.parse(session.d);
        fn(null, sess);
      }
    });
  };


  MongooseStore.prototype.set = function(sid, session, fn) {
    var doc = {
          id: sid
        };

    if (session) {
      try {
        doc.x = session.cookie.expires || null;
        doc.d = JSON.stringify(session);
        Session.update({_id: sid}, doc, {upsert: true}, function(err) {
          fn(err);
        });
      }
      catch (e) {
        fn(e);
      }
    }
    else {
      this.destroy(sid, fn);
    }
  };


  MongooseStore.prototype.destroy = function(sid, fn) {
    Session.remove({s: sid}, fn);
  };


  MongooseStore.prototype.clear = function(fn) {
    fn = _fn(fn);
    Session.collection.drop(fn);
  };


  MongooseStore.prototype.length = function(fn) {
    fn = _fn(fn);
    Session.count(fn);
  };

  return MongooseStore;
};
