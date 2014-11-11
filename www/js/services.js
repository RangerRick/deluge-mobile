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

		//console.log('makeRequest to ' + server + ': ' + angular.toJson(data));
		$http.post(
			server + 'json',
			data
		).success(function(data, status, headers, config) {
			if (data.error) {
				console.log('makeRequest: successful response, but error flag set: ' + angular.toJson(data, true));
				deferred.reject(data);
			} else {
				deferred.resolve(data);
			}
		}).error(function(data, status, headers, config) {
			console.log('makeRequest: failure: ' + angular.toJson(data));
			deferred.reject(data);
		});
		
		return deferred.promise;
	};

	var fsm;
	fsm = StateMachine.create({
		initial: 'uninitialized',
		events: [
			{ name: 'initialize', from: 'uninitialized', to: 'initialized' },
			{ name: 'getSession', from: 'initialized', to: 'noSession' },
			{ name: 'logIn',      from: ['noSession', 'initialized'], to: 'loggedIn' },
			{ name: 'getHosts',   from: 'loggedIn', to: 'needHosts' },
			{ name: 'connect',    from: 'needHosts', to: 'connect' },
			{ name: 'ready',      from: ['loggedIn','connect'], to: 'ready' },
			{ name: 'fail',       from: ['noSession', 'needHosts', 'connect', 'loggedIn'], to: 'failed' }
		],
		callbacks: {
			oninitialize: function(event, from, to, data) {
				console.log(event + ': ' + from + ' -> ' + to);

				if ($rootScope.sessionId) {
					checkSession($rootScope.sessionId).then(function(ready) {
						if (ready) {
							// ready, and logged in
							console.log('ready fsm.loggedIn()');
							fsm.logIn();
						} else {
							// session ID is invalid, get a new session
							console.log('invalid fsm.noSession()');
							fsm.getSession();
						}
					}, function(err) {
						// something went wrong, get a new session
						console.log('error fsm.noSession()');
						fsm.getSession();
					});
				} else {
					// we don't have a session stored, get a new session
					console.log('empty fsm.noSession()');
					fsm.getSession();
				}
			},
			ongetSession: function(event, from, to, data) {
				console.log(event + ': ' + from + ' -> ' + to);
				login().then(function(sessionId) {
					console.log('onGetSession: logged in: ' + sessionId);
					$rootScope.sessionId = sessionId;
					fsm.logIn();
				}, function(error) {
					console.log('onGetSession: login failed', error);
					fsm.fail();
				});
			},
			onloggedIn: function(event, from, to, data) {
				console.log(event + ': ' + from + ' -> ' + to);
				connected().then(function(res) {
					console.log('Already connected.');
					fsm.ready();
				}, function(err) {
					console.log('err=',err);
					if (err === 'get_hosts') {
						fsm.getHosts();
					} else {
						fsm.fail();
					}
				});
			},
			onneedHosts: function(event, from, to, data) {
				console.log(event + ': ' + from + ' -> ' + to);
				getHosts().then(function(res) {
					fsm.connect(res);
				}, function(err) {
					console.log('err=',err);
					fsm.fail();
				});
			},
			onconnect: function(event, from, to, data) {
				console.log(event + ': ' + from + ' -> ' + to);
				connect(data).then(function(res) {
					fsm.ready();
				}, function(err) {
					fsm.fail();
				});
			},
			onready: function(event, from, to, data) {
				console.log(event + ': ' + from + ' -> ' + to);
				start();
			},
			onfailed: function(event, from, to, data) {
				console.log(event + ': ' + from + ' -> ' + to);
			}
		}
	});

	var initialize = function() {
		fsm.initialize();
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
			//console.log('auth.check_session: ' + angular.toJson(data, true));
			deferred.resolve(data.result);
		}, function(error) {
			console.log('auth.check_session failed: ' + error);
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
			//console.log('auth.login: ' + angular.toJson(data, true));
			if (data.error) {
				console.log('auth.login: successful response with error: ' + angular.toJson(data, true));
				deferred.reject(false);
			} else {
				deferred.resolve(data.id);
			}
		}, function(data) {
			console.log('failure: ' + data);
			if (data.error && data.error.message) {
				deferred.reject(data.error.message);
			} else {
				deferred.reject(false);
			}
		});
		return deferred.promise;
	};
	
	var logout = function() {
		var deferred = $q.defer();
		makeRequest({'method':'auth.delete_session', 'params':[]}).then(function(data) {
			if (data.result) {
				deferred.resolve(data.id);
			} else {
				console.log('successful response with no result: ' + angular.toJson(data, true));
				deferred.reject(false);
			}
		}, function(error) {
			console.log('failure: ' + error);
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
			if (data.id && data.id > 0 && data.result) {
				deferred.resolve(true);
			} else {
				deferred.reject('get_hosts');
			}
		}, function(error) {
			deferred.reject(error);
		});
		return deferred.promise;
	};

	var getHosts = function() {
		var deferred = $q.defer();
		makeRequest({'method':'web.get_hosts'}).then(function(data) {
			if (data.id && data.id > 0 && data.result && data.result.length > 0) {
				var first = data.result[0];
				if (Array.isArray(first)) {
					// this is a weird offline result, see if we can get status and return that
					getHostStatus(first[0]).then(function(res) {
						deferred.resolve(res);
					}, function(err) {
						console.error('no host status:',err);
						deferred.reject(false);
					});
				} else {
					deferred.resolve(first);
				}
			} else {
				deferred.reject(false);
			}
		}, function(error) {
			deferred.reject(error);
		});
		return deferred.promise;
	};

	var getHostStatus = function(hash) {
		var deferred = $q.defer();
		makeRequest({'method':'web.get_host_status','params':[hash]}).then(function(data) {
			if (data.id && data.id > 0 && data.result && data.result.length > 0) {
				var first = data.result[0];
				if (Array.isArray(first)) {
					// this is a weird offline result, see if we can get status and return that
					console.error('getHostStatus: weird result:',first);
					deferred.reject(false);
				} else {
					deferred.resolve(first);
				}
			} else {
				deferred.reject(false);
			}
		}, function(error) {
			deferred.reject(error);
		});
		return deferred.promise;
	};

	var connect = function(hash) {
		var deferred = $q.defer();
		makeRequest({'method':'web.connect', 'params':[hash]}).then(function(data) {
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
				// console.log('web.update_ui: ' + angular.toJson(data, true));
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

		/*
		if (active) {
			$timeout(function() {
				deferred.resolve(true);
			});
			return deferred.promise;
		};
		*/

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
		//assertLoggedIn().then(function() {
			updateUI().then(function(data) {
				$rootScope.$broadcast('dm.ui-updated', data);
			}, function(err) {
				$rootScope.$broadcast('dm.ui-error', err);
			});
		//});
	};

	var _getEvents = function() {
		var deferred = $q.defer();
		updateEvents().then(function(data) {
			//console.log('events:',data);
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
				console.log('downloaded to: ' + tempfile);

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

				var settings = storage.get('dm.settings');
				var refresh = dataRefresh;
				if (settings && settings.refresh && settings.refresh >= refresh) {
					refresh = settings.refresh;
				}

				timer = $interval(function() {
					_doUpdate();
				}, refresh);
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

	var setConfig = function(parameters) {
		var deferred = $q.defer();
		makeRequest({'method':'core.set_config', 'params':[parameters]}).then(function(data) {
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
		'initialize': initialize,
		'checkSession': checkSession,
		'login': login,
		'registerEventListener': registerEventListener,
		'connected': connected,
		'getHosts': getHosts,
		'connect': connect,
		'updateUI': updateUI,
		'refresh': _doUpdate,
		'start': start,
		'pause': pauseTorrents,
		'resume': resumeTorrents,
		'remove': removeTorrent,
		'add': addTorrent,
		'setConfig': setConfig
	};
}]);
