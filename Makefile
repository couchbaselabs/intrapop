default: build-intrapop incremental-update

build-intrapop:
	go get
	go build

incremental-update:
	./grab-github
	./grab-confluence
