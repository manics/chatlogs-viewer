'use strict';

/* Controllers */

var myApp = angular.module('myApp.controllers', ['ngQuickDate']);

myApp.controller('Timeline1', ['$scope', 'ChatMessages', function($scope, ChatMessages) {
  $scope.rooms = [
    'sysadmin',
  ];
  $scope.room = $scope.rooms[0];
  $scope.messages = new ChatMessages();
  $scope.dateStart = new Date();
  $scope.messages.initialise($scope.room, $scope.dateStart);
  $scope.autoupdate = 0;
}]);

// Constructor function to encapsulate HTTP and pagination logic
myApp.factory('ChatMessages', function($filter, $http, $log, $timeout) {
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
  };

  // Set the time in a date object to midnight
  function zeroTime(date) {
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
  };

  // Create a date object from an ISO8601 string
  function dateFromIso(s) {
    return new Date(Date.parse(s));
  }

  // Add/subtract days to a date
  function incrdate(date, inc) {
    var d = new Date(date);
    d.setDate(date.getDate() + inc);
    return d;
  };

  // Add/subtract milliseconds to a date
  function incrmilliseconds(date, inc) {
    var d = new Date(date);
    d.setMilliseconds(date.getMilliseconds() + inc);
    return d;
  };

  // Initialise from a room name and a date
  ChatMessages.prototype.initialise = function(room, date) {
    this.room = room;
    this.startdt = new Date(date);
    zeroTime(this.startdt);
    this.enddt = incrdate(this.startdt, 1);
    this.nextenddt = null;
    this.page(0);
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
        this.page(1);
        this.autoupdate(this.updateinterval);
      }.bind(this), this.updateinterval);
    }
  }

  // Fetch the chatlogs for the previous or next day(s)
  ChatMessages.prototype.page = function(dir) {
    if (this.busy) return;
    this.busy = true;
    var fetchFrom = null;
    var fetchTo = null;

    if (dir > 0) {
      fetchFrom = this.enddt;
      fetchTo = incrdate(fetchFrom, dir);
      if (fetchTo < this.nextenddt) {
        fetchTo = this.nextenddt;
        this.nextenddt = null;
      }
    }
    else if (dir < 0) {
      fetchTo = this.startdt;
      fetchFrom = incrdate(fetchTo, dir);
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
        this.iserror = true;
        this.status = 'ERROR: ' + data.error;
        $log.error(this.status);
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

      var lastdt = dateFromIso(data.lastdt);
      if (lastdt < this.startdt) {
        this.startdt = lastdt;
      }
      // search dates are [inclusive,exclusive]
      lastdt = incrmilliseconds(lastdt, 1);
      if (lastdt < this.enddt) {
        this.nextenddt = this.enddt;
        this.enddt = lastdt;
      }

      this.busy = false;

      $log.log('startdt: ' + this.startdt + ' enddt: ' + this.enddt);
      this.status = $filter('date')(this.startdt, datefmt) + ' - ' +
        $filter('date')(this.enddt, datefmt);
    }.bind(this)
    ).error(function(data, status) {
      this.iserror = true;
      this.status = 'ERROR: status:' + status + ' (' + data + ')';
      $log.error(this.status);
      return;
    }.bind(this));
  };

  return ChatMessages;
});

myApp.controller('Search1', ['$scope', '$http', function($scope, $http) {
  $http.get('sysadmin.json').success(function(data) {
    $scope.messages = data;
  });
}]);

