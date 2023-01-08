#!/bin/bash

SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
ROOT=$(dirname $SCRIPT_DIR)

cd $ROOT

# Update .github/workflows/manual-publish.yml

$SCRIPT_DIR/update-manual-pub-list.mjs
npx prettier -w .github/workflows/manual-publish.yml
