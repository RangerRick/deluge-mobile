#!/bin/sh

ROOT="$1"

if [ -z "$SIGNING_PASS" ]; then
	exit 0
fi

#for FILE in "DelugeMobile-debug.apk" "DelugeMobile-release-unsigned.apk"; do
for FILE in "DelugeMobile-release-unsigned.apk"; do
	INPUTFILE="$ROOT/platforms/android/ant-build/$FILE";
	OUTPUTFILE=`echo $INPUTFILE | sed -e 's,debug,debug-signed,g' -e 's,release-unsigned,release-signed,g'`

	if [ -e "$INPUTFILE" ] && [ "$INPUTFILE" -nt "$OUTPUTFILE" ]; then
		echo "=== $INPUTFILE is updated; signing ==="
		rm -f "$OUTPUTFILE" || :
		jarsigner -storepass "$SIGNING_PASS" -keystore ~/share/android/android-release-key.keystore -digestalg SHA1 -sigalg MD5withRSA "$INPUTFILE" ranger >/dev/null
		zipalign 4 "$INPUTFILE" "$OUTPUTFILE"
	fi
done
