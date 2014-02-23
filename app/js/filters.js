'use strict';

/* Filters */

angular.module('myApp.filters', []).
  filter('interpolate', ['version', function(version) {
    return function(text) {
      return String(text).replace(/\%VERSION\%/mg, version);
    }
  }]);
/*
.filter('linebreak', function() {
  return function(input) {
    return input.replace('\n', '<br/>');
  };
});
*/
