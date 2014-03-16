'use strict';

/* Controllers */

var myApp = angular.module('myApp.controllers', ['ngQuickDate']);
var rooms = [
  'sysadmin'
  ];

myApp.controller('Timeline1', ['$scope', '$routeParams', 'ChatMessages',
  'dateUtils', function($scope, $routeParams, ChatMessages, dateUtils) {
  $scope.rooms = rooms;
  $scope.room = $routeParams.room ? $routeParams.room : $scope.rooms[0];
  $scope.messages = new ChatMessages();
  var n = 50;
  $scope.dateStart = dateUtils.dateFromIso($routeParams.dt);
  if (!$scope.dateStart) {
    $scope.messages.error('Invalid date');
    $scope.dateStart = new Date();
    n = -50;
  }
  $scope.messages.initialiseOne($scope.room, $scope.dateStart, n);
  $scope.autoupdate = 0;
}]);

myApp.controller('Search1', ['$scope', '$location', '$log', 'ChatMessages',
  'dateUtils', function($scope, $location, $log, ChatMessages, dateUtils) {
  $scope.rooms = rooms;
  $scope.messages = new ChatMessages();
  var s = $location.search();
  var good = true;

  $scope.room = s.room;
  if (!$scope.room) {
    $scope.room = $scope.rooms[0];
  }
  $scope.dateStart = dateUtils.dateFromIso(s.startdt);
  if (!$scope.dateStart) {
    if (s.startdt) {
      $scope.messages.error('Invalid date in query string');
    }
    $scope.dateStart = new Date();
    good = false;
  };
  $scope.dateEnd = dateUtils.dateFromIso(s.enddt);
  if (!$scope.dateEnd) {
    if (s.enddt) {
      $scope.messages.error('Invalid date in query string');
    }
    $scope.dateEnd = new Date();
    good = false;
  };
  $scope.regexp = s.regexp;
  if (!$scope.regexp) {
    good = false;
  }
  $scope.regexpopts = s.regexpopts == undefined ? 'i' : s.regexpopts;
  $scope.submit = function() {
    $location.search('room', $scope.room);
    $location.search('startdt', $scope.dateStart.toISOString());
    $location.search('enddt', $scope.dateEnd.toISOString());
    $location.search('regexp', $scope.regexp);
    $location.search('regexpopts', $scope.regexpopts);
    if ($scope.regexp) {
      $log.log('Initialising (submit)');
      $scope.messages.initialiseRange($scope.room,
        dateUtils.getStartOfDay($scope.dateStart),
        dateUtils.getEndOfDay($scope.dateEnd),
        $scope.regexp, $scope.regexpopts);
    }
    else {
      $scope.messages.error('No search terms provided');
    }
  };

  if (good && $scope.regexp) {
    $log.log('Initialising (url)');
    $scope.submit();
  }
}]);


// Constructor function to encapsulate HTTP and pagination logic
myApp.factory('ChatMessages', function($filter, $http, $log, $timeout,
  dateUtils) {
  var ChatMessages = function() {
    // List of chat messages
    this.items = [];
    // Prevent concurrent updates
    this.busy = false;
    // Current displayed datetime range
    this.startdt = null;
    this.enddt = null;
    // The user-requested enddt may be later than the lastdt in the database
    this.nextenddt = null;
    // Number of chat messages added to the start or end
    this.prepended = 0;
    this.appended = 0;
    // Room name
    this.room = null;
    // Status line
    this.status = 'Loading...';
    // The current timeout object and update interval
    this.autoupdater = null;
    this.updateinterval = 0;
    // Search options
    this.regexp = null;
    this.regexpopts = null;
    this.pagesize = 50;
  };

  // Initialise from a room name and a date range and optional search
  ChatMessages.prototype.initialiseRange = function(room, startdt, enddt,
    regexp, regexpopts, noround) {
    this.items = [];
    this.busy = false;
    this.room = room;
    this.startdt = new Date(startdt);
    if (!noround) {
      this.startdt = dateUtils.getStartOfDay(this.startdt);
    }
    if (enddt) {
      this.enddt = new Date(enddt);
      if (!noround) {
        this.enddt = dateUtils.getEndOfDay(this.enddt);
      }
    }
    else {
      this.enddt = dateUtils.incrDate(this.startdt, 1);
    }
    this.regexp = regexp;
    this.regexpopts = regexpopts;
    this.nextenddt = null;
    this.page(0);
  };

  // Initialise from a room name and a single date
  ChatMessages.prototype.initialiseOne = function(room, dt, initn) {
    this.items = [];
    this.busy = false;
    this.room = room;
    this.startdt = dt;
    this.enddt = this.startdt;
    this.pagen(initn);
  };

  // Setup a single auto-update iteration
  ChatMessages.prototype.autoupdate = function(interval) {
    $log.log('autoupdate: ' + interval);
    if (this.autoupdater) {
      $timeout.cancel(this.autoupdater);
      this.autoupdater = null;
    }
    this.updateinterval = interval;
    if (this.updateinterval > 0) {
      this.autoupdater = $timeout(function() {
        this.pagen(this.pagesize);
        this.autoupdate(this.updateinterval);
      }.bind(this), this.updateinterval);
    }
  };

  // Report an error message
  ChatMessages.prototype.error = function(err) {
    this.iserror = true;
    this.status = 'ERROR: ' + err;
    $log.error(this.status);
    this.busy = false;
    return;
  };

  // Fetch the chatlogs for the previous or next day(s)
  ChatMessages.prototype.page = function(dir) {
    if (this.busy) {
      $log.warn('Busy');
      return;
    }
    this.busy = true;
    var fetchFrom = null;
    var fetchTo = null;

    if (dir > 0) {
      fetchFrom = this.enddt;
      fetchTo = dateUtils.incrDate(fetchFrom, dir);
      if (fetchTo < this.nextenddt) {
        fetchTo = this.nextenddt;
        this.nextenddt = null;
      }
    }
    else if (dir < 0) {
      fetchTo = this.startdt;
      fetchFrom = dateUtils.incrDate(fetchTo, dir);
    }
    else {
      fetchFrom = this.startdt;
      fetchTo = this.enddt;
    }

    var url = '/api/search';
    //var url = "sysadmin.json";
    var params = {
      room: this.room,
      startdt: fetchFrom.toISOString(),
      enddt: fetchTo.toISOString(),
      regexp: this.regexp,
      regexpopts: this.regexpopts,
      callback: 'JSON_CALLBACK'
    };
    $log.log('Loading: ' + url + ' ' + $filter('json')(params));
    var datefmt = 'yyyy-MM-dd HH:mm:ssZ';
    this.iserror = false;
    this.status = 'Loading ' + $filter('date')(fetchFrom, datefmt) + ' - ' +
      $filter('date')(fetchTo, datefmt)
    //$http.get(url).success(function(data) {
    $http.jsonp(url, {params: params}).success(function(data) {
      if (data.error) {
        this.error(data.error);
        return;
      }

      var msgs = data.chatlogs;
      if (dir > 0) {
        for (var i = 0; i < msgs.length; i++) {
          this.items.push(msgs[i]);
        }

        this.prepended = 0;
        this.appended = msgs.length;
        this.enddt = fetchTo;
      } else if (dir < 0) {
        for (var i = msgs.length - 1; i >= 0; i--) {
          this.items.unshift(msgs[i]);
        }

        this.prepended = msgs.length;
        this.appended = 0;
        this.startdt = fetchFrom;
      } else {
        this.items = msgs;
        this.prepended = 0;
        this.appended = msgs.length;
      }

      // search dates are [inclusive,exclusive]
      var lastdt = dateUtils.dateFromIso(data.lastdt);
      lastdt = dateUtils.incrMilliseconds(lastdt, 1);
      if (lastdt < this.enddt) {
        this.nextenddt = this.enddt;
        this.enddt = lastdt;
      }
      if (this.enddt < this.startdt) {
        this.startdt = this.enddt;
      }

      this.busy = false;

      $log.log('startdt: ' + this.startdt + ' enddt: ' + this.enddt);
      this.status = $filter('date')(this.startdt, datefmt) + ' - ' +
        $filter('date')(this.enddt, datefmt);
    }.bind(this)
    ).error(function(data, status) {
      this.error('status:' + status + ' (' + data + ')');
      return;
    }.bind(this));
  };

  // Fetch the previous or next n chatlogs
  ChatMessages.prototype.pagen = function(dir) {
    if (this.busy) {
      $log.warn('Busy');
      return;
    }
    this.busy = true;
    var prevn = 0;
    var nextn = 0;
    var dt = null;

    if (dir > 0) {
      nextn = dir;
      dt = this.enddt.toISOString();
    }
    if (dir < 0) {
      prevn = -dir;
      dt = this.startdt.toISOString();
    }

    var url = '/api/page';
    //var url = "sysadmin.json";
    var params = {
      room: this.room,
      prevn: prevn,
      nextn: nextn,
      dt: dt,
      callback: 'JSON_CALLBACK'
    };
    $log.log('Loading: ' + url + ' ' + $filter('json')(params));
    var datefmt = 'yyyy-MM-dd HH:mm:ssZ';
    this.iserror = false;
    this.status = 'Loading ' + $filter('date')(dt, datefmt) +
      ' -' + prevn + ' +' + nextn;
    //$http.get(url).success(function(data) {
    $http.jsonp(url, {params: params}).success(function(data) {
      if (data.error) {
        this.error(data.error);
        return;
      }

      if (dir > 0 && data.nextlogs.length > 0) {
        var msgs = data.nextlogs;
        for (var i = 0; i < msgs.length; i++) {
          this.items.push(msgs[i]);
        }

        this.prepended = 0;
        this.appended = msgs.length;

        // search dates are [inclusive,exclusive]
        var lastdt = dateUtils.dateFromIso(msgs[msgs.length - 1].timestamp);
        this.enddt = dateUtils.incrMilliseconds(lastdt, 1);
      } else if (dir < 0 && data.prevlogs.length > 0) {
        var msgs = data.prevlogs;
        for (var i = msgs.length - 1; i >= 0; i--) {
          this.items.unshift(msgs[i]);
        }

        this.prepended = msgs.length;
        this.appended = 0;
        this.startdt = dateUtils.dateFromIso(msgs[0].timestamp);
      } else {
        // error
      }

      this.busy = false;

      $log.log('startdt: ' + this.startdt + ' enddt: ' + this.enddt);
      this.status = $filter('date')(this.startdt, datefmt) + ' - ' +
        $filter('date')(this.enddt, datefmt);
    }.bind(this)
    ).error(function(data, status) {
      this.error('status:' + status + ' (' + data + ')');
      return;
    }.bind(this));
  };

  return ChatMessages;
});

