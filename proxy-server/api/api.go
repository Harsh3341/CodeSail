package api

import (
	"log"
	"net/http"

	"github.com/gorilla/mux"
)

type ProxyServer struct {
	addr string
}

func NewProxyServer(addr string) *ProxyServer {
	return &ProxyServer{
		addr: addr,
	}
}

func (s *ProxyServer) Run() error {
	router := mux.NewRouter()
	subrouter := router.PathPrefix("/api/v1").Subrouter()

	proxyHandler := func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Proxy"))
	}

	subrouter.HandleFunc("/proxy", proxyHandler).Methods("GET")

	log.Println("Listening on", s.addr)

	return http.ListenAndServe(s.addr, router)
}
