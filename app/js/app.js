'use strict';


// Declare app level module which depends on filters, and services
angular.module('myApp', [
  'ngRoute',
  'ngSanitize',
  'myApp.filters',
  'myApp.services',
  'myApp.directives',
  'myApp.controllers'
]).
config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/timeline1',
    {templateUrl: 'partials/timeline1.html', controller: 'Timeline1'});
  $routeProvider.when('/timeline1/:room',
    {templateUrl: 'partials/timeline1.html', controller: 'Timeline1'});
  $routeProvider.when('/timeline1/:room/:dt',
    {templateUrl: 'partials/timeline1.html', controller: 'Timeline1'});
  $routeProvider.when('/search1', {templateUrl: 'partials/search1.html',
    controller: 'Search1', reloadOnSearch: false});
  $routeProvider.otherwise({redirectTo: '/timeline1'});
}]).
config(['ngQuickDateDefaultsProvider', function(ngQuickDateDefaultsProvider) {
  ngQuickDateDefaultsProvider.set({
    labelFormat: 'EEE d MMM yyyy',
    //dateFormat: 'dd-MM-yyyy',
    disableTimepicker: 'true',
    defaultTime: '00:00:00'
  });
}]);
// Custom dateFormat currently doesn't work properly

