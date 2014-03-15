'use strict';

/* Services */


// Demonstrate how to register services
// In this case it is a simple value service.
angular.module('myApp.services', []).
  factory('dateUtils', function() {

    // Midnight at the start of the day
    function getStartOfDay(date) {
      var s = new Date(date);
      s.setHours(0);
      s.setMinutes(0);
      s.setSeconds(0);
      s.setMilliseconds(0);
      return s;
    }

    // Midnight at the end of the day
    function getEndOfDay(date) {
      var s = getStartOfDay(date);
      s.setDate(s.getDate() + 1);
      return s;
    }

    // Is this a valid date object
    function isValid(date) {
      return !isNaN(date.getTime());
    }

    // Create a date object from an ISO8601 string
    function dateFromIso(s) {
      var d = new Date(Date.parse(s));
      if (!isValid(d)) {
        throw 'Invalid date: ' + s;
      }
      return d;
    }

    // Add/subtract days to a date
    function incrDate(date, inc) {
      var d = new Date(date);
      d.setDate(date.getDate() + inc);
      return d;
    }

    // Add/subtract milliseconds to a date
    function incrMilliseconds(date, inc) {
      var d = new Date(date);
      d.setMilliseconds(date.getMilliseconds() + inc);
      return d;
    };

    return {
      getStartOfDay: getStartOfDay,
      getEndOfDay: getEndOfDay,
      dateFromIso: dateFromIso,
      incrDate: incrDate,
      incrMilliseconds: incrMilliseconds
    };
  }).
  value('version', '0.1');
