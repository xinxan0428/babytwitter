/**
 * A model that represents a single tweet.
 */
var TweetModel = Backbone.Model.extend({});

/**
 * A model that represents a collection of Tweets returned via the Twitter search API.
 */
var TweetCollection = Backbone.Collection.extend({
	model: TweetModel,
	initialize: function() {
		_.bindAll(this, 'url', 'fetch', 'fetchCallback', 'maxId');
	},
	url: function() {
		return "http://search.twitter.com/search.json?&q=" + this.query + "&rpp=" + 
			this.queryPageSize + "&callback=?";
	},
	queryPageSize: 25,
	query: '',
	
	// Since the Twitter search API response isn't a simple JSON array, override the default
	// fetch behavior with logic that can parse the results.
	fetch: function(options) {
		var me = this;
		$.getJSON(me.url(), 
			{ 
				rpp:me.queryPageSize, 
				q: me.get('query') 
			}, 
			function(response) { 
				me.fetchCallback(response); 
			},
			'jsonp'
		);	
	},
	fetchCallback: function(response) {
		var me = this;
		me.reset();
		
		_.each(response.results, function(tweet, i) {
		    me.add(new TweetModel({
		    	  'id': tweet.id,
		          'createdAt': tweet.created_at,
		          'profileImageUrl': tweet.profile_image_url,
		          'user': tweet.from_user,
		          'text': tweet.text   
		    }), 
		    { silent: true }); 
		});
		
		this.trigger('change');
	},
	
	maxId: function() {
		return this.max(function(tweet) { return tweet.id; });
	}
});



var TwitterSearch = Backbone.Model.extend({
	newItemCheckInterval: 30000,
	queryPageSize: 26,
	initialize: function(attributes) {
		_.bindAll(this, 'clear', 'executeTwitterSearch', 'revealLatestTweets', 'fetchNewItemCountCallback');
		this.bind('change:query', this.queryChanged);
		
		this.displayedTweets = new TweetCollection();
		this.displayedTweets.queryPageSize = this.queryPageSize;
		
		this.latestTweets = new TweetCollection();
		this.latestTweets.queryPageSize = this.queryPageSize;
		this.latestTweets.bind('change', this.fetchNewItemCountCallback);
	},
	queryChanged: function() {
		// Do initial fetch
		this.executeTwitterSearch();
				
		// Set refresh
		this.fetchTimer = setInterval(this.executeTwitterSearch, this.newItemCheckInterval);
	},
	executeTwitterSearch: function() {
		this.latestTweets.query = this.get('query');
		this.latestTweets.fetch();
	}, 
	fetchNewItemCountCallback: function(response) {
		var newItems = 0,
			me = this;

		if(!this.get('lastRead')) {
			this.set({ 'lastRead': this.latestTweets.maxId().get('id') });
		}
		
		newItems = this.latestTweets.filter(function(tweet) {
			return tweet.id > me.get('lastRead');
		}).length;
		
		if(newItems == 0) {
	       	me.revealLatestTweets(); 
        }
		
		this.set({
			'newItemCount': newItems
		});
	},
	revealLatestTweets: function() {
		this.displayedTweets.reset();
	   	var me = this,
	   		maxId = 0;
	   	$.each(this.latestTweets.models, function(i, val) {
	   		if(val.get('id') > maxId) {
	   			maxId = val.get('id');
	   		}
	    	me.displayedTweets.add(val);
	   	});   
	   	me.set({ 'lastRead': maxId });
	},
	clear: function() {
		clearInterval(this.fetchTimer);
	}
});



var CreateSearchView = Backbone.View.extend({
	initialize: function() {
		_.bindAll(this, 'updateQuery', 'submitSearchClicked', 'queryKeyPress', 'latestTweetsChanged');
		this.model.latestTweets.bind('change', this.latestTweetsChanged);
	},
	events: {
		"click #submit-search": "submitSearchClicked",
		"keypress #search-query" : "queryKeyPress"
	},
	queryKeyPress: function(event) {
		if(event.keyCode == 13) {
			this.updateQuery();
		}
	},
	submitSearchClicked: function() {
		this.updateQuery();
	},
	updateQuery: function() {
		var value = this.$('#search-query').val();
		this.model.set({ 'query': value });
		this.model.set({ 'lastRead': 0 });
		
		this.$('.loading-icon').show();
	},
	latestTweetsChanged: function() {
		this.$('.loading-icon').hide();
	}
});

/**
 * A view that represents a list of Tweets
 */
var TweetListView = Backbone.View.extend({
	initialize: function() {
		_.bindAll(this, 'render', 'addTweet', 'reset');
		this.collection.bind('add', this.addTweet);
		this.collection.bind('reset', this.reset);
	},
	render: function() {	
		var template = '\
			<div id="new-result-msg"></div> \
			<ul id="tweet-list"></ul>';
			
		$(this.el).html(Mustache.to_html(template));
		this.tweetList = this.$('#tweet-list');	
		
		var me = this;
		this.collection.each(function(tweet) {
			var view = new TweetView({ model: tweet  });	
 			me.tweetList.append(view.render().el);	
		});			
	},
	addTweet: function(tweet) {
 		var view = new TweetView({ model: tweet  });	
 		this.tweetList.append(view.render().el);
	},
	reset: function() {
		$(this.el).empty();
		this.render();
	}
});

/**
 * A view that represents a single Tweet
 */
var TweetView = Backbone.View.extend({
	tagName: 'li',
	initialize: function() {
		_.bindAll(this, 'render');
	},
	render: function() {
		var template = '\
			<div class="tweet"> \
				<div class="profile-image"> \
					<img src="{{profileImageUrl}}" width="48" height="48" /> \
				</div> \
				<div class="tweet-content"> \
					<div class="tweet-body"><a href="http://www.twitter.com/{{user}}">{{user}}</a>: {{text}}</div> \
					<div class="posted-date">{{createdAt}}</div> \
				</div> \
			</div> \
			';

		$(this.el).html(Mustache.to_html(template, this.model.toJSON()));
		
		return this;
	}
});