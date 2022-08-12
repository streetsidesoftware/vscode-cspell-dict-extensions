#!/bin/bash

SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
JQ_FILTER="$SCRIPT_DIR/package_versions.jq"


echo $(ls -1 extensions/*/package.json) \
    | xargs jq -f $JQ_FILTER | jq -s add
