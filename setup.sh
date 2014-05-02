#!/bin/sh

NPM=`which npm 2>/dev/null`

if [ -z "$NPM" ]; then
	echo 'You must have npm from Node.JS (http://nodejs.org/) installed!'
	exit 1
fi

sudo npm -g install bower ionic
bower install
ionic platform ios android
