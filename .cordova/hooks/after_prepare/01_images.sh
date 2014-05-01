#!/bin/sh

for FILE in www/res/icon/ios/*.png; do
	SHORTNAME=`basename $FILE`
	case "$FILE" in
		*-2x.png)
			OUTFILE=`echo "$SHORTNAME" | sed -e 's,-2x.png,\@2x.png,g'`
			cp "$FILE" "platforms/ios/DelugeMobile/Resources/icons/$OUTFILE"
			;;
		*)
			cp "$FILE" "platforms/ios/DelugeMobile/Resources/icons/$SHORTNAME"
			;;
	esac
done

cp 'www/res/icon/ios/icon-57.png'    'platforms/ios/DelugeMobile/Resources/icons/icon.png'
cp 'www/res/icon/ios/icon-57-2x.png' 'platforms/ios/DelugeMobile/Resources/icons/icon@2x.png'
