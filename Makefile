default: build-intrapop incremental-update

build-intrapop:
	go get
	go build -tags libstemmer

incremental-update:
	./grab-gerrit
	./grab-confluence
	./grab-github
