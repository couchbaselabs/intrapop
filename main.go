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

	simple := bleve.NewTextFieldMapping()
	en.Analyzer = "simple"

	m := bleve.NewDocumentMapping()
	m.AddFieldMappingsAt("type", kw)

	mapping := bleve.NewIndexMapping()
	mapping.TypeField = "type"

	// From github/commit...
	m = bleve.NewDocumentMapping()
	m.DefaultAnalyzer = "en"
	m.AddFieldMappingsAt("type", kw)
	m.AddFieldMappingsAt("repo", kw)
	m.AddFieldMappingsAt("id", kw)
	m.AddFieldMappingsAt("parentId", kw)
	m.AddFieldMappingsAt("url", kw)
	// author, authorDate, commit, commitDate, message
	mapping.TypeMapping["github/commit"] = m

	// From confluence/page...
	m = bleve.NewDocumentMapping()
	m.DefaultAnalyzer = "en"
	m.AddFieldMappingsAt("type", kw)
	m.AddFieldMappingsAt("key", simple)
	m.AddFieldMappingsAt("id", kw)
	m.AddFieldMappingsAt("spaceKey", kw)
	// title, creatorName, creationDate, bodyContent,
	// lastModifierName, lastModificationDate,

	author := bleve.NewTextFieldMapping() // Alias lastModifierName as author.
	author.Name = "author"
	author.Analyzer = "simple"
	m.AddFieldMappingsAt("lastModifierName", author)

	mapping.TypeMapping["confluence/page"] = m

	// From beer-sample/beer...
	m = bleve.NewDocumentMapping()
	m.DefaultAnalyzer = "en"
	m.AddFieldMappingsAt("type", kw)
	m.AddFieldMappingsAt("abv", kw)
	m.AddFieldMappingsAt("ibu", kw)
	m.AddFieldMappingsAt("srm", kw)
	m.AddFieldMappingsAt("upc", kw)
	m.AddFieldMappingsAt("brewery_id", kw)
	// name, description, updated, style, category
	mapping.TypeMapping["beer"] = m

	// From beer-sample/brewery...
	m = bleve.NewDocumentMapping()
	m.DefaultAnalyzer = "en"
	m.AddFieldMappingsAt("type", kw)
	// name, description, updated
	// city, state, country, phone, website, address
	// geo / accuracy, lat, lon
	mapping.TypeMapping["brewery"] = m

	return mapping
}
