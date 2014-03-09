'use strict';

/* Controllers */

var myApp = angular.module('myApp.controllers', ['ngQuickDate']);

myApp.controller('MyCtrl1', ['$scope', '$http', function($scope, $http) {
  $http.get('sysadmin.json').success(function(data) {
    $scope.messages = data;
  });
}]);

myApp.controller('MyCtrl2', ['$scope', 'ChatMessages', function($scope, ChatMessages) {
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
    this.items = [];
    this.busy = false;
    this.startdt = null;
    this.enddt = null;
    this.prepended = 0;
    this.appended = 0;
    this.room = null;
    this.status = 'Loading...';
    this.autoupdater = null;
    this.updateinterval = 0;
  };

  function zeroTime(date) {
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
  };

  function dateFromIso(s) {
    return new Date(Date.parse(s));
  }

  function incrdate(date, inc) {
    var d = new Date(date);
    d.setDate(date.getDate() + inc);
    return d;
  };

  function incrmilliseconds(date, inc) {
    var d = new Date(date);
    d.setMilliseconds(date.getMilliseconds() + inc);
    return d;
  };

  ChatMessages.prototype.initialise = function(room, date) {
    this.room = room;
    this.startdt = new Date(date);
    zeroTime(this.startdt);
    this.enddt = incrdate(this.startdt, 1);
    this.page(0);
  };

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

  ChatMessages.prototype.page = function(dir) {
    if (this.busy) return;
    this.busy = true;
    var fetchFrom = null;
    var fetchTo = null;

    if (dir > 0) {
      fetchFrom = this.enddt;
      fetchTo = incrdate(fetchFrom, dir);
    }
    else if (dir < 0) {
      fetchTo = this.startdt;
      fetchFrom = incrdate(fetchTo, dir);
    }
    else {
      fetchFrom = this.startdt;
      fetchTo = this.enddt;
    }

    var server = '/api/search';
    //var url = "sysadmin.json";
    var url = server + '?room=' + this.room +
      '&startdt=' + fetchFrom.toISOString() +
      '&enddt=' + fetchTo.toISOString() +
      '&callback=JSON_CALLBACK';
    $log.log('Loading: ' + url);
    var datefmt = 'yyyy-MM-dd HH:mm:ssZ';
    this.iserror = false;
    this.status = 'Loading ' + $filter('date')(fetchFrom, datefmt) + ' - ' +
      $filter('date')(fetchTo, datefmt)
    //$http.get(url).success(function(data) {
    $http.jsonp(url).success(function(data) {
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
        this.enddt = lastdt;
      }

      this.busy = false;

      $log.log('startdt: ' + this.startdt);
      $log.log('enddt: ' + this.enddt);
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

