/**
 * You can run these tests by executing `npx mocha test/plugins-installed.js`
 * from the NodeBB root folder. The regular test runner will also run these
 * tests.
 *
 * Keep in mind tests do not activate all plugins, so if you are testing
 * hook listeners, socket.io, or mounted routes, you will need to add your
 * plugin to `config.json`, e.g.
 *
 * {
 *     "test_plugins": [
 *         "nodebb-plugin-meilisearch"
 *     ]
 * }
 */

'use strict';

/* globals describe, it, before */

const assert = require('assert');

const winston = require.main.require('winston');

const topics = require.main.require('./src/topics');
const { search } = require.main.require('./src/search');
const categories = require.main.require('./src/categories');
const user = require.main.require('./src/user');
const plugins = require.main.require('./src/plugins');


describe('nodebb-plugin-meilisearch', () => {
	let authorUid;
	let commenterUid;
	let postData;
	let topicData;
	let responseData;
	let cid;
	before(async () => {
		console.log('test');
		plugins.hooks.unregister('nodebb-plugin-dbsearch', 'filter:search.query', 'filterSearchQuery');
		plugins.hooks.unregister('nodebb-plugin-dbsearch', 'filter:topic.search', 'filterSearchTopic');
		plugins.hooks.unregister('nodebb-plugin-dbsearch', 'filter:messaging.searchMessages', 'filterMessagingSearchMessages');
		winston.info('unregistered dbsearch search hooks');

		const { active } = await plugins.toggleActive('nodebb-plugin-dbsearch');
		winston.info(`dbsearch plugin ${active ? 'enabled' : 'disabled'}`);
		authorUid = await user.create({ username: 'totalVotesAuthor' });
		commenterUid = await user.create({ username: 'totalVotesCommenter' });
		({ cid } = await categories.create({
			name: 'Test Category',
			description: 'Test category created by testing script',
		}));
		({ postData, topicData } = await topics.post({
			uid: authorUid,
			cid: cid,
			title: 'Test Meilisearch Topic Title',
			content: 'The content of test topic first post',
		}));

		responseData = await topics.reply({
			uid: commenterUid,
			tid: topicData.tid,
			content: 'The content of test reply',
		});
	});

	it('should find the initial topic by full title', async () => {
		const results = await search({
			searchIn: 'titles',
			query: 'Test Meilisearch Topic Title',
		});
		assert(Array.isArray(results.posts), 'Search result is not an array');
		assert.strictEqual(results.posts.filter(post => post.pid === postData.pid).length, 1, 'Post id not in results');
	});

	it('should find the initial topic by partial title', async () => {
		const results = await search({
			searchIn: 'titles',
			qeury: 'Test Mei',
		});
		assert(Array.isArray(results.posts), 'Search result is not an array');
		assert.strictEqual(results.posts.filter(post => post.pid === postData.pid).length, 1, 'Post id not in results');
	});

	it('should not find the initial topic by unrelated query', async () => {
		const results = await search({
			searchIn: 'titles',
			query: 'Nothing related to the target',
		});
		assert.strictEqual(results.posts.filter(post => post.pid === postData.pid).length, 0, 'Post id is wrongly in results');
	});

	it('should find the initial topic by full content', async () => {
		const results = await search({
			searchIn: 'posts',
			query: 'The content of test topic first post',
		});
		assert(Array.isArray(results.posts), 'Search result is not an array');
		assert.strictEqual(results.posts.filter(post => post.pid === postData.pid).length, 1, 'Post id not in results');
	});

	it('should find the initial topic by partial content', async () => {
		const results = await search({
			searchIn: 'posts',
			query: 'The con',
		});
		assert(Array.isArray(results.posts), 'Search result is not an array');
		assert.strictEqual(results.posts.filter(post => post.pid === postData.pid).length, 1, 'Post id not in results');
	});

	it('should find the reply by full content', async () => {
		const results = await search({
			searchIn: 'posts',
			query: 'The content of test reply',
		});
		assert(Array.isArray(results.posts), 'Search result is not an array');
		assert.strictEqual(results.posts.filter(post => post.pid === responseData.pid).length, 1, 'Response post id not in results');
	});

	it('should find the reply by partial content', async () => {
		const results = await search({
			searchIn: 'posts',
			query: 'repl',
		});
		assert(Array.isArray(results.posts), 'Search result is not an array');
		assert.strictEqual(results.posts.filter(post => post.pid === responseData.pid).length, 1, 'Response post id not in results');
	});
});
