#!/bin/bash

SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
JQ_FILTER_PACKAGES="$SCRIPT_DIR/gen-release-please-config-packages.jq"

PACKAGES="$(echo $(ls -1 extensions/*/package.json) \
    | xargs jq -f $JQ_FILTER_PACKAGES | jq -s "add | { packages: . }")"


RESULT="$(echo $(cat ./release-please-config.json) $PACKAGES  | jq -s ".[0] + .[1]" | jq --indent 4 .)"

echo "$RESULT" > ./release-please-config.json

npx prettier -w r*.json
