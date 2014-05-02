angular.module('dm.controllers', [
	'jmdobry.angular-cache',
	'angularLocalStorage',
	'dm.services'
])

// A simple controller that fetches a list of data from a service
.directive('dmProgress', function() {
	return {
		restrict: 'A',
		templateUrl: 'templates/progress.html',
		transclude: true,
		scope: {},
		link: function(scope, elem, attrs) {
			scope.height = attrs.dmHeight || '10px';
			scope.state = attrs.dmState;
			scope.progress = attrs.dmProgress;

			attrs.$observe('dmState', function(newValue) {
				scope.state = newValue;
			});
			attrs.$observe('dmProgress', function(newValue) {
				scope.progress = newValue;
			});
			/*
			scope.getBackgroundSize = function() {
				var progress = parseFloat(scope.progress, 10);
				if (progress === NaN) {
					progress = '0';
				} else {
					progress = progress.toFixed(2);
				}
				return progress+'% ' + scope.height;
			};
			*/
		}
	};
})
.directive('detectSwipe', function($ionicGesture) {
	return {
		restrict :  'A',
		link : function(scope, elem, attrs) {
			$ionicGesture.on('dragleft', scope.reportEvent, elem);
		}
	};
})
	
.controller('DownloadsIndexCtrl', ['$rootScope', '$scope', '$window', '$timeout', '$ionicModal', '$ionicPopup', '$ionicActionSheet', '$ionicListDelegate', '$ionicScrollDelegate', '$angularCacheFactory', 'storage', 'DelugeService', function($rootScope, $scope, $window, $timeout, $ionicModal, $ionicPopup, $ionicActionSheet, $ionicListDelegate, $ionicScrollDelegate, $angularCacheFactory, storage, DelugeService) {
	console.log('Downloads Controller Initialized.');
	var sizes_long = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
	var sizes_short = ['B', 'K', 'M', 'G', 'T'];

	$scope.toSpeed = function(bytes, useShort) {
		if (bytes === 0 || bytes === undefined || bytes === NaN) return '0';
		var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1000)));
		var size = useShort? sizes_short[i] : sizes_long[i];
		if (!useShort) {
			size = ' ' + size + '/s';
		}
		var value = (bytes / Math.pow(1000, i));
		var fixed = value.toFixed(2);
		if (fixed.match(/\.00$/)) {
			return value.toFixed() + size;
		} else {
			return fixed + size;
		}
	};

	$scope.toEta = function(eta) {
		return moment().add('seconds', eta).fromNow(true);
	};

	$scope.toProgress = function(percent) {
		var value = parseFloat(percent);
		return value.toFixed(2);
	};

	$scope.shouldShowDelete = false;
	$scope.shouldShowReorder = false;
	$scope.downloadRate = '?';
	$scope.uploadRate = '?';

	$scope.active = false;
	$scope.swiped = false;

	$scope.settings = storage.get('dm.settings') || {};
	if (!$scope.settings.refresh) {
		$scope.settings.refresh = 5000;
	}

	$scope.reportEvent = function(evt) {
		$scope.swiped = true;
		return true;
	};

	var updateUI = function() {
		var cache = $angularCacheFactory.get('torrentCache');
		$scope.torrents = cache.get('torrents') || [];
		var stats = cache.get('stats');

		var downloadRate, uploadRate;

		if (stats) {
			$scope.downloadRate = $scope.toSpeed(stats.download_rate, true);
			$scope.uploadRate   = $scope.toSpeed(stats.upload_rate,   true);
		} else {
			$scope.downloadRate = $scope.uploadRate = '?';
		}

		$scope.active = $scope.torrents.length > 0;

		$ionicScrollDelegate.resize();
	};

	$scope.toSize = function(size) {
		return $scope.toSpeed(size, true);
	};

	$scope.closeModal = function(modal) {
		if (modal) {
			modal.hide();
		} else {
			console.log('WARNING!  No modal specified!');
		}
	};

	$ionicModal.fromTemplateUrl('templates/torrent-view.html', {
		animation: 'slide-in-up',
		focusFirstInput: true,
		scope: $scope
	}).then(function(modal) {
		$scope.torrentDetailsView = modal;
	});
	
	$ionicModal.fromTemplateUrl('templates/settings.html', {
		animation: 'slide-in-up',
		focusFirstInput: true,
		scope: $scope
	}).then(function(modal) {
		$scope.settingsView = modal;
	});

	$scope.hasRate = function(value) {
		if (value === '?' || value === 0 || value === '0') {
			return false;
		} else {
			return true;
		}
	};

	$scope.openSettings = function() {
		$scope.settingsView.show();
	};

	$scope.saveSettings = function() {
		console.log('saveSettings');
		var settings = storage.get('dm.settings') || {};
		var changed = (
			$scope.settings.server   !== settings.server ||
			$scope.settings.password !== settings.password ||
			$scope.settings.refresh  !== settings.refresh
		);
		console.log('saveSettings changed=' + changed);
		if (changed) {
			storage.set('dm.settings', $scope.settings);
			$timeout(function() {
				var cache = $angularCacheFactory.get('torrentCache');
				if (cache) {
					cache.removeAll();
				}
				$rootScope.$broadcast('dm.settings-changed', $scope.settings);
			});
		}
		$scope.closeModal($scope.settingsView);
	};

	$scope.resetSettings = function() {
		$scope.settings = storage.get('dm.settings') || {};
		console.log('resetSettings');
		$scope.closeModal($scope.settingsView);
	};

	$scope.closeOptions = function() {
		$ionicListDelegate.$getByHandle('torrents').closeOptionButtons();
		$scope.swiped = false;
	};

	$scope.handleTorrent = function(torrent) {
		console.log('Torrent tapped: ' + torrent.name);
		if ($scope.swiped) {
			$scope.closeOptions();
		} else {
			$scope.torrentDetailsView.scope.torrent = torrent;
			$scope.torrentDetailsView.show();
		}
	};

	$scope.toggleState = function(torrent) {
		if (torrent && torrent.state === 'Paused') {
			console.log('Un-pausing ' + torrent.name);
			DelugeService.resume(torrent.hash);
		} else if (torrent && torrent.state === 'Seeding') {
			console.log('Pausing ' + torrent.name);
			DelugeService.pause(torrent.hash);
		}
		$scope.closeOptions();
	};

	$scope.addUrl = function() {
		$ionicPopup.prompt({
			title: 'Add Torrent URL',
			inputType: 'url',
			inputPlaceholder: 'http://host/file.torrent'
		}).then(function(url) {
			DelugeService.add(url);
		});
	};

	$scope.resumeAll = function() {
		var cache = $angularCacheFactory.get('torrentCache');
		var hashes = [];
		var torrents = cache.get('torrents') || [];
		angular.forEach(torrents, function(torrent) {
			hashes.push(torrent.hash);
		});
		console.log('Resuming ' + hashes);
		DelugeService.resume(hashes);
	};

	$scope.pauseAll = function() {
		var cache = $angularCacheFactory.get('torrentCache');
		var hashes = [];
		var torrents = cache.get('torrents') || [];
		angular.forEach(torrents, function(torrent) {
			hashes.push(torrent.hash);
		});
		console.log('Pausing ' + hashes);
		DelugeService.pause(hashes);
	};

	$scope.isPaused = function(torrent) {
		return (torrent && torrent.state === 'Paused');
	};

	$scope.onDelete = function(torrent) {
		$scope.closeOptions();
		$ionicActionSheet.show({
			titleText: 'Remove Torrent',
			buttons: [
				{ text: 'Remove Torrent', type: 'assertive' }
			],
			destructiveText: 'Remove with Data',
			cancelText: 'Cancel',
			buttonClicked: function(index) {
				console.log('Remove Torrent: ' + torrent.name);
				DelugeService.remove(torrent.hash, false);
				for (var i = 0; i < $scope.torrents.length; i++) {
					if ($scope.torrents[i].hash === torrent.hash) {
						$scope.torrents.splice(i, 1);
						break;
					}
				}
				return true;
			},
			destructiveButtonClicked: function() {
				console.log('Remove with Data: ' + torrent.name);
				DelugeService.remove(torrent.hash, true);
				for (var i = 0; i < $scope.torrents.length; i++) {
					if ($scope.torrents[i].hash === torrent.hash) {
						$scope.torrents.splice(i, 1);
						break;
					}
				}
				return true;
			},
			cancel: function() {
				console.log('Cancel Remove');
				return true;
			}
		});
	};

	$scope.onReorder = function(torrent, from, to) {
		console.log('Moving ' + torrent.name + ' from ' + from + ' to ' + to);
	};

	var modifyRate = function(type, parameter) {
		$ionicActionSheet.show({
			buttons: [
				{ text: '5 KiB/s' },
				{ text: '10 KiB/s' },
				{ text: '30 KiB/s' },
				{ text: '80 KiB/s' },
				{ text: '300 KiB/s' },
				{ text: 'Unlimited' },
				{ text: 'Other' }
			],
			titleText: 'Set ' + type + ' Speed:',
			cancelText: 'Cancel',
			cancel: function() {},
			buttonClicked: function(index) {
				var amount = 0;
				switch (index) {
					case 0:
						amount = 5; break;
					case 1:
						amount = 10; break;
					case 2:
						amount = 30; break;
					case 3:
						amount = 80; break;
					case 4:
						amount = 300; break;
					case 5:
						amount = 0; break;
					case 6:
						$ionicPopup.prompt({
							title: 'Set ' + type + ' Speed:',
							inputType: 'number',
							inputPlaceholder: 'KiB/s'
						}).then(function(res) {
							if (res) {
								res = parseInt(res);
								if (res != NaN) {
									console.log('Setting ' + type + ' Rate To ' + res + ' KiB/s');
									var options = {};
									options[parameter] = "" + res;
									DelugeService.setConfig(options);
								}
							}
						});
						return true;
				}
				
				console.log('Setting ' + type + ' Rate To ' + amount + ' KiB/s');
				var options = {};
				options[parameter] = "" + amount;
				DelugeService.setConfig(options);
				return true;
			}
		});
	};

	$scope.modifyDownloadRate = function() {
		modifyRate('Download', 'max_download_speed');
	};

	$scope.modifyUploadRate = function() {
		modifyRate('Upload', 'max_upload_speed');
	};

	$scope.$on('$destroy', function() {
		$scope.torrentDetailsView.remove();
		$scope.torrentDetailsView = undefined;
		$scope.settingsView.remove();
		$scope.settingsView = undefined;
	});

	$rootScope.$on('dm.ui-error', function(ev, err) {
		//$window.alert('ERROR: ' + err);
	});
	$rootScope.$on('dm.ui-updated', function(ev, data) {
		var existing = {};
		var cache = $angularCacheFactory.get('torrentCache');
		angular.forEach(cache.get('torrents'), function(torrent) {
			existing[torrent.hash] = torrent;
		});

		var torrents = [];
		angular.forEach(data.torrents, function(torrent, index) {
			existingTorrent = existing[index];

			if (existingTorrent) {
				for (var prop in torrent) {
					if (torrent.hasOwnProperty(prop)) {
						existingTorrent[prop] = torrent[prop];
					}
				}
				torrents.push(existingTorrent);
			} else {
				torrent['hash'] = index;
				torrents.push(torrent);
			}
		});

		cache.put('torrents', torrents);
		cache.put('stats', data.stats);

		updateUI();
	});

	updateUI();
}])

;