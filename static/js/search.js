function SearchCtrl($scope, $http, $routeParams, $log, $sce, $location) {
  $log.log("in search control");

  $scope.maxPagesToShow = 5;
  $scope.resultsPerPage = 10;
  $scope.page = 1;
  $scope.filters = {};

  $http.get('/api/lastUpdated').
    success(function(data) {
      $scope.lastUpdated = data.last_updated;
    });

  $scope.updateSyntax = function() {
    $scope.page = 1;
    $location.search('q', $scope.syntax);
    $location.search('p', $scope.page);
  };

  $scope.searchSyntax = function() {
    $log.log("performing search");
    $log.log($scope.filters);

    $scope.numPages = 0;
    $scope.results = null;
    from = ($scope.page-1)*$scope.resultsPerPage;
    conjuncts = [
      {
        "boost": 1.0,
        "query": $scope.syntax
      }
    ];

    catf = $location.search().cat;
    if (catf !== undefined) {
      $scope.filters["category"] = {
        "field": "category",
        "match_phrase": catf
      };
    }

    df = $location.search().df;
    if (df === 'Saturday') {
      $scope.filters["start"] = {
        "field": "start",
        "end": "2015-02-01T00:00:00Z"
      };
    } else if (df === 'Sunday') {
      $scope.filters["start"] = {
        "field": "start",
        "start": "2015-02-01T00:00:00Z"
      };
    }

    nf = $location.search().nf;
    if (nf === '<=30 min') {
      $scope.filters["duration"] = {
        "field": "duration",
        "max": 31
      };
    } else if (nf === '30-60 min') {
      fv = {
        "conjuncts": []
      };
      fv.conjuncts.push({
        "field": "duration",
        "min": 31
      });
      fv.conjuncts.push({
        "field": "duration",
        "max": 61
      });
      $scope.filters["duration"] = fv;
    } else if (nf === '60+ min') {
      $scope.filters["duration"] = {
        "field": "duration",
        "min": 61
      };
    }

    for(var key in $scope.filters) {
      conjuncts.push($scope.filters[key]);
    }
    $http.post('/api/search', {
      "size": $scope.resultsPerPage,
      "from": from,
      "explain": true,
      "highlight":{
        "fields": ["description"],
      },
      "query":  {
        "conjuncts": conjuncts
      },
      "facets": {
        "Categories": {
          "field": "category",
          "size": 5
        },
        "Day": {
          "field": "start",
          "size": 2,
          "date_ranges": [
            {
              "name": "Saturday",
              "end": "2015-02-01T00:00:00Z"
            },
            {
              "name": "Sunday",
              "start": "2015-02-01T00:00:00Z"
            }
          ]
        },
        "Duration": {
          "field": "duration",
          "size": 3,
          "numeric_ranges": [
            {
              "name": "<=30 min",
              "max": 31
            },
            {
              "name": "30-60 min",
              "min": 31,
              "max": 61
            },
            {
              "name": "60+ min",
              "min": 61
            }
          ]
        }
      },
      "fields": ["summary","description","speaker", "location","duration","start","url"]
    }).
    success(function(data) {
      $log.log("process results");
      $scope.processResults(data);
    }).
    error(function(data, code) {
      $scope.errorMessage = data;
    });
    $log.log("done search");
  };

  if($location.search().p !== undefined) {
    page = parseInt($location.search().p,10);
    if (typeof page == 'number' && !isNaN(page) && isFinite(page) && page > 0 ){
      $scope.page = page;
    }
  }
  if($location.search().q !== undefined) {
    $scope.syntax = $location.search().q;
    $log.log("redoing search from url");
    $scope.searchSyntax();
  }

  $scope.expl = function(explanation) {
      rv = "" + $scope.roundScore(explanation.value) + " - " + explanation.message;
      rv = rv + "<ul>";
      for(var i in explanation.children) {
          child = explanation.children[i];
          rv = rv + "<li>" + $scope.expl(child) + "</li>";
      }
      rv = rv + "</ul>";
      return rv;
  };

  $scope.roundScore = function(score) {
      return Math.round(score*1000)/1000;
  };

  $scope.roundTook = function(took) {
    if (took < 1000 * 1000) {
      return "<1ms";
    } else if (took < 1000 * 1000 * 1000) {
      return "" + Math.round(took / (1000*1000)) + "ms";
    } else {
      roundMs = Math.round(took / (1000*1000));
      return "" + roundMs/1000 + "s";
    }
	};

  $scope.setupPager = function(results) {
    $scope.numPages = Math.ceil(results.total_hits/$scope.resultsPerPage);
    $scope.validPages = [];
    for (i = 1; i <= $scope.numPages; i++) {
      $scope.validPages.push(i);
    }


    // now see if we have too many pages
    if ($scope.validPages.length > $scope.maxPagesToShow) {
      numPagesToRemove = $scope.validPages.length - $scope.maxPagesToShow;
      frontPagesToRemove = backPagesToRemove = 0;
      while (numPagesToRemove - frontPagesToRemove - backPagesToRemove > 0) {
        numPagesBefore = $scope.page - 1 - frontPagesToRemove;
        numPagesAfter = $scope.validPages.length - $scope.page - backPagesToRemove;
        if (numPagesAfter > numPagesBefore) {
          backPagesToRemove++;
        } else {
          frontPagesToRemove++;
        }
      }

      // remove from the end first, to keep indexes simpler
      $scope.validPages.splice(-backPagesToRemove, backPagesToRemove);
      $scope.validPages.splice(0, frontPagesToRemove);
    }
  };

  $scope.filterTerm = function(term) {
    if('category' in $scope.filters) {
       delete $scope.filters['category'];
       $location.search('cat', undefined);
    } else {
      $location.search('cat', term);
    }
    // also go back to page 1
    $scope.jumpToPage(1, null);
  };

  $scope.filterDate = function(name) {
    if('start' in $scope.filters) {
       delete $scope.filters['start'];
       $location.search('df', undefined);
    } else {
      $location.search('df', name);
    }
    // also go back to page 1
    $scope.jumpToPage(1, null);
  };

  $scope.filterNumber = function(name) {
    if('duration' in $scope.filters) {
       delete $scope.filters['duration'];
       $location.search('nf', undefined);
     } else {
      $location.search('nf', name);
    }
    // also go back to page 1
    $scope.jumpToPage(1, null);
  };

  $scope.checkFilter = function(field) {
    if(field in $scope.filters) {
      return true;
    }
    return false;
  };

  $scope.processResults = function(data) {
    $scope.errorMessage = null;
    $scope.results = data;
    $scope.setupPager($scope.results);
    for(var i in $scope.results.hits) {
        hit = $scope.results.hits[i];
        hit.roundedScore = $scope.roundScore(hit.score);
        hit.explanationString = $scope.expl(hit.explanation);
        hit.explanationStringSafe = $sce.trustAsHtml(hit.explanationString);
        for(var ff in hit.fragments) {
          fragments = hit.fragments[ff];
          newFragments = [];
          for(var ffi in fragments) {
            fragment = fragments[ffi];
            safeFragment = $sce.trustAsHtml(fragment);
            newFragments.push(safeFragment);
          }
          hit.fragments[ff] = newFragments;
        }
        hit.speaker_linkname = hit.fields.speaker;
        hit.speaker_linkname =hit.speaker_linkname.toLowerCase();
        hit.speaker_linkname = hit.speaker_linkname.replace(" ", "_");
    }
    $scope.results.roundTook = $scope.roundTook(data.took);
  };

  $scope.jumpToPage = function(pageNum, $event) {
    if ($event) {
      $event.preventDefault();
    }

    $scope.page = pageNum;
    $log.log("doing jump");
    $location.search('p', $scope.page);
  };
}
