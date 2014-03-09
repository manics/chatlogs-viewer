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
      var coll = db.collection(collname);
      async.parallel({
        'query': function(cb) {
          coll.find(query, projection).sort({ timestamp: 1 }).toArray(cb);
        },
        'empty': function(cb) {
          coll.findOne(cb);
        }},
        function(err, results) {
          if (err) {
            error(res, err, callback);
            return;
          }
          if (results.query.length == 0 && results.empty == null) {
            error(res, 'Invalid room', callback);
            return;
          }
          console.dir(results.query);
          var r = { 'chatlogs': results.query };
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
      if (comps.length == 2 && comps[0] == 'api' && comps[1] == 'search') {
        search(res, qstr);
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

