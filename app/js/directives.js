'use strict';

/* Directives */


angular.module('myApp.directives', []).
  directive('appVersion', ['version', function(version) {
    return function(scope, elm, attrs) {
      elm.text(version);
    };
  }]).
  directive('scrollAfter', function($timeout) {
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

