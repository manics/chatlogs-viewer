'use strict';

/* Controllers */

var myApp = angular.module('myApp.controllers', ['ngQuickDate']);
var rooms = [
  'sysadmin'
  ];

myApp.controller('Timeline1', ['$scope', 'ChatMessages', function($scope, ChatMessages) {
  $scope.rooms = rooms;
  $scope.room = $scope.rooms[0];
  $scope.messages = new ChatMessages();
  $scope.dateStart = new Date();
  $scope.messages.initialise($scope.room, $scope.dateStart);
  $scope.autoupdate = 0;
}]);

myApp.controller('Search1', ['$scope', 'ChatMessages', 'dateUtils', function($scope, ChatMessages, dateUtils) {
  $scope.rooms = rooms;
  $scope.room = $scope.rooms[0];
  $scope.messages = new ChatMessages();
  $scope.dateStart = new Date();
  $scope.dateEnd = new Date();
  $scope.regexp = null;
  $scope.regexpopts = 'i';
  $scope.submit = function() {
    console.log('submit');
    console.log($scope.regexp);
    if ($scope.regexp) {
      $scope.messages.initialise($scope.room,
        dateUtils.getStartOfDay($scope.dateStart),
        dateUtils.getEndOfDay($scope.dateEnd),
        $scope.regexp, $scope.regexpopts);
    }
    else {
      $scope.messages.error('No search terms provided');
    }
  };
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
  };

  // Initialise from a room name and a date
  ChatMessages.prototype.initialise = function(room, startdt, enddt, regexp,
    regexpopts, noround) {
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

      var lastdt = dateUtils.dateFromIso(data.lastdt);
      if (lastdt < this.startdt) {
        this.startdt = lastdt;
      }
      // search dates are [inclusive,exclusive]
      lastdt = dateUtils.incrMilliseconds(lastdt, 1);
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
      this.error('status:' + status + ' (' + data + ')');
      return;
    }.bind(this));
  };

  return ChatMessages;
});

