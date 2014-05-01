angular.module('DelugeMobile', [
	'ionic',
	'jmdobry.angular-cache',
	'dm.services',
	'dm.controllers'
])

.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {

	$stateProvider

	// setup an abstract state for the tabs directive
	.state('tab', {
		url: "/tab",
		abstract: true,
		templateUrl: "templates/tabs.html"
	})

	// the pet tab has its own child nav-view and history
	.state('tab.downloads-index', {
		url: '/downloads',
		views: {
			'downloads-tab': {
				templateUrl: 'templates/downloads-index.html',
				controller: 'DownloadsIndexCtrl'
			}
		}
	})

	.state('tab.settings', {
		url: '/settings',
		views: {
			'settings-tab': {
				templateUrl: 'templates/settings.html',
				controller: 'SettingsCtrl'
			}
		}
	})

	.state('tab.about', {
		url: '/about',
		views: {
			'about-tab': {
				templateUrl: 'templates/about.html'
			}
		}
	});

	// if none of the above states are matched, use this as the fallback
	$urlRouterProvider.otherwise('/tab/downloads');

}]).run(['$q', '$interval', '$rootScope', '$ionicPopup', '$angularCacheFactory', 'DelugeService', function($q, $interval, $rootScope, $ionicPopup, $angularCacheFactory, deluge) {
	$angularCacheFactory('torrentCache', {
		maxAge: 5 * 60 * 1000, // 5 minutes
		deleteOnExpire: 'aggressive'
	});

	var registerListeners = function(sessionId) {
		var deferred = $q.defer();
		
		var events = [
			'ConfigValueChangedEvent',
			'NewVersionAvailableEvent',
			'PluginDisabledEvent',
			'PluginEnabledEvent',
			'PreTorrentRemovedEvent',
			'SessionPausedEvent',
			'SessionResumedEvent',
			'SessionStartedEvent',
			'TorrentAddedEvent',
			'TorrentFileRenamedEvent',
			'TorrentFinishedEvent',
			'TorrentFolderRenamedEvent',
			'TorrentQueueChangedEvent',
			'TorrentRemovedEvent',
			'TorrentResumedEvent',
			'TorrentStateChangedEvent'
		];

		var registerEvent = function(def) {
			if (events.length > 0) {
				var ev = events.shift();
				console.log('Registering for event: ' + ev);
				deluge.registerEventListener(ev).then(function() {
					registerEvent(def);
				}, function(err) {
					def.reject(err);
				});
			} else {
				def.resolve(true);
			}
		};

		registerEvent(deferred);
		return deferred.promise;
	};

	var startUpdates = function() {
		console.log('Starting updates.');
		registerListeners($rootScope.sessionId).then(function() {
			deluge.connected().then(function() {
				deluge.start();
			});
		}, function(error) {
			console.log('Error: ' + error);
		});
	};

	var init = function() {
		deluge.start();
	};

	init();
	$rootScope.$on('dm.settings-changed', function(ev, settings) {
		init();
	});
}]);
