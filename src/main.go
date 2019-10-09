package main

import (
	// "fmt"
	"log"
	"os"
	"strings"
	"flag"

	"./tools"
)

var (
	appName = "CalladminTool Lite"
	repo = "https://github.com/xphip/calladmintool.lite"
	appVersion = "0.0.1"
	CSGO_Path = flag.String("d", "./", "Diretório ROOT do CSGO (Ex: '../common/Counter-Strike Global Offensive/').")
	addr = flag.String("addr", ":8081", "Host:Porta padrão para o webserver (Ex: localhost:8081).\nCUIDADO: caso informado, não esqueça de mudar no script JS também!")
)

func main() {

	flag.Parse()

	Log(appName, "started.")

	sleeper := tools.NewSleeper()
	_ = tools.RunWebServer(*CSGO_Path, *addr, repo)

	<-sleeper.Close

	Log(appName, "finished.")
	os.Exit(0)
}

func Log(text ...string) {
	log.Printf("%s\n", strings.Join(text, " "))
}