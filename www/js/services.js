angular.module('dm.services', [
	'jmdobry.angular-cache',
	'angularLocalStorage'
])

.factory('DelugeService', ['$q', '$http', '$rootScope', '$interval', '$timeout', 'storage', function($q, $http, $rootScope, $interval, $timeout, storage) {
	var dataRefresh  =  5 * 1000    // 5 seconds
		eventRefresh = 10 * 1000    // 30 seconds
	;

	var active = false;
	var doRefresh = true;
	var idcounter = 0;
	var updateInProgress = false;
	var timer = null;

	var makeRequest = function(data) {
		var deferred = $q.defer();

		data.id = idcounter++;
		if (!data.params) {
			data.params = [];
		}

		var settings = storage.get('dm.settings');
		if (!settings || !settings.server) {
			$timeout(function() {
				deferred.reject('No server!');
			});
			return deferred.promise;
		}

		var server = settings.server;
		if (server.charAt(server.length - 1) != '/') {
			server += '/';
		}

		console.log('makeRequest to ' + server + ':',data);
		$http.post(
			server + 'json',
			data
		).success(function(data, status, headers, config) {
			if (data.error) {
				console.log('makeRequest: successful response, but error flag set:',data);
				deferred.reject(data);
			} else {
				deferred.resolve(data);
			}
		}).error(function(data, status, headers, config) {
			console.log('makeRequest: failure:',data);
			deferred.reject(data);
		});
		
		return deferred.promise;
	};

	var getMethods = function() {
		var deferred = $q.defer();

		makeRequest({'method':'system.listMethods'}).then(function(data) {
			deferred.resolve(data.result);
		}, function(error) {
			deferred.reject(error);
		});

		return deferred.promise;
	};

	var checkSession = function() {
		var deferred = $q.defer();
		makeRequest({'method':'auth.check_session'}).then(function(data) {
			deferred.resolve(data.result);
		}, function(error) {
			deferred.reject(error);
		});
		return deferred.promise;
	};

	var login = function() {
		var deferred = $q.defer();

		var settings = storage.get('dm.settings');
		if (!settings || !settings.password) {
			$timeout(function() {
				deferred.reject('No password!');
			});
			return deferred.promise;
		}

		makeRequest({'method':'auth.login', 'params':[settings.password]}).then(function(data) {
			if (data.result) {
				deferred.resolve(data.id);
			} else {
				console.log('successful response with no result:',data.error);
				deferred.reject(false);
			}
		}, function(error) {
			console.log('failure:',error);
			deferred.reject(false);
		});
		return deferred.promise;
	};
	
	var logout = function() {
		var deferred = $q.defer();
		makeRequest({'method':'auth.delete_session', 'params':[]}).then(function(data) {
			if (data.result) {
				deferred.resolve(data.id);
			} else {
				console.log('successful response with no result:',data.error);
				deferred.reject(false);
			}
		}, function(error) {
			console.log('failure:',error);
			deferred.reject(false);
		});
		return deferred.promise;
	};

	var registerEventListener = function(listener) {
		var deferred = $q.defer();
		makeRequest({'method':'web.register_event_listener', 'params':[listener]}).then(function(data) {
			deferred.resolve(true);
		}, function(error) {
			deferred.reject(error);
		});
		return deferred.promise;
	};

	var connected = function() {
		var deferred = $q.defer();
		makeRequest({'method':'web.connected'}).then(function(data) {
			deferred.resolve(true);
		}, function(error) {
			deferred.reject(error);
		});
		return deferred.promise;
	};

	var updateUI = function() {
		var deferred = $q.defer();
		
		if (updateInProgress) {
			$timeout(function() {
				deferred.reject();
			});
			return deferred.promise;
		}

		updateInProgress = true;
		makeRequest({'method':'web.update_ui', 'params':[
			[
				"queue",
				"name",
				"total_size",
				"state",
				"progress",
				"num_seeds",
				"total_seeds",
				"num_peers",
				"total_peers",
				"download_payload_rate",
				"upload_payload_rate",
				"eta",
				"ratio",
				"distributed_copies",
				"is_auto_managed",
				"time_added",
				"tracker_host",
				"save_path",
				"total_done",
				"total_uploaded",
				"max_download_speed",
				"max_upload_speed",
				"seeds_peers_ratio"
			],
			{}
		]}).then(function(data) {
			if (data.error) {
				deferred.reject(error);
			} else {
				deferred.resolve(data.result);
			}
			updateInProgress = false;
		}, function(error) {
			deferred.reject(error);
			updateInProgress = false;
		});
		return deferred.promise;
	};

	var updateEvents = function() {
		var deferred = $q.defer();
		makeRequest({'method':'web.get_events', 'params':[]}).then(function(data) {
			if (data.error) {
				deferred.reject(error);
			} else {
				deferred.resolve(data.result);
			}
		}, function(error) {
			deferred.reject(error);
		});
		return deferred.promise;
	};

	var assertLoggedIn = function() {
		var deferred = $q.defer();

		if (active) {
			$timeout(function() {
				deferred.resolve(true);
			});
			return deferred.promise;
		};

		if ($rootScope.sessionId) {
			checkSession($rootScope.sessionId).then(function(ready) {
				if (ready) {
					deferred.resolve($rootScope.sessionId);
				} else {
					login().then(function(sessionId) {
						console.log('Logged in!  Session ID = ' + sessionId);
						active = true;
						$rootScope.sessionId = sessionId;
						deferred.resolve(sessionId);
					}, function() {
						deferred.reject(false);
						$rootScope.$broadcast('dm.ui-error', 'Login Failed.');
					});
				}
			});
		} else {
			login().then(function(sessionId) {
				console.log('Logged in!  Session ID = ' + sessionId);
				active = true;
				$rootScope.sessionId = sessionId;
				deferred.resolve(sessionId);
			}, function() {
				deferred.reject(false);
				$rootScope.$broadcast('dm.ui-error', 'Login Failed.');
			});
		}

		return deferred.promise;
	};

	var _doUpdate = function() {
		assertLoggedIn().then(function() {
			updateUI().then(function(data) {
				$rootScope.$broadcast('dm.ui-updated', data);
			}, function(err) {
				$rootScope.$broadcast('dm.ui-error', err);
			});
		});
	};

	var _getEvents = function() {
		var deferred = $q.defer();
		updateEvents().then(function(data) {
			console.log('events:',data);
			deferred.resolve(data);
		}, function(err) {
			deferred.reject(err);
		});
		return deferred.promise;
	};

	var addTorrent = function(url) {
		var deferred = $q.defer();
		makeRequest({'method':'web.download_torrent_from_url', 'params':[url]}).then(function(data) {
			if (data.error) {
				deferred.reject(error);
			} else {
				var tempfile = data.result;
				console.log('downloaded to:',tempfile);

				makeRequest({'method':'web.add_torrents', 'params':[[{
					path: tempfile,
					options: { add_paused:false }
				}]]}).then(function(data) {
					if (data.result) {
						deferred.resolve(data.result);
						_doUpdate();
					} else {
						deferred.reject(error);
					}
				}, function(error) {
					deferred.reject(error);
				});
			}
		}, function(error) {
			deferred.reject(error);
		});
		return deferred.promise;
	};

	var start = function() {
		if (doRefresh) {
			$timeout(function() {
				if (timer !== null) {
					$interval.cancel(timer);
				}
				timer = $interval(function() {
					_doUpdate();
				}, dataRefresh);
				/*
				$interval(function() {
					_getEvents();
				}, eventRefresh);
				*/
			});
		}
		_doUpdate();
		//_getEvents();
	};

	var pauseTorrents = function(hashes) {
		if (!angular.isArray(hashes)) {
			hashes = [hashes];
		}

		var deferred = $q.defer();
		makeRequest({'method':'core.pause_torrent', 'params':[
			hashes
		]}).then(function(data) {
			if (data && data.error !== undefined && data.error !== null) {
				deferred.reject(data.error);
			} else {
				deferred.resolve(data.result);
				_doUpdate();
			}
		}, function(err) {
			deferred.reject(err);
		});
		return deferred.promise;
	};

	var resumeTorrents = function(hashes) {
		if (!angular.isArray(hashes)) {
			hashes = [hashes];
		}

		var deferred = $q.defer();
		makeRequest({'method':'core.resume_torrent', 'params':[
			hashes
		]}).then(function(data) {
			if (data && data.error !== undefined && data.error !== null) {
				deferred.reject(data.error);
			} else {
				deferred.resolve(data.result);
				_doUpdate();
			}
		}, function(err) {
			deferred.reject(err);
		});
		return deferred.promise;
	};

	var removeTorrent = function(hash, destructive) {
		var deferred = $q.defer();
		makeRequest({'method':'core.remove_torrent', 'params':[hash, destructive]}).then(function(data) {
			if (data && data.error !== undefined && data.error !== null) {
				deferred.reject(data.error);
			} else {
				deferred.resolve(data.result);
			}
		}, function(err) {
			deferred.reject(err);
		});
		return deferred.promise;
	};

	return {
		'getMethods': getMethods,
		'checkSession': checkSession,
		'login': login,
		'registerEventListener': registerEventListener,
		'connected': connected,
		'updateUI': updateUI,
		'refresh': _doUpdate,
		'start': start,
		'pause': pauseTorrents,
		'resume': resumeTorrents,
		'remove': removeTorrent,
		'add': addTorrent
	};
}]);
