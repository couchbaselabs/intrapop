default: intrapop incremental-update

intrapop:
	go get
	go build

incremental-update:
	./grab-github
	./grab-confluence
