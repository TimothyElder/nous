.PHONY: clean install build package

clean:
	rm -rf node_modules package-lock.json

install:
	npm install

build:
	npm run compile

package: clean install build
	vsce package