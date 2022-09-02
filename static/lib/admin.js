'use strict';

/*
	This file is located in the "modules" block of plugin.json
	It is only loaded when the user navigates to /admin/plugins/meilisearch page
	It is not bundled into the min file that is served on the first load of the page.
*/
define('admin/plugins/meilisearch', [
	'settings', 'api', 'alerts',
], (settings, api, alerts) => {
	const ACP = {};

	ACP.init = function () {
		settings.load('meilisearch', $('.meilisearch-settings'), () => {
		});
		$('#save').on('click', saveSettings);
		$('#reindex').on('click', reindex);
	};

	function saveSettings() {
		settings.save('meilisearch', $('.meilisearch-settings'), () => {
			alerts.alert({
				type: 'success',
				alert_id: 'meilisearch-saved',
				title: 'Settings Saved',
				message: 'Your settings have been saved successfully.',
				clickfn: function () {
					socket.emit('admin.reload');
				},
			});
		});
	}
	function reindex() {
		const forceReindex = document.getElementById('force-reindex').checked;
		api.get(`/plugins/meilisearch/reindex${forceReindex ? '/force' : ''}`);
	}

	return ACP;
});
