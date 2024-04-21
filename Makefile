build:
	@go build -o bin/codesail-backend cmd/main.go

run: build
	@./bin/codesail-backend

test:
	@go test -v ./...