#!/bin/bash

SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
ROOT=$(dirname $SCRIPT_DIR)

cd $ROOT

# Update the extension choice lists in .github/workflows/manual-publish.yml and set-prerelease.yml

$SCRIPT_DIR/update-manual-pub-list.mjs
npx prettier -w .github/workflows/manual-publish.yml .github/workflows/set-prerelease.yml
