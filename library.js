'use strict';

const winston = require.main.require('winston');
const { MeiliSearch } = require('meilisearch');
const controllers = require('./lib/controllers');

const routeHelpers = require.main.require('./src/routes/helpers');
const settings = require.main.require('./src/meta/settings');
const Posts = require.main.require('./src/posts');
const Topics = require.main.require('./src/topics');
const batch = require.main.require('./src/batch');

const plugin = {};

/** @type MeiliSearch */
plugin.client = undefined;
plugin.defaults = {
	host: 'http://localhost:7700',
	apiKey: undefined,
	maxDocuments: undefined,
	indexed: false,
};

plugin.init = async function (params) {
	const { router /* , middleware , controllers */ } = params;
	winston.debug('[plugin/meilisearch] Initializing MeiliSearch plugin');
	routeHelpers.setupAdminPageRoute(router, '/admin/plugins/meilisearch', [], controllers.renderAdminPage);
	plugin.settings = new Proxy(settings, {
		async get(target, prop) {
			return await target.getOne('meilisearch', prop) || plugin.defaults[prop];
		},
		set(target, prop, value) {
			const data = {};
			data[prop] = value;
			return target.set('meilisearch', data, true);
		},
		async has(target, prop) {
			return await target.get(target, prop) !== undefined;
		},
		async ownKeys(target) {
			return Object.keys(await target.get('meilisearch'));
		},
	});
	await plugin.prepareSearch();
};

plugin.prepareSearch = async function () {
	winston.debug(`[plugin/meilisearch] MeiliSearch host: ${await plugin.settings.host}`);

	plugin.client = new MeiliSearch({
		host: await plugin.settings.host,
		apiKey: await plugin.settings.apiKey || undefined,
	});
	if (!await plugin.settings.indexed) {
		await plugin.reindex(false);
	}
};

plugin.addRoutes = async function ({ router, middleware, helpers }) {
	const middlewares = [
		middleware.ensureLoggedIn,
		middleware.admin.checkPrivileges,
	];

	routeHelpers.setupApiRoute(router, 'get', '/meilisearch/reindex', middlewares, async (req, res) => {
		plugin.settings.indexed = false;
		await plugin.reindex(false);
		helpers.formatApiResponse(200, res, {
			indexed: await plugin.settings.indexed,
		});
	});
	routeHelpers.setupApiRoute(router, 'get', '/meilisearch/reindex/force', middlewares, async (req, res) => {
		plugin.settings.indexed = false;
		await plugin.reindex(true);
		helpers.formatApiResponse(200, res, {
			indexed: await plugin.settings.indexed,
		});
	});
};

plugin.addAdminNavigation = function (header) {
	header.plugins.push({
		route: '/plugins/meilisearch',
		icon: 'fa-tint',
		name: 'Meilisearch',
	});

	return header;
};

plugin.isHealthy = async function () {
	try {
		return await plugin.client.isHealthy();
	} catch (err) {
		winston.warn(err);
		return false;
	}
};

plugin.getNotices = async function (notices) {
	const isHealthy = await plugin.isHealthy();
	notices.push({
		done: isHealthy,
		doneText: 'MeiliSearch connection OK',
		notDoneText: 'Could not connect to MeiliSearch',
	});
	return notices;
};

plugin.updateIndexSettings = async () => {
	await plugin.client.index('post').updateSettings({
		filterableAttributes: ['tid', 'cid', 'uid', 'timestamp'],
		sortableAttributes: ['timestamp', 'cid'],
		searchableAttributes: ['content'],
		pagination: {
			maxTotalHits: parseInt(await plugin.settings.maxDocuments || 500, 10),
		},
		rankingRules: await plugin.settings.rankingRules || undefined,
	});
	await plugin.client.index('topic').updateSettings({
		filterableAttributes: ['cid', 'uid', 'timestamp'],
		sortableAttributes: ['cid', 'title', 'timestamp'],
		searchableAttributes: ['title'],
		pagination: {
			maxTotalHits: parseInt(await plugin.settings.maxDocuments || 500, 10),
		},
		rankingRules: await plugin.settings.rankingRules || undefined,
	});
}

plugin.reindex = async function (force = false) {
	winston.info('[plugin/meilisearch] Reindexing posts and topics');
	if (force) {
		await plugin.client.index('post').deleteAllDocuments();
		await plugin.client.index('topic').deleteAllDocuments();
	}
	await plugin.updateIndexSettings();
	await Promise.all([
		batch.processSortedSet(
			'topics:tid',
			async (tids) => {
				const topics = await Topics.getTopicsFields(tids, ['tid', 'cid', 'uid', 'pid', 'title', 'timestamp']);
				await plugin.client.index('topic').updateDocuments(topics.map(topic => ({
					id: topic.tid,
					cid: topic.cid,
					uid: topic.uid,
					mainPid: topic.pid,
					title: topic.title,
					timestamp: topic.timestamp,
				})));
			},
			{ batch: 500 },
		),
		batch.processSortedSet(
			'posts:pid',
			async (pids) => {
				const posts = await Posts.getPostsFields(pids, ['pid', 'tid', 'cid', 'uid', 'content', 'timestamp']);
				await plugin.client.index('post').updateDocuments(posts.map(post => ({
					id: post.pid,
					tid: post.tid,
					cid: post.cid,
					uid: post.uid,
					content: post.content,
					timestamp: post.timestamp,
				})));
			},
			{ batch: 500 },
		),
	]);
	plugin.settings.indexed = true;
};


plugin.indexPost = async function ({ post }) {
	if (!post.cid) {
		post.cid = await Posts.getCidByPid(post.pid);
	}
	await plugin.client.index('post').updateDocuments([
		{
			id: post.pid,
			tid: post.tid,
			cid: post.cid,
			uid: post.uid,
			content: post.content,
			timestamp: post.timestamp,
		},
	]);
};

plugin.deindexPost = async function ({ post }) {
	await plugin.client.index('post').deleteDocument(post.pid);
};

plugin.indexTopic = async function ({ topic }) {
	await plugin.client.index('topic').updateDocuments([{
		id: topic.tid,
		cid: topic.cid,
		uid: topic.uid,
		mainPid: topic.pid,
		title: topic.title,
		timestamp: topic.timestamp,
	}]);
};

plugin.deindexTopic = async function ({ topic }) {
	await plugin.client.index('topic').deleteDocument(topic.tid);
};

// stolen from solr plugin
plugin.checkConflict = function () {
	return !!module.parent.exports.libraries['nodebb-plugin-dbsearch'];
};

plugin.search = async function (data) {
	if (plugin.checkConflict()) {
		// The dbsearch plugin was detected, abort search!
		winston.warn('[plugin/meilisearch] Another search plugin (dbsearch) is enabled, so search via Meilisearch was aborted.');
		return data;
	}
	if (!await plugin.isHealthy()) {
		winston.warn('[plugin/meilisearch] Meilisearch instance did not return a healthy response, so search via Meilisearch was aborted.');
		return data;
	}
	if (data.term) {
		data.content = data.term;
	}
	winston.debug(`[plugin/meilisearch] Searching for ${data.content} in ${data.index}`);
	if (data.matchWords === 'all' && !(data.content?.startsWith('"') && data.content?.endsWith('"'))) {
		data.content = `"${data.content}"`;
	}
	const searchData = data?.searchData;
	const result = await plugin.client.index(data.index).search(data.content, {
		attributesToRetrieve: ['id'],
		limit: parseInt(await plugin.settings.maxDocuments || 500, 10),
		filter: plugin.buildFilter(
			data.cid,
			data.uid,
			searchData?.timeFilter,
			searchData?.timeRange,
			searchData?.tid
		),
		sort: plugin.buildSort(searchData?.sortBy, searchData?.sortDirection),
	});
	data.ids = result.hits.map(hit => hit.id);
	return data;
};

plugin.buildFilter = function (categories, postedBy, timeFilter, timeRange, tid) {
	let filter = '';
	if (categories?.length) {
		filter += '( ';
		for (const cid of categories) {
			filter += `cid = ${cid} OR `;
		}
		filter += ') ';
	}
	if (postedBy?.length) {
		if (filter.length) filter += 'AND';
		filter += '( ';
		for (const uid of postedBy) {
			filter += `uid = ${uid} OR `;
		}
		filter += ') ';
	}
	if (timeFilter) {
		if (filter.length) filter += 'AND ';
		filter += `timestamp ${timeFilter === 'newer' ? '>' : '<'} ${Date.now() - timeRange}`;
	}
	if (tid) {
		filter += ` AND tid = ${tid}`;
	}
	filter = filter.trimEnd();
	return filter.length ? filter : undefined;
};

plugin.buildSort = function (sortBy, sortDirection) {
	let field = '';
	switch (sortBy) {
		case 'timestamp':
			field = 'timestamp';
			break;
		case 'topic.title':
			field = 'title';
			break;
		case 'category':
			field = 'cid';
			break;
		default:
			return undefined;
	}
	return [`${field}:${sortDirection === 'ascending' ? 'asc' : 'desc'}`];
};

plugin.saveSettings = async (data) => {
	if (data.plugin !== plugin.id || data.silent) return data;
	await plugin.prepareSearch();
	if (data.settings?.maxDocuments !== await plugin.settings.maxDocuments) {
		await plugin.updateIndexSettings();
	}
};

module.exports = plugin;
