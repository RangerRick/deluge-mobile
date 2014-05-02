#!/bin/sh

sudo npm -g install bower ionic
bower install
ionic platform ios android

# this is done with a hook now
#cordova plugin add 'com.verso.cordova.clipboard'
#cordova plugin add 'org.apache.cordova.console'
#cordova plugin add 'org.apache.cordova.device'
#cordova plugin add 'org.apache.cordova.statusbar'
