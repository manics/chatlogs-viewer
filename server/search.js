// The chatlogs retrieval service

var dbname = 'MdbChatLogBot';
var mdbServer = '127.0.0.1:27017';

function error(res, err, callback) {
  res.setHeader('Content-Type', 'application/json');
  console.log('ERROR: ' + err);
  if (err.stack) {
    console.log('Stack: ' + err.stack);
  }
  var json = JSON.stringify({ "error": String(err) });
  if (callback) {
    json = callback + '(' + json + ')';
  }
  res.end(json);
}

function search(res, qstr) {
  var MongoClient = require('mongodb').MongoClient;
  var format = require('util').format;
  var async = require('async');

  var murl = 'mongodb://' + mdbServer + '/' + dbname;
  console.dir('Connecting: ' + murl);
  MongoClient.connect(murl, function(err, db) {
    var callback = qstr['callback'];

    try {
      if (err) throw err;

      if (!qstr['room']) {
        throw 'No room specified';
      }
      var collname = qstr['room'];

      var query = {};
      if (qstr['regexp']) {
        query['message'] = new RegExp(
          qstr['regexp'], qstr['regexpopts']);
      }
      if (qstr['startdt'] && qstr['enddt']) {
        startdt = new Date(Date.parse(qstr['startdt']))
        enddt = new Date(Date.parse(qstr['enddt']));
        query['timestamp'] = { $gte: startdt, $lt: enddt };
      }
      else if (qstr['startdt']) {
        startdt = new Date(Date.parse(qstr['startdt']));
        query['timestamp'] = { $gte: startdt };
      }
      else if (qstr['enddt']) {
        enddt = new Date(Date.parse(qstr['enddt']));
        query['timestamp'] = { $lt: enddt };
      }
      var pretty = qstr['pretty'] && qstr['pretty'] == 1;
      var projection = { timestamp: 1, nick: 1, message: 1, _id: 0 };

      console.dir(query);

      // The timestamp of the most recent entry
      lastq = { '$group': { '_id': '', 'lastdt': { '$max':'$timestamp' }}};

      var coll = db.collection(collname);
      async.parallel({
        'query': function(cb) {
          coll.find(query, projection).sort({ timestamp: 1 }).toArray(cb);
        },
        'latest': function(cb) {
          coll.aggregate(lastq, cb);
        }},
        function(err, results) {
          if (err) {
            error(res, err, callback);
            return;
          }
          console.dir(results);
          if (results.latest.length == 0) {
            error(res, 'Invalid room', callback);
            return;
          }
          var r = {
            'chatlogs': results.query,
            'lastdt': results.latest[0].lastdt
          };
          res.setHeader('Content-Type', 'application/json');
          var json;
          if (pretty) {
            json = JSON.stringify(r, null, 3);
          }
          else {
            json = JSON.stringify(r);
          }
          if (callback) {
            json = callback + '(' + json + ')';
          }
          res.end(json);
          db.close();
        });
    }
    catch (err) {
      error(res, err, callback);
    }
  });
};

function page(res, qstr) {
  var MongoClient = require('mongodb').MongoClient;
  var format = require('util').format;
  var async = require('async');

  var murl = 'mongodb://' + mdbServer + '/' + dbname;
  console.dir('Connecting: ' + murl);
  MongoClient.connect(murl, function(err, db) {
    var callback = qstr['callback'];

    try {
      if (err) throw err;

      if (!qstr['room']) {
        throw 'No room specified';
      }
      var collname = qstr['room'];

      if (!qstr['dt']) {
        throw 'No datetime specified';
      }
      var dt = new Date(Date.parse(qstr['dt']))
      var prevn = 0;
      var nextn = 0;
      if (qstr['prevn']) {
        prevn = parseInt(qstr['prevn']);
      }
      if (qstr['nextn']) {
        nextn = parseInt(qstr['nextn']);
      }
      if (prevn < 1 && nextn < 1) {
        throw 'Either prevn and/or nextn must be >= 1';
      }
      var pretty = qstr['pretty'] && qstr['pretty'] == 1;
      var projection = { timestamp: 1, nick: 1, message: 1, _id: 0 };

      // The timestamp of the most recent entry
      lastq = { '$group': { '_id': '', 'lastdt': { '$max':'$timestamp' }}};

      var coll = db.collection(collname);
      async.parallel({
        'prev': function(cb) {
          if (prevn > 0) {
            coll.find({timestamp: { $lt: dt }}, projection).
              sort({ timestamp: -1 }).limit(prevn).toArray(cb);
          }
          else {
            cb();
          }
        },
        'next': function(cb) {
          if (nextn > 0) {
            coll.find({timestamp: { $gte: dt }}, projection).
              sort({ timestamp: 1 }).limit(nextn).toArray(cb);
          }
          else {
            cb();
          }
        },
        'latest': function(cb) {
          coll.aggregate(lastq, cb);
        }},
        function(err, results) {
          if (err) {
            error(res, err, callback);
            return;
          }
          console.dir(results);
          if (results.latest.length == 0) {
            error(res, 'Invalid room', callback);
            return;
          }
          var r = {
            'prevlogs': results.prev ? results.prev.reverse() : results.prev,
            'nextlogs': results.next
          };
          if (r.prev) {
            r.prev = r.prev.reverse();
          }
          res.setHeader('Content-Type', 'application/json');
          var json;
          if (pretty) {
            json = JSON.stringify(r, null, 3);
          }
          else {
            json = JSON.stringify(r);
          }
          if (callback) {
            json = callback + '(' + json + ')';
          }
          res.end(json);
          db.close();
        });
    }
    catch (err) {
      error(res, err, callback);
    }
  });
};


var Search = function() {
  var handleRequest = function(req, res) {
    var url = require('url');
    var parts = url.parse(req.url, true);
    // Split into components, remove empty elements
    var comps = parts.pathname.split('/').filter(function(x) { return x; });
    var qstr = parts.query;
    try {
      if (comps.length != 2 || comps[0] != 'api') {
        throw 'Invalid API call';
      }
      if (comps[1] == 'search') {
        search(res, qstr);
      }
      else if (comps[1] == 'page') {
        page(res, qstr);
      }
      else {
        throw 'Invalid API call'
      }
    }
    catch (err) {
      error(res, err);
    }
  };

  return {
    handleRequest: handleRequest
  }
}();

module.exports = Search;

/*
var http = require('http');

var app = http.createServer(function(req, res) {
  var url = require('url');
  qstr = url.parse(req.url, true).query;
  try {
    search(res, qstr);
  }
  catch (err) {
    error(res, err);
  }
});
app.listen(18888, '0.0.0.0');
*/
// TODO
//coll.ensureIndex({ timestamp: 1 })

process.on('uncaughtException', function (err) {
  console.log('Caught exception: ' + err);
  if (err.stack) {
    console.log('Stack: ' + err.stack);
  }
});

