package deploy

import (
	"net/http"

	"github.com/gorilla/mux"
)

type Handler struct {
}

func NewHandler() *Handler {
	return &Handler{}
}

func (h *Handler) DeployRoutes(router *mux.Router) {
	router.HandleFunc("/deploy", h.handleDeploy).Methods("POST")
}

func (h *Handler) handleDeploy(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Deploy"))
}
