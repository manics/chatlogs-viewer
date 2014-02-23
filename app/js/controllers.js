'use strict';

/* Controllers */

var myApp = angular.module('myApp.controllers', ['ngQuickDate']);

myApp.controller('MyCtrl1', ['$scope', '$http', function($scope, $http) {
  $http.get('sysadmin.json').success(function(data) {
    $scope.messages = data;
  });
}]);

myApp.controller('MyCtrl2', ['$scope', 'ChatMessages', function($scope, ChatMessages) {
  $scope.messages = new ChatMessages();
  $scope.dateStart = new Date();
  $scope.messages.initialise($scope.dateStart);
}]);

// Constructor function to encapsulate HTTP and pagination logic
myApp.factory('ChatMessages', function($http) {
  var ChatMessages = function() {
    this.items = [];
    this.busy = false;
    this.startdt = null;
    this.enddt = null;
    this.prepended = 0;
    this.appended = 0;
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

  ChatMessages.prototype.initialise = function(date) {
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

    var server = 'http://localhost:18888/';
    var room = 'sysadmin';
    //var url = "sysadmin.json";
    var url = server + '?room=' + room +
      '&startdt=' + fetchFrom.toISOString() +
      '&enddt=' + fetchTo.toISOString() +
      '&callback=JSON_CALLBACK';
    console.log(url);
    //$http.get(url).success(function(data) {
    $http.jsonp(url).success(function(data) {
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
    }.bind(this));
  };

  return ChatMessages;
});

