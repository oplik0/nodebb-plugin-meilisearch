'use strict';

/*
	This file is located in the "modules" block of plugin.json
	It is only loaded when the user navigates to /admin/plugins/meilisearch page
	It is not bundled into the min file that is served on the first load of the page.
*/
define('admin/plugins/meilisearch', [
	'settings',
	'api',
	'alerts',
	'bootbox',
], (settings, api, alerts, bootbox) => {
	const ACP = {};

	ACP.init = function () {
		app.enterRoom('admin/plugins/meilisearch');
		settings.load('meilisearch', $('.meilisearch-settings'), () => {
		});
		$('#save').on('click', saveSettings);
		$('#reindex').on('click', reindex);
		const progressBarContainers = document.querySelectorAll('.reindex-progress-container');
		socket.on('plugins.meilisearch.reindex', (data) => {
			if (data && (data.running || data.topic_progress.total > 0 || data.post_progress.total > 0)) {
				progressBarContainers.forEach((container) => {
					container.classList.remove('hidden');
				});
				const topicProgressBar = document.getElementById('topic-reindex-progress');
				setProgress(topicProgressBar, data.topic_progress.current, data.topic_progress.total);
				const postProgressBar = document.getElementById('post-reindex-progress');
				setProgress(postProgressBar, data.post_progress.current, data.post_progress.total);

				document.getElementById('topic-reindex-progress-text').innerText =
					`${data.topic_progress.current}/${data.topic_progress.total}`;
				document.getElementById('post-reindex-progress-text').innerText =
					`${data.post_progress.current}/${data.post_progress.total}`;
			} else {
				progressBarContainers.forEach((container) => {
					container.classList.add('hidden');
				});
			}
			if (
				data.topic_progress.total === data.topic_progress.current &&
				data.post_progress.total === data.post_progress.current
			) {
				alerts.alert({
					title: 'Reindexing Completed',
					message: 'Reindexing completed successfully',
					type: 'success',
					timeout: 5000,
				});
			}
		});
	};

	function setProgress(element, current, total) {
		element.innerText = `${current}/${total}`;
		element.setAttribute('aria-valuenow', current);
		element.setAttribute('aria-valuemax', total);
		element.style.width = `${Math.round(100 * current / total)}%`;
	}

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
		if (
			bootbox.confirm('[[meilisearch:admin.confirmReindex]]', () => {
				if (!forceReindex) {
					api.post('/plugins/meilisearch/reindex');
				} else {
					api.delete('/plugins/meilisearch/reindex');
				}
			})
		);
	}
	return ACP;
});
