#!/bin/bash

SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
JQ_FILTER_PACKAGES="$SCRIPT_DIR/code-workspace-packages.jq"

FOLDERS="$(echo $(ls -1 extensions/*/package.json) \
    | xargs jq -f $JQ_FILTER_PACKAGES \
    | jq ".path" | jq -s ".")"

echo $FOLDERS
