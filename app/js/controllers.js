'use strict';

/* Controllers */

var myApp = angular.module('myApp.controllers', []);

myApp.controller('MyCtrl1', ['$scope', '$http', function($scope, $http) {
  $http.get('sysadmin.json').success(function(data) {
    $scope.messages = data;
  });
}]);

myApp.controller('MyCtrl2', ['$scope', 'ChatMessages', function($scope, ChatMessages) {
  $scope.messages = new ChatMessages();
  $scope.messages.page(1);
}]);

// Constructor function to encapsulate HTTP and pagination logic
myApp.factory('ChatMessages', function($http) {
  var ChatMessages = function() {
    this.items = [];
    this.busy = [false, false];
    this.startdt = '';
    this.enddt = '';
    this.prepended = 0;
    this.appended = 0;
  };

  ChatMessages.prototype.page = function(dir) {
    var busyvar = 1;
    if (dir < 0) busyvar = 0;
    if (this.busy[busyvar]) return;
    this.busy[busyvar] = true;

    //var url = "http://api.reddit.com/hot?after=" + this.after + "&jsonp=JSON_CALLBACK";
    var url = "sysadmin.json";
    console.log(url);
    //$http.jsonp(url).success(function(data) {
    $http.get(url).success(function(data) {
      if (dir >= 0) {
        for (var i = 0; i < data.length; i++) {
          this.items.push(data[i]);
        }

        this.prepended = 0;
        this.appended = data.length;

        if (data.length) {
          this.enddt = data[data.length - 1].timestamp;
          if (!this.startdt)
            this.startdt = data[0].timestamp;
        }
      } else {
        for (var i = data.length - 1; i >= 0; i--) {
          this.items.unshift(data[i]);
        }

        this.prepended = data.length;
        this.appended = 0;

        if (data.length) {
          this.startdt = data[0].timestamp;
          if (!this.enddt)
            this.enddt = data[data.length - 1].timestamp;
        }
      }
      //this.after = "t3_" + this.items[this.items.length - 1].id;
      this.busy[busyvar] = false;

      console.log('startdt: ' + this.startdt);
      console.log('enddt: ' + this.enddt);
    }.bind(this));
  };

  return ChatMessages;
});

myApp.directive('scrollAfter', function($timeout) {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      if (attrs.ngRepeat && scope.$index == scope.messages.prepended - 1) {
        $timeout(function() {
          element[0].parentElement.scrollTop = element[0].getBoundingClientRect().top - element[0].parentElement.getBoundingClientRect().top;
        });
      }
      return scope;
    }
  };
});

