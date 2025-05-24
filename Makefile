build:
	npx tsc
	cp manifest.json dist/manifest.json

install: build
	cp dist/*.js /Users/kippei.wada/Library/Mobile\ Documents/com~apple~CloudDocs/kip/.obsidian/plugins/process_person_data/
	cp dist/manifest.json /Users/kippei.wada/Library/Mobile\ Documents/com~apple~CloudDocs/kip/.obsidian/plugins/process_person_data/manifest.json

.PHONY: build install 