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
