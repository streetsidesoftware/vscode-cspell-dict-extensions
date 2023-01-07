#!/bin/bash

SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
JQ_FILTER_PACKAGES="$SCRIPT_DIR/code-workspace-packages.jq"
JQ_FILTER_CONFIG="$SCRIPT_DIR/gen-release-please-config.jq"


FOLDERS="$(echo "./package.json" "./generator-cspell-dicts-extensions/package.json" $(ls -1 extensions/*/package.json) \
    | xargs jq -f $JQ_FILTER_PACKAGES \
    | jq -s  "sort_by(.path) | { folders: . }")"

RESULT="$(echo $(cat ./dict-extensions.code-workspace) $FOLDERS  | jq -s ".[0] + .[1]" | jq --indent 4 .)"

echo "$RESULT" > ./dict-extensions.code-workspace

# Update README.md

./scripts/gen-extension-list.mjs
npx prettier -w static/generated/*.md
npx inject-markdown README.md
npx prettier -w README.md

# Update .github/workflows/manual-publish.yml

./scripts/update-manual-pub-list.mjs
npx prettier -w .github/workflows/*
