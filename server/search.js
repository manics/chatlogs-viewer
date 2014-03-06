// The chatlogs retrieval service

var dbname = 'MdbChatLogBot';
var mdbServer = '127.0.0.1:27017';

function error(res, msg, callback) {
  res.setHeader('Content-Type', 'application/json');
  json = JSON.stringify({"error": msg});
  if (callback) {
    json = callback + '(' + json + ')';
  }
  res.end(json);
}

function search(res, qstr) {
  var MongoClient = require('mongodb').MongoClient;
  var format = require('util').format;

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
      coll.find(query, projection).sort({ timestamp: 1 }).toArray(
        function(err, results) {
          if (err) {
            throw err;
          }
          console.dir(results);
          res.setHeader('Content-Type', 'application/json');
          if (pretty) {
            json = JSON.stringify(results, null, 3);
          }
          else {
            json = JSON.stringify(results);
          }
          if (callback) {
            json = callback + '(' + json + ')';
          }
          res.end(json);
          db.close();
        });
    }
    catch (err) {
      console.log('Caught exception: ' + err);
      error(res, String(err), callback);
    }
  });
};


var Search = function() {
  var handleRequest = function(req, res) {
    var url = require('url');
    qstr = url.parse(req.url, true).query;
    try {
      search(res, qstr);
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
});

