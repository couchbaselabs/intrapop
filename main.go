//  Copyright (c) 2014 Couchbase, Inc.
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the
//  License. You may obtain a copy of the License at
//    http://www.apache.org/licenses/LICENSE-2.0
//  Unless required by applicable law or agreed to in writing,
//  software distributed under the License is distributed on an "AS
//  IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
//  express or implied. See the License for the specific language
//  governing permissions and limitations under the License.
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/blevesearch/bleve"
	bleveHttp "github.com/blevesearch/bleve/http"

	"github.com/couchbaselabs/cbft"
)

var index = flag.String("index", "http://localhost:9090/api/index/alias0", "index URL")
var addr = flag.String("addr", ":8099", "http listen address")

func main() {
	flag.Parse()

	log.Printf("main: %s started", os.Args[0])
	flag.VisitAll(func(f *flag.Flag) { log.Printf("  -%s=%s\n", f.Name, f.Value) })

	mapping := buildMapping()
	b, err := json.Marshal(mapping)
	if err != nil {
		log.Fatalf("could not JSON encode mapping: %#v", mapping)
	}
	fmt.Printf("mapping:\n%s\n", b)

	// turn on http request logging
	bleveHttp.SetLog(log.New(os.Stderr, "bleve.http", log.LstdFlags))

	alias := bleve.NewIndexAlias()
	alias.Add(&cbft.IndexClient{
		QueryURL: *index + "/query",
		CountURL: *index + "/count",
		// TODO: Consistency params.
		// TODO: Propagate auth to remote client.
	})

	startServer(alias, *addr)
}

func startServer(index bleve.Index, addr string) {
	// create a router to serve static files
	router := staticFileRouter()

	// add the API
	bleveHttp.RegisterIndexName("intrapop", index)
	searchHandler := bleveHttp.NewSearchHandler("intrapop")
	router.Handle("/api/search", searchHandler).Methods("POST")

	http.Handle("/", router)
	log.Printf("listening on %v", addr)
	log.Fatal(http.ListenAndServe(addr, nil))
}

func buildMapping() *bleve.IndexMapping {
	en := bleve.NewTextFieldMapping()
	en.Analyzer = "en"

	kw := bleve.NewTextFieldMapping()
	kw.Analyzer = "keyword"

	m := bleve.NewDocumentMapping()

	// From github/commit...
	m.AddFieldMappingsAt("Type", kw)
	m.AddFieldMappingsAt("RepoName", kw)
	m.AddFieldMappingsAt("Id", kw)
	m.AddFieldMappingsAt("ParentId", kw)
	m.AddFieldMappingsAt("URL", kw)
	m.AddFieldMappingsAt("Author", en)
	m.AddFieldMappingsAt("Date", en)
	m.AddFieldMappingsAt("Message", en)

	// From confluence/page...
	m.AddFieldMappingsAt("Type", kw)
	m.AddFieldMappingsAt("Key", kw)
	m.AddFieldMappingsAt("Title", en)
	m.AddFieldMappingsAt("Id", kw)
	m.AddFieldMappingsAt("SpaceKey", kw)
	m.AddFieldMappingsAt("CreatorName", en)
	m.AddFieldMappingsAt("CreationDate", en)
	m.AddFieldMappingsAt("LastModifierName", en)
	m.AddFieldMappingsAt("LastModifierDate", en)
	m.AddFieldMappingsAt("BodyContent", en)

	// From beer-sample...
	m.AddFieldMappingsAt("name", en)
	m.AddFieldMappingsAt("description", en)
	m.AddFieldMappingsAt("type", kw)
	m.AddFieldMappingsAt("updated", kw)

	// From beer-sample/brewery...
	m.AddFieldMappingsAt("city", en)
	m.AddFieldMappingsAt("state", kw)
	m.AddFieldMappingsAt("country", kw)
	m.AddFieldMappingsAt("phone", kw)
	m.AddFieldMappingsAt("website", kw)
	m.AddFieldMappingsAt("address", en)
	// geo / accuracy,lat,lon

	// From beer-sample/beer...
	m.AddFieldMappingsAt("abv", kw)
	m.AddFieldMappingsAt("ibu", kw)
	m.AddFieldMappingsAt("srm", kw)
	m.AddFieldMappingsAt("upc", kw)
	m.AddFieldMappingsAt("brewery_id", kw)
	m.AddFieldMappingsAt("style", kw)
	m.AddFieldMappingsAt("category", kw)

	mapping := bleve.NewIndexMapping()
	mapping.DefaultMapping = m
	mapping.DefaultAnalyzer = "en"

	return mapping
}
