.PHONY: build run test clean

CC ?= clang
CFLAGS ?= -O2 -Wall -Wextra

build: bin/k08hid

bin/k08hid: native/k08hid.c
	@mkdir -p bin
	$(CC) $(CFLAGS) $< -framework IOKit -framework CoreFoundation -o $@

run: build
	python3 server.py

test:
	python3 -m unittest discover -s tests -v

clean:
	rm -f bin/k08hid
