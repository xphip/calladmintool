package tools

import (
	"fmt"
	"log"
	"time"
	"os"
	"runtime"
	"io"
	"net/http"
	"regexp"

	"github.com/gorilla/websocket"
)

type WS struct {
	Server *http.Server
	Mux *http.ServeMux
	Addr string
	DemoPath string
	Repo string
}

type RequestJSON struct {
	Command string
	Text string
}

type ResponseJSON struct {
	Status string
	Text string
}

func RunWebServer(demoPath string, addr string, repo string) (*WS) {

	slash := "/"
	path := fmt.Sprintf("%s", demoPath)

	if runtime.GOOS == "windows" {
		slash = "\\"
	}

	if string(demoPath[len(demoPath)-1]) != slash {
		path = fmt.Sprintf("%s%s%s", demoPath, slash, "csgo/")
	} else {
		path = fmt.Sprintf("%s%s", demoPath, "csgo/")
	}

	if _, err := os.Stat(path); os.IsNotExist(err) {
		fmt.Printf("Erro! Diretório inexistente.")
		os.Exit(1)
	}

	ws := &WS{}
	ws.Addr = addr
	ws.DemoPath = path
	ws.Repo = repo

	ws.NewServer()
	ws.RegisterRoutes()

	go ws.Start()

	return ws
}

func (ws *WS) NewServer() (*WS) {

	ws.Mux = http.NewServeMux()

	ws.Server = &http.Server{
		Addr:           ws.Addr,
		Handler:        ws.Mux,
		ReadTimeout:    10 * time.Second,
		WriteTimeout:   10 * time.Second,
		MaxHeaderBytes: 1 << 20,
	}

	return ws
}

func (ws *WS) Start() {
	ws.Server.ListenAndServe()
}

func (ws *WS) RegisterRoutes() {

	// ws.Mux.Handle("/", http.FileServer(http.Dir("./www")))
	ws.Mux.Handle("/", http.RedirectHandler(ws.Repo, http.StatusSeeOther))

	ws.Mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {

		if r.Header.Get("Upgrade") == "" {
			http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
			return
		}

		conn, err := websocket.Upgrade(w, r, w.Header(), 1024, 1024)
		if err != nil {
			http.Error(w, "Could not open websocket connection", http.StatusBadRequest)
		}

		func(conn *websocket.Conn) {
			defer conn.Close()

			for {
				request := &RequestJSON{}
				response := &ResponseJSON{}

				err := conn.ReadJSON(&request)
				if err != nil {
					log.Println("Error reading json.", err)
					return
				}

				file := fmt.Sprintf("%s%s", ws.DemoPath, ParseUrl(request.Text))

				if request.Command == "check" {

					if _, err := os.Stat(file); os.IsNotExist(err) {
						response.Status = "error"
						response.Text = "1" // 1 = Download
					} else {
						response.Status = "success"
						response.Text = "3" // 3 = Ready
					}

				} else if request.Command == "download" {

					if code, err := DownloadFile(file, request.Text); err != nil || code != "" {
						response.Status = "error"
						response.Text = fmt.Sprintf("Erro ao tentar baixar a demo. (%s)", code)
					} else {
						response.Status = "finished"
						response.Text = "3"
					}

				}

				if err = conn.WriteJSON(response); err != nil {
					log.Println(err)
					return
				}

			}
		}(conn)
	})

}

func ParseUrl(file string) (string) {

	m := regexp.MustCompile(`([0-9A-Za-z\_\-\.]+\.dem)$`)
	demo := m.FindAllString(file, -1)

	return demo[0]
}

func DownloadFile(filepath string, url string) (string, error) {

	resp, err := http.Get(url)
	if err != nil || resp.StatusCode != 200 {
		return resp.Status, err
	}
	defer resp.Body.Close()

	out, err := os.Create(filepath)
	if err != nil {
		return "", err
	}
	defer out.Close()

	_, err = io.Copy(out, resp.Body)
	return "", err
}