##
# CalladminTool Lite Maker
##

SHELL := /bin/bash

# VER = $(shell cat ./version)
VER = "latest"

run:
	clear && \
	pushd ${PWD}/temp/ && \
	go run ${PWD}/src/main.go && \
	popd

build:
	pushd ${PWD}/temp/ && \
	go build -o ./bin/cat_lite_${VER} src/main.go
	popd
