'use strict';

const winston = require.main.require('winston');
const { MeiliSearch } = require('meilisearch');

const routeHelpers = require.main.require('./src/routes/helpers');
const settings = require.main.require('./src/meta/settings');
const Posts = require.main.require('./src/posts');
const Topics = require.main.require('./src/topics');
const batch = require.main.require('./src/batch');
const Sockets = require.main.require('./src/socket.io');

const plugin = {};

plugin.id = 'meilisearch';

plugin.indexing = {
	running: false,
	topic_progress: {
		total: null,
		current: null,
	},
	post_progress: {
		total: null,
		current: null,
	},
};

/** @type MeiliSearch */
plugin.client = undefined;
plugin.defaults = {
	host: 'http://localhost:7700',
	apiKey: undefined,
	maxDocuments: undefined,
	indexed: false,
	rankingRules: [
		{ rule: 'words' },
		{ rule: 'typo' },
		{ rule: 'proximity' },
		{ rule: 'attribute' },
		{ rule: 'sort' },
		{ rule: 'exactness' },
	],
	stopWords: [],
	typoTolerance: 'on',
	typoToleranceMinWordSizeOneTypo: 5,
	typoToleranceMinWordSizeTwoTypos: 9,
	typoToleranceDisableOnWords: [],
	synonyms: [],
};

plugin.breakingSettings = [
	'maxDocuments',
	'rankingRules',
	'stopWords',
	'typoTolerance',
	'typoToleranceMinWordSizeOneTypo',
	'typoToleranceMinWordSizeTwoTypos',
	'typoToleranceDisableOnWords',
	'typoToleranceDisableOnAttributes',
	'synonyms',
];
plugin.initialized = false;

plugin.init = async function (params) {
	const { router /* , middleware , controllers */ } = params;
	winston.debug('[plugin/meilisearch] Initializing MeiliSearch plugin');
	routeHelpers.setupAdminPageRoute(router, '/admin/plugins/meilisearch', [], (req, res) => {
		res.render('admin/plugins/meilisearch', {
			indexing: plugin.indexing,
		});
	});
	await settings.setOnEmpty(plugin.id, plugin.defaults);
	await plugin.prepareSearch();
	plugin.initialized = true;
};

plugin.prepareSearch = async function (data) {
	winston.debug(`[plugin/meilisearch] Connecting to MeiliSearch host: ${await settings.getOne(plugin.id, 'host')}`);
	plugin.client = new MeiliSearch({
		host: data?.host || await settings.getOne(plugin.id, 'host'),
		apiKey: data?.apiKey || await settings.getOne(plugin.id, 'apiKey') || undefined,
	});
	if (!await settings.getOne(plugin.id, 'indexed')) {
		await plugin.updateIndexSettings();
		await plugin.reindex(false);
	}
};

plugin.addRoutes = async function ({ router, middleware, helpers }) {
	const middlewares = [
		middleware.ensureLoggedIn,
		middleware.admin.checkPrivileges,
	];
	routeHelpers.setupApiRoute(router, 'get', '/meilisearch/reindex', middlewares, async (req, res) => {
		helpers.formatApiResponse(200, res, plugin.indexing);
	});

	routeHelpers.setupApiRoute(router, 'post', '/meilisearch/reindex', middlewares, async (req, res) => {
		await settings.set(plugin.id, { indexed: false }, true);
		await plugin.reindex(false);
		helpers.formatApiResponse(200, res, {
			indexed: await settings.getOne(plugin.id, 'indexed'),
		});
	});
	routeHelpers.setupApiRoute(router, 'delete', '/meilisearch/reindex', middlewares, async (req, res) => {
		await settings.set(plugin.id, { indexed: false }, true);
		await plugin.reindex(true);
		helpers.formatApiResponse(200, res, {
			indexed: await settings.getOne(plugin.id, 'indexed'),
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

plugin.updateIndexSettings = async (data) => {
	await plugin.client.createIndex('post', { primaryKey: 'pid' });
	await plugin.client.createIndex('topic', { primaryKey: 'tid' });
	data = {
		maxDocuments: parseInt(data?.maxDocuments || await settings.getOne(plugin.id, 'maxDocuments') || 500, 10),
		rankingRules: (data?.rankingRules || await settings.getOne(plugin.id, 'rankingRules'))?.map(value => value.rule),
		stopWords: (data?.stopWords || await settings.getOne(plugin.id, 'stopWords'))?.map(value => value.word),
		typoTolerance: ['on', true].includes(
			data?.typoTolerance || await settings.getOne(plugin.id, 'typoTolerance') || undefined,
		),
		typoToleranceMinWordSizeOneTypo: parseInt(
			data?.typoToleranceMinWordSizeOneTypo ||
				await settings.getOne(plugin.id, 'typoToleranceMinWordSizeOneTypo') || 5,
			10,
		),
		typoToleranceMinWordSizeTwoTypos: parseInt(
			data?.typoToleranceMinWordSizeTwoTypos ||
				await settings.getOne(plugin.id, 'typoToleranceMinWordSizeTwoTypos') || 9,
			10,
		),
		typoToleranceDisableOnWords:
			(data?.typoToleranceDisableOnWords || await settings.getOne(plugin.id, 'typoToleranceDisableOnWords') ||
				undefined)?.map(value => value.word),
		synonyms: Object.fromEntries(
			(data?.synonyms || await settings.getOne(plugin.id, 'synonyms') || [])?.map((
				{ word, synonyms },
			) => [word, synonyms?.split(',').map(synonym => synonym.trim())]),
		),
	};
	await plugin.client.index('post').updateSettings({
		filterableAttributes: ['tid', 'cid', 'uid', 'timestamp'],
		sortableAttributes: ['timestamp', 'cid'],
		searchableAttributes: ['content'],
		pagination: {
			maxTotalHits: data.maxDocuments,
		},
		rankingRules: data.rankingRules,
		stopWords: data.stopWords,
		typoTolerance: {
			enabled: data.typoTolerance,
			minWordSizeForTypos: {
				oneTypo: data.typoToleranceMinWordSizeOneTypo,
				twoTypos: data.typoToleranceMinWordSizeTwoTypos,
			},
			disableOnWords: data.typoToleranceDisableOnWords,
		},
		synonyms: data.synonyms,
	});
	await plugin.client.index('topic').updateSettings({
		filterableAttributes: ['cid', 'uid', 'timestamp'],
		sortableAttributes: ['cid', 'title', 'timestamp'],
		searchableAttributes: ['title'],
		pagination: {
			maxTotalHits: data.maxDocuments,
		},
		rankingRules: data.rankingRules,
		stopWords: data.stopWords,
		typoTolerance: {
			enabled: data.typoTolerance,
			minWordSizeForTypos: {
				oneTypo: data.typoToleranceMinWordSizeOneTypo,
				twoTypos: data.typoToleranceMinWordSizeTwoTypos,
			},
			disableOnWords: data.typoToleranceDisableOnWords,
		},
		synonyms: data.synonyms,
	});
};

plugin.reindex = async function (force = false) {
	if (plugin.indexing.running) {
		winston.warn('[plugins/meilisearch] Already indexing');
		return;
	}
	plugin.indexing = {
		running: true,
		topic_progress: {
			current: 0,
			total: 0,
		},
		post_progress: {
			current: 0,
			total: 0,
		},
	};
	winston.info(`[plugin/meilisearch] Reindexing posts and topics${force ? ' (forced)' : ''}`);
	try {
		if (force) {
			await plugin.client.index('post').deleteAllDocuments();
			await plugin.client.index('topic').deleteAllDocuments();
		}
		Promise.all([
			batch.processSortedSet(
				'topics:tid',
				async (tids) => {
					const topics = await Topics.getTopicsFields(tids, ['tid', 'cid', 'uid', 'mainPid', 'title', 'timestamp']);
					await plugin.client.index('topic').updateDocuments(
						topics.map(topic => ({
							tid: topic.tid,
							cid: topic.cid,
							uid: topic.uid,
							mainPid: topic.mainPid,
							title: topic.title,
							timestamp: topic.timestamp,
						})),
						{ primaryKey: 'tid' },
					);
					plugin.indexing.topic_progress.current += tids.length;
					Sockets.server.to('admin/plugins/meilisearch').emit('plugins.meilisearch.reindex', plugin.indexing);
				},
				{
					batch: parseInt(await settings.getOne(plugin.id, 'maxDocuments') || 500, 10),
					progress: plugin.indexing.topic_progress,
					interval: 10,
				},
			),
			batch.processSortedSet(
				'posts:pid',
				async (pids) => {
					const posts = await Posts.getPostsFields(pids, ['pid', 'tid', 'cid', 'uid', 'content', 'timestamp']);
					await plugin.client.index('post').updateDocuments(
						posts.map(post => ({
							pid: post.pid,
							tid: post.tid,
							cid: post.cid,
							uid: post.uid,
							content: post.content,
							timestamp: post.timestamp,
						})),
						{ primaryKey: 'pid' },
					);
					plugin.indexing.post_progress.current += pids.length;
					Sockets.server.to('admin/plugins/meilisearch').emit('plugins.meilisearch.reindex', plugin.indexing);
				},
				{
					batch: parseInt(await settings.getOne(plugin.id, 'maxDocuments') || 500, 10),
					progress: plugin.indexing.post_progress,
					interval: 10,
				},
			),
		]).then(() => {
			plugin.indexing = {
				running: false,
				topic_progress: {
					total: null,
					current: null,
				},
				post_progress: {
					total: null,
					current: null,
				},
			};
			winston.info('[plugin/meilisearch] Reindexing complete');
		});
	} catch (err) {
		winston.error(`[plugin/meilisearch] Reindexing failed: ${err.message}`);
		plugin.indexing = {
			running: false,
			topic_progress: {
				total: null,
				current: null,
			},
			post_progress: {
				total: null,
				current: null,
			},
		};
	}
	await settings.set(plugin.id, { indexed: true }, true);
};

plugin.indexPost = async function ({ post }) {
	if (!post.cid) {
		post.cid = await Posts.getCidByPid(post.pid);
	}
	await plugin.client.index('post').updateDocuments([
		{
			pid: post.pid,
			tid: post.tid,
			cid: post.cid,
			uid: post.uid,
			content: post.content,
			timestamp: post.timestamp,
		},
	], { primaryKey: 'pid' });
};

plugin.deindexPost = async function ({ post }) {
	await plugin.client.index('post').deleteDocument(post.pid);
};

plugin.indexTopic = async function ({ topic }) {
	await plugin.client.index('topic').updateDocuments([{
		tid: topic.tid,
		cid: topic.cid,
		uid: topic.uid,
		mainPid: topic.mainPid,
		title: topic.title,
		timestamp: topic.timestamp,
	}], { primaryKey: 'tid' });
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
		winston.warn(
			'[plugin/meilisearch] Another search plugin (dbsearch) is enabled, so search via Meilisearch was aborted.',
		);
		return data;
	}
	if (!await plugin.isHealthy()) {
		winston.warn(
			'[plugin/meilisearch] Meilisearch instance did not return a healthy response, so search via Meilisearch was aborted.',
		);
		return data;
	}
	if (data.term) {
		data.content = data.term;
	}
	winston.debug(`[plugin/meilisearch] Searching for ${data.content} in ${data.index}`);
	const searchData = data?.searchData;
	const id = `${data.index[0]}id`;
	const result = await plugin.client.index(data.index).search(data.content, {
		attributesToRetrieve: [id],
		limit: parseInt(await settings.getOne(plugin.id, 'maxDocuments') || 500, 10),
		filter: plugin.buildFilter(
			data.cid,
			data.uid,
			searchData?.timeFilter,
			searchData?.timeRange,
			searchData?.tid,
		),
		sort: plugin.buildSort(searchData?.sortBy, searchData?.sortDirection),
	});
	data.ids = result.hits.map(hit => hit[id]);
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
	if (data.plugin === plugin.id && !data.quiet && plugin.initialized) {
		try {
			await plugin.prepareSearch(data.settings);
			if (
				Object.entries(data.settings).some(isBreaking)
			) {
				winston.info(`settings changed, updating index`);
				await plugin.updateIndexSettings(data.settings);
			}
		} catch (err) {
			winston.error(`[plugin/meilisearch] Error while saving settings: ${err.message}`);
		}
	}
	return data;
};

async function isBreaking([setting, value]) {
	winston.info(`[plugin/meilisearch] Checking if ${setting} with value ${JSON.stringify(value)} is breaking`);
	return plugin.breakingSettings.includes(setting) && !deepCompare(await settings.getOne(plugin.id, setting), value);
}

function deepCompare(a, b) {
	if (typeof a !== typeof b) return false;
	switch (typeof a) {
		case 'object':
			return Object.keys(a).length === Object.keys(b).length &&
				Object.keys(a).every(key => deepCompare(a[key], b[key]));
		case 'string':
		case 'number':
		case 'boolean':
		default:
			return a === b;
	}
}
module.exports = plugin;
