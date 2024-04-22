build:
	@go build -o bin/codesail-backend/api_server api_server/main.go
	@go build -o bin/codesail-backend/proxy_server proxy_server/main.go

# start the api server and proxy server
run: build
	@./bin/codesail-backend/api_server &
	@./bin/codesail-backend/proxy_server

test:
	@go test -v ./...