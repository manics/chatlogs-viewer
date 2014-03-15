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
      scope: {
        prepended: '='
      },
      link: function(scope, element, attrs) {
        if (attrs.ngRepeat && scope.$parent.$index == scope.prepended - 1) {
          $timeout(function() {
            var ele = element[0];
            var par = ele.parentElement;
            par.scrollTop = ele.getBoundingClientRect().top -
              par.getBoundingClientRect().top;
          });
        }
        return scope;
      }
    };
  });

