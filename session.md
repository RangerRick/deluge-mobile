Send:
{
	method: "system.listMethods",
	params: [],
	id: 0
}

Receive:
{
	"id": 0,
	"result": [
		"web.get_torrent_info", "web.add_torrents", "web.get_plugins", "web.start_daemon", "web.add_host", "web.deregister_event_listener", "web.register_event_listener", "web.get_magnet_info", "web.get_torrent_status", "auth.delete_session", "web.download_torrent_from_url", "web.get_config", "web.get_hosts", "web.disconnect", "auth.check_session", "web.set_config", "auth.login", "web.get_plugin_resources", "web.upload_plugin", "web.connect", "web.get_events", "auth.change_password", "web.get_host_status", "web.remove_host", "web.connected", "web.get_torrent_files", "web.stop_daemon", "web.update_ui", "web.get_plugin_info"],
	"error": null
}

Send:
{
	method: "auth.check_session",
	params: [],
	id: 1
}

Receive:
{
	"id": 1,
	"result": false,
	"error": null
}

Send:
{
	"method":"auth.login",
	"params":["XXXXXX"],
	"id":2
}

Receive:
{
	"id": 2,
	"result": true,
	"error": null
}

Send:
{
	method: "web.register_event_listener",
	params: ["PluginDisabledEvent"],
	id: 3
}

Receive:
{
	"id": 3,
	"result": null,
	"error": null
}

(then, lots more register_event_listeners)

Send:
{
	method: "web.connected",
	params: [],
	id: 8
}

Receive:
{
	"id": 8,
	"result": false,
	"error": null
}

Send:
{
	method: "web.get_hosts",
	params: [],
	id: 9
}

Receive:
{
	"id": 9,
	"result": [["1cc7ee2e2259ad6c29430b2f5ae75919009ec4da", "localhost", 58846, "Offline"]],
	"error": null
}

Send:
{
	method: "web.get_host_status",
	params: ["1cc7ee2e2259ad6c29430b2f5ae75919009ec4da"],
	id: 11
}

Receive:
{
	"id": 11,
	"result": ["1cc7ee2e2259ad6c29430b2f5ae75919009ec4da", "localhost", 58846, "Online", "1.3.6"],
	"error": null
}

Send:
{
	method: "web.connect",
	params: ["1cc7ee2e2259ad6c29430b2f5ae75919009ec4da"],
	id: 331
}

Receive:
{
	"id": 331,
	"result": null,
	"error": null
}

Send:
{
	method: "system.listMethods",
	params: [],
	id: 332
}

Receive:
{
	"id": 332,
	"result": ["core.upload_plugin", "core.rescan_plugins", "core.force_recheck", "core.glob", "core.remove_torrent", "core.resume_all_torrents", "execute.add_command", "core.queue_top", "daemon.get_method_list", "core.set_torrent_options", "core.set_torrent_prioritize_first_last", "core.get_session_state", "core.set_torrent_move_completed", "core.get_available_plugins", "core.set_torrent_file_priorities", "blocklist.check_import", "core.get_config", "core.disable_plugin", "core.test_listen_port", "core.connect_peer", "blocklist.get_status", "core.enable_plugin", "core.get_filter_tree", "core.set_torrent_remove_at_ratio", "core.get_torrent_status", "core.get_config_values", "blocklist.get_config", "core.pause_torrent", "core.move_storage", "core.force_reannounce", "core.add_torrent_file", "execute.get_commands", "core.get_listen_port", "core.set_torrent_move_completed_path", "core.set_torrent_stop_at_ratio", "core.rename_folder", "core.add_torrent_url", "core.get_enabled_plugins", "core.get_libtorrent_version", "core.get_path_size", "core.set_torrent_max_connections", "core.get_config_value", "core.get_session_status", "core.create_torrent", "scheduler.get_state", "core.add_torrent_magnet", "daemon.info", "core.set_torrent_stop_ratio", "core.set_torrent_auto_managed", "core.pause_all_torrents", "core.get_torrents_status", "execute.remove_command", "core.rename_files", "core.get_free_space", "core.queue_bottom", "scheduler.get_config", "core.set_torrent_max_upload_speed", "execute.save_command", "blocklist.set_config", "core.resume_torrent", "core.set_torrent_max_upload_slots", "core.set_config", "core.get_cache_status", "core.queue_down", "daemon.shutdown", "core.get_num_connections", "core.set_torrent_max_download_speed", "core.queue_up", "core.set_torrent_trackers", "scheduler.set_config", "web.get_torrent_info", "web.add_torrents", "web.get_plugins", "web.start_daemon", "web.add_host", "web.deregister_event_listener", "web.register_event_listener", "web.get_magnet_info", "web.get_torrent_status", "auth.delete_session", "web.download_torrent_from_url", "web.get_config", "web.get_hosts", "web.disconnect", "auth.check_session", "web.set_config", "auth.login", "web.get_plugin_resources", "web.upload_plugin", "web.connect", "web.get_events", "auth.change_password", "web.get_host_status", "web.remove_host", "web.connected", "web.get_torrent_files", "web.stop_daemon", "web.update_ui", "web.get_plugin_info"],
	"error": null
}

then it starts the web.update_ui loop.
