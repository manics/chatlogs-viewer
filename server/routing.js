#!/usr/bin/env node

var Routing = function() {
  var _routes = [];

  var _addRoute = function(urlmatch, method, action) {
    var item = {
      urlmatch: urlmatch,
      method: method,
      action: action
    };
    _routes.push(item);
  };

  var _process = function(req, res) {
    var route = _getRoute(req);
    if (route) {
      route.action(req, res);
      return true;
    }
    return false;
  };

  var _getRoute = function(req) {
    for (var i in _routes) {
      r = _routes[i];
      if (req.method == r.method && req.url.match(r.urlmatch)) {
        return r;
      }
    }
  };

  return {
    addRoute: _addRoute,
    process: _process
  };
}();

module.exports = Routing;

