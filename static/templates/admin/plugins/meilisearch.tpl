<form role="form" class="meilisearch-settings">
	<div class="row">
		<div class="col-sm-2 col-xs-12 settings-header">[[meilisearch:admin.connection]]</div>
		<div class="col-sm-10 col-xs-12">
			<div class="form-group">
				<label for="host">[[meilisearch:admin.host]]</label>
				<input type="text" id="host" name="host" title="Host" class="form-control" placeholder="http://localhost:7700">
			</div>
			<div class="form-group">
				<label for="apiKey">[[meilisearch:admin.apiKey]]</label>
				<input type="password" id="apiKey" name="apiKey" title="API Key" class="form-control" placeholder="*****">
			</div>
		</div>
	</div>

	<br />

	<div class="row">
		<div class="col-sm-2 col-xs-12 settings-header">[[meilisearch:admin.search]]</div>
		<div class="col-sm-10 col-xs-12">
			<div class="form-group">
				<label for="maxDocuments">[[meilisearch:admin.maxDocuments]]</label>
				<input type="number" id="maxDocuments" name="maxDocuments" title="Max Documents" class="form-control" placeholder="500">
			</div>
			<div class="form-group" data-type="sorted-list" data-sorted-list="rankingRules" data-item-template="admin/plugins/meilisearch/partials/rankingRules/item" data-form-template="admin/plugins/meilisearch/partials/rankingRules/form">
				<label for="rankingRulesList">[[meilisearch:admin.rankingRules]]</label>
				<p class="help-block">[[meilisearch:admin.rankingRulesHelp]] <a href="https://docs.meilisearch.com/learn/core_concepts/relevancy.html#ranking-rules">https://docs.meilisearch.com/learn/core_concepts/relevancy.html#ranking-rules</a></p>
				<ul name="rankingRulesList" data-type="list" class="list-group"></ul>
				<button type="button" data-type="add" class="btn btn-info">[[meilisearch:admin.addRankingRule]]</button>
			</div>
			<div class="form-group" data-type="sorted-list" data-sorted-list="stopWords" data-item-template="admin/plugins/meilisearch/partials/stopWords/item" data-form-template="admin/plugins/meilisearch/partials/stopWords/form">
				<label for="stopWordsList">[[meilisearch:admin.stopWords]]</label>
				<p class="help-block">[[meilisearch:admin.stopWordsHelp]] <a href="https://docs.meilisearch.com/reference/api/settings.html#get-stop-words">https://docs.meilisearch.com/reference/api/settings.html#get-stop-words</a></p>
				<ul name="stopWordsList" data-type="list" class="list-group"></ul>
				<button type="button" data-type="add" class="btn btn-info">[[meilisearch:admin.addStopWord]]</button>
			</div>
		</div>
	</div>
	<div class="row">
		<div class="col-sm-2 col-xs-12 settings-header">[[meilisearch:admin.typoTolerance]]</div>
		<div class="col-sm-10 col-xs-12">
			<div class="checkbox" id="reindex-force-container">
				<label for="typoTolerance" class="mdl-switch mdl-js-switch mdl-js-ripple-effect">
					<input type="checkbox" class="mdl-switch__input" id="typoTolerance" name="typoTolerance">
					<span class="mdl-switch__label"><strong>[[meilisearch:admin.typoToleranceEnable]]</strong></span>
				</label>
			</div>
			<div class="form-group">
				<label for="typoToleranceMinWordSizeOneTypo">[[meilisearch:admin.typoToleranceMinWordSizeOneTypo]]</label>
				<input type="number" id="typoToleranceMinWordSizeOneTypo" name="typoToleranceMinWordSizeOneTypo" title="Typo Tolerance Min Word Size One Typo" class="form-control" placeholder="5">
			</div>
			<div class="form-group">
				<label for="typoToleranceMinWordSizeTwoTypos">[[meilisearch:admin.typoToleranceMinWordSizeTwoTypos]]</label>
				<input type="number" id="typoToleranceMinWordSizeTwoTypos" name="typoToleranceMinWordSizeTwoTypos" title="Typo Tolerance Min Word Size Two Typos" class="form-control" placeholder="9">
			</div>
			<div class="form-group" data-type="sorted-list" data-sorted-list="typoToleranceDisableOnWords" data-item-template="admin/plugins/meilisearch/partials/typoToleranceDisableOnWords/item" data-form-template="admin/plugins/meilisearch/partials/typoToleranceDisableOnWords/form">
				<label for="stopWordsList">[[meilisearch:admin.typoToleranceDisableOnWords]]</label>
				<p class="help-block">[[meilisearch:admin.typoToleranceDisableOnWordsHelp]] <a href="https://docs.meilisearch.com/learn/configuration/typo_tolerance.html#disableonwords">https://docs.meilisearch.com/learn/configuration/typo_tolerance.html#disableonwords</a></p>
				<ul name="stopWordsList" data-type="list" class="list-group"></ul>
				<button type="button" data-type="add" class="btn btn-info">[[meilisearch:admin.addTypoToleranceDisabledWord]]</button>
			</div>
		</div>
	</div>
	
</form>
<div class="row">
	<div class="col-sm-2 col-xs-12 settings-header">[[meilisearch:admin.actions]]</div>
	<div class="col-sm-10 col-xs-12">

			<button type="button" id="reindex" class="btn btn-danger btn-sm col-sm-5 col-xs-12">[[meilisearch:admin.reindex]]</button>
			<div class="checkbox col-sm-5 col-xs-12" id="reindex-force-container">
				<label for="force-reindex" class="mdl-switch mdl-js-switch mdl-js-ripple-effect">
					<input type="checkbox" class="mdl-switch__input" id="force-reindex" name="force-reindex">
					<span class="mdl-switch__label"><strong>[[meilisearch:admin.forceReindex]]</strong></span>
				</label>
			</div>
	</div>
</div>
<button id="save" class="floating-button mdl-button mdl-js-button mdl-button--fab mdl-js-ripple-effect mdl-button--colored">
	<i class="material-icons">[[meilisearch:admin.save]]</i>
</button>
