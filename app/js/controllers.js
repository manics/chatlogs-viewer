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
}]);

// Constructor function to encapsulate HTTP and pagination logic
myApp.factory('ChatMessages', function($http) {
  var ChatMessages = function() {
    this.items = [];
    this.busy = [false, false];
    //this.position = ['', ''];
    this.page(1);
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
      console.log(data);
      if (dir >= 0) {
        for (var i = 0; i < data.length; i++) {
          this.items.push(data[i]);
          console.log(data[i]);
        }
      } else {
        for (var i = data.length - 1; i >= 0; i--) {
          this.items.unshift(data[i]);
        }
      }
      //this.after = "t3_" + this.items[this.items.length - 1].id;
      this.busy[busyvar] = false;
    }.bind(this));
  };

  return ChatMessages;
});

