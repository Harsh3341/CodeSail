build:
	@go build -o bin/codesail-backend/api-server api-server/main.go
	@go build -o bin/codesail-backend/proxy-server proxy-server/main.go

# start the api server and proxy server
run: build
	@./bin/codesail-backend/api-server &
	@./bin/codesail-backend/proxy-server

test:
	@go test -v ./...