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
}]);

// Constructor function to encapsulate HTTP and pagination logic
myApp.factory('ChatMessages', function($http, $filter) {
  var ChatMessages = function() {
    this.items = [];
    this.busy = false;
    this.startdt = null;
    this.enddt = null;
    this.prepended = 0;
    this.appended = 0;
    this.room = null;
    this.status = 'Loading...';
  };

  function zeroTime(date) {
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
  };

  function incrdate(date, inc) {
    var d = new Date(date);
    d.setDate(date.getDate() + inc);
    return d;
  };

  ChatMessages.prototype.initialise = function(room, date) {
    this.room = room;
    this.startdt = new Date(date);
    zeroTime(this.startdt);
    this.enddt = incrdate(this.startdt, 1);
    this.page(0);
  };

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
    console.log(url);
    var datefmt = 'yyyy-MM-dd HH:mm:ssZ';
    this.iserror = false;
    this.status = 'Loading ' + $filter('date')(fetchFrom, datefmt) + ' - ' +
      $filter('date')(fetchTo, datefmt)
    //$http.get(url).success(function(data) {
    $http.jsonp(url).success(function(data) {
      if (data.error) {
        this.iserror = true;
        this.status = 'ERROR: ' + data.error;
        return;
      }

      if (dir > 0) {
        for (var i = 0; i < data.length; i++) {
          this.items.push(data[i]);
        }

        this.prepended = 0;
        this.appended = data.length;
        this.enddt = fetchTo;
      } else if (dir < 0) {
        for (var i = data.length - 1; i >= 0; i--) {
          this.items.unshift(data[i]);
        }

        this.prepended = data.length;
        this.appended = 0;
        this.startdt = fetchFrom;
      } else {
        this.items = data;
        this.prepended = 0;
        this.appended = data.length;
      }
      this.busy = false;

      console.log('startdt: ' + this.startdt);
      console.log('enddt: ' + this.enddt);
      this.status = $filter('date')(this.startdt, datefmt) + ' - ' +
        $filter('date')(this.enddt, datefmt);
    }.bind(this)
    ).error(function(data, status) {
      this.iserror = true;
      this.status = 'ERROR: status:' + status + ' (' + data + ')';
      return;
    }.bind(this));
  };

  return ChatMessages;
});

