var typeColors = {
  "github/commit": "#428bca;"
};

function SearchCtrl($scope, $http, $routeParams, $log, $sce, $location) {
  $log.log("in search control");

  $scope.maxPagesToShow = 5;
  $scope.resultsPerPage = 50;
  $scope.page = 1;
  $scope.filters = {};

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

    for(var key in $location.search()) {
      if (key.match(/^filter_/)) {
        var field = key.split("_")[1];
        var term = $location.search()[key];
        console.log("field and term:", field, term);
        $scope.filters[field] = {
          "field": field,
          "match_phrase": term,
        };
      }
    }

    for(var key in $scope.filters) {
      conjuncts.push($scope.filters[key]);
    }

    $http.post('/api/search', {
      "size": $scope.resultsPerPage,
      "from": from,
      "explain": true,
      "highlight": {},
      "query":  {
        "conjuncts": conjuncts
      },
      "facets": {
        "00-types": {
          "field": "type", // Ex: "github/commit", "confluence/page", etc.
          "size": 30
        },
        "01-repos": {
          "field": "repo",
          "size": 200
        },
        "02-authors": {
          "field": "authorFacet",
          "size": 50
        },
      },
      "fields": ["*"],
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

  $scope.filterTerm = function(field, term) {
    console.log(field, term);
    if(field in $scope.filters) {
       delete $scope.filters[field];
       $location.search("filter_" + field, undefined);
    } else {
       $location.search("filter_" + field, term);
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

    for(var facetName in $scope.results.facets) {
      facet = $scope.results.facets[facetName];
      facet.shortName = facetName.split("-")[1] || facetName;
      if (facet.terms) {
        facet.terms.sort(function(a, b) {
          if (a.count != b.count) {
            return b.count - a.count;
          }
          if (a.term == b.term) {
            return 0;
          }
          return a.term < b.term ? -1 : 1;
        });
      }
    }

    for(var i in $scope.results.hits) {
        hit = $scope.results.hits[i];
        hit.roundedScore = $scope.roundScore(hit.score);
        hit.explanationString = $scope.expl(hit.explanation);
        hit.explanationStringSafe = $sce.trustAsHtml(hit.explanationString);

        hit.title = hit.fields.title || hit.fields.name;
        if (!hit.title && hit.fields.message) {
            hit.title = hit.fields.message.split("\n")[0];
        }

        var hitFragments = {};
        for(var ff in hit.fragments) {
          console.log("ff", ff);
          if (ff != "title" && ff != "author") {
            fragments = hit.fragments[ff];
            newFragments = [];
            for(var ffi in fragments) {
              fragment = fragments[ffi];
              safeFragment = $sce.trustAsHtml(fragment);
              newFragments.push(safeFragment);
            }
            hitFragments[ff] = newFragments;
          }
        }
        hit.fragments = hitFragments;
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

  $scope.typeColor = function(t) {
      return typeColors[t];
  }
}
