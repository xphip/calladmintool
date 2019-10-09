package tools

import (
	"os"
	"os/signal"
)

type Sleeper struct {
	Signal chan os.Signal
	Close chan bool
}

func NewSleeper() (*Sleeper) {
	sleeper := &Sleeper{
		Signal: make(chan os.Signal, 1),
		Close: make(chan bool, 1),
	}

	signal.Notify(sleeper.Signal)

	go func(){
		<-sleeper.Signal
		close(sleeper.Close)
	}()

	return sleeper
}