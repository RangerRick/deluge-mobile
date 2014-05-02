#!/bin/sh

ROOT="$1"
NEWVERSION=`cat "$ROOT/www/config.xml" | grep '<widget' | sed -e 's,^.*version=",,' -e 's,".*$,,'`
echo "=== Setting version to $NEWVERSION ==="
sed -e "s,@VERSION@,$NEWVERSION,g" "$ROOT/www/templates/settings.html" > "$ROOT/platforms/android/assets/www/templates/settings.html"
sed -e "s,@VERSION@,$NEWVERSION,g" "$ROOT/www/templates/settings.html" > "$ROOT/platforms/ios/www/templates/settings.html"
sed -e "s,@VERSION@,$NEWVERSION,g" "$ROOT/www/templates/settings.html" > "$ROOT/platforms/osx/www/templates/settings.html"

MAJOR=`echo $NEWVERSION | cut -d. -f1`
MINOR=`echo $NEWVERSION | cut -d. -f2`
MICRO=`echo $NEWVERSION | cut -d. -f3`

VERSIONCODE=`printf '%d%02d%02d' "$MAJOR" "$MINOR" "$MICRO"`

perl -pi -e "s,android:versionCode=\"\d+\",android:versionCode=\"$VERSIONCODE\",g" 'platforms/android/AndroidManifest.xml'
