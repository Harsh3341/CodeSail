package main

import (
	"log"

	"github.com/Harsh3341/CodeSail-Backend/proxy-server/api"
)

func main() {

	proxyServer := api.NewProxyServer(":8081")
	if err := proxyServer.Run(); err != nil {
		log.Fatal(err)
	}
}
