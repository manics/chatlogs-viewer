#!/usr/bin/env node

var http = require('http');
var util = require('util');
var routing = require('./routing');
var staticServer = require('./staticServer');
var searchApi = require('./search');

function apiExample(req, res) {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Api\n' + req.url + '\n');
}

routing.addRoute('^/app/', 'GET', staticServer.handleRequest);
routing.addRoute('^/api/', 'GET', searchApi.handleRequest);


var DEFAULT_PORT = 8000;

function main(argv) {
  var port = DEFAULT_PORT;
  if (argv[2]) {
    port = Number(argv[2]);
  }
  util.puts('argv:' + argv + ' port:' + port);
  if (!(port > 0 && port < 65536)) {
    util.puts('Invalid port');
    return 2;
  }

  util.puts('Starting server on port ' + port);
  var server = http.createServer(function(req, res) {
    var logEntry = req.method + ' ' + req.url;
    if (req.headers['user-agent']) {
      logEntry += ' ' + req.headers['user-agent'];
    }
    util.puts(logEntry);
    if (routing.process(req, res) === false) {
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.end('No matching route found');
    }
  }).listen(port);
}

// Must be last,
main(process.argv);

