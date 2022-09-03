'use strict';

const plugin = require('../library');

module.exports = {
	name: 'Move primary key from `id` to `tid` and `pid`',
	timestamp: Date.UTC(2022, 9, 3),
	method: async function () {
		const topicIndex = await plugin.client.index('topic').getRawInfo();
		const postIndex = await plugin.client.index('post').getRawInfo();
		if (topicIndex.primaryKey !== 'tid' || postIndex.primaryKey !== 'pid') {
			await plugin.client.index('topic').deleteAllDocuments();
			await plugin.client.updateIndex('topic', { primaryKey: 'tid' });
			await plugin.client.index('post').deleteAllDocuments();
			await plugin.client.updateIndex('post', { primaryKey: 'pid' });
			await plugin.reindex(true);
		}
	},
};
