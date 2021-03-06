'use strict';

angular.module('myApp', [
  'ngRoute',
]).
filter('relDate', function() {
        return function(dstr) {
            return moment(dstr).fromNow();
        };
}).
filter('fmtDay', function() {
        return function(dstr) {
            return moment(dstr).format('dddd');
        };
}).
filter('fmtTime', function() {
        return function(dstr) {
            return moment(dstr).format('H:mm');
        };
}).
config(['$routeProvider', '$locationProvider',
  function($routeProvider, $locationProvider) {
    $routeProvider.when('/search/', {
      templateUrl: '/static/partials/search/syntax.html',
      controller: 'SearchCtrl'
    });
    $routeProvider.otherwise({redirectTo: '/search/'});
    $locationProvider.html5Mode(true);
  }]);
