#!/bin/sh

for FILE in www/res/icon/ios/*.png; do
	SHORTNAME=`basename $FILE`
	OUTFILE="$SHORTNAME"
	case "$FILE" in
		*-2x.png)
			OUTFILE=`echo "$SHORTNAME" | sed -e 's,-2x.png,\@2x.png,g'`
			;;
	esac
	cp "$FILE" "platforms/ios/DelugeMobile/Resources/icons/$OUTFILE"
done

cp 'www/res/icon/ios/icon-57.png'    'platforms/ios/DelugeMobile/Resources/icons/icon.png'
cp 'www/res/icon/ios/icon-57-2x.png' 'platforms/ios/DelugeMobile/Resources/icons/icon@2x.png'

cp 'www/res/screen/ios/screen-ipad-landscape-2x.png'       'platforms/ios/DelugeMobile/Resources/splash/Default-Landscape@2x~ipad.png'
cp 'www/res/screen/ios/screen-ipad-landscape.png'          'platforms/ios/DelugeMobile/Resources/splash/Default-Landscape~ipad.png'
cp 'www/res/screen/ios/screen-ipad-portrait-2x.png'        'platforms/ios/DelugeMobile/Resources/splash/Default-Portrait@2x~ipad.png'
cp 'www/res/screen/ios/screen-ipad-portrait.png'           'platforms/ios/DelugeMobile/Resources/splash/Default-Portrait~ipad.png'
cp 'www/res/screen/ios/screen-iphone-portrait-2x.png'      'platforms/ios/DelugeMobile/Resources/splash/Default@2x~iphone.png'
cp 'www/res/screen/ios/screen-iphone-portrait.png'         'platforms/ios/DelugeMobile/Resources/splash/Default~iphone.png'
cp 'www/res/screen/ios/screen-iphone-portrait-568h-2x.png' 'platforms/ios/DelugeMobile/Resources/splash/Default-568h@2x~iphone.png'

cp 'www/res/icon/android/icon-36-ldpi.png'  'platforms/android/res/drawable-ldpi/icon.png'
cp 'www/res/icon/android/icon-48-mdpi.png'  'platforms/android/res/drawable-mdpi/icon.png'
cp 'www/res/icon/android/icon-72-hdpi.png'  'platforms/android/res/drawable-hdpi/icon.png'
cp 'www/res/icon/android/icon-96-xhdpi.png' 'platforms/android/res/drawable-xhdpi/icon.png'
cp 'www/res/icon/android/icon-96-xhdpi.png' 'platforms/android/res/drawable/icon.png'

cp 'www/res/screen/android/screen-ldpi-landscape.png'  'platforms/android/res/drawable-ldpi/screen.9.png'
cp 'www/res/screen/android/screen-mdpi-landscape.png'  'platforms/android/res/drawable-mdpi/screen.9.png'
cp 'www/res/screen/android/screen-hdpi-landscape.png'  'platforms/android/res/drawable-hdpi/screen.9.png'
cp 'www/res/screen/android/screen-xhdpi-landscape.png' 'platforms/android/res/drawable-xhdpi/screen.9.png'
cp 'www/res/screen/android/screen-xhdpi-landscape.png' 'platforms/android/res/drawable/screen.9.png'
