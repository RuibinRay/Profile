#!/bin/sh
# build_vendor.sh — refresh the libraries in assets/vendor/ (run from the repository root).
# three.js no longer ships a single minified module, so it is bundled here with esbuild.
set -e
THREE=${1:-0.187.0}; GSAP=${2:-3.15.1}
TMP=$(mktemp -d)
( cd "$TMP" && npm pack "three@$THREE" "gsap@$GSAP" --silent && mkdir three gsap \
  && tar -xzf "three-$THREE.tgz" -C three && tar -xzf "gsap-$GSAP.tgz" -C gsap \
  && npx --yes esbuild@0.24.0 three/package/build/three.module.js --bundle --minify --format=esm --outfile=three.module.min.js )
cp "$TMP/three.module.min.js" assets/vendor/
cp "$TMP/gsap/package/dist/gsap.min.js" "$TMP/gsap/package/dist/ScrollTrigger.min.js" assets/vendor/
rm -rf "$TMP"
echo "assets/vendor updated: three $THREE, gsap $GSAP"
