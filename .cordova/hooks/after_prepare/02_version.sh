#!/bin/sh

ROOT="$1"
NEWVERSION=`cat "$ROOT/www/config.xml" | grep '<widget' | sed -e 's,^.*version=",,' -e 's,".*$,,'`
echo "=== Setting version to $NEWVERSION ==="
sed -e "s,@VERSION@,$NEWVERSION,g" "$ROOT/www/templates/settings.html" > "$ROOT/platforms/android/assets/www/templates/settings.html"
sed -e "s,@VERSION@,$NEWVERSION,g" "$ROOT/www/templates/settings.html" > "$ROOT/platforms/ios/www/templates/settings.html"
