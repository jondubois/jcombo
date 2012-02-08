var $loader = {
	_loader: null,
	_frameworkURL: null,
	_loadedScripts: null,
	_loadedStylesheets: null,
	
	_scripts: null,
	_stylesheets: null,
	_waitForReadyInterval: null,
	
	_allScriptsLoaded: null,
	_allStylesheetsLoaded: null,
	
	_onLoadCallbacks: null,

	setLoader: function(loader) {
		$loader._loader = loader;
	},
	
	init: function(frameworkURL, scripts, stylesheets) {
		$loader._frameworkURL = frameworkURL;
		$loader._scripts = scripts;
		$loader._stylesheets = stylesheets;
		$loader._loadedScripts = [];
		$loader._loadedStylesheets = [];
		$loader._allScriptsLoaded = false;
		$loader._allStylesheetsLoaded = false;
		$loader._waitForReadyInterval = setInterval($loader._waitForReady, 10);
		$loader._onLoadCallbacks = [];
	},
	
	_waitForReady: function() {
		if(document.head && document.body) {
			clearInterval($loader._waitForReadyInterval);
			$loader._startLoading();
		}
	},
	
	_startLoading: function() {
		$loader._loader.start($loader._frameworkURL, $loader._scripts, $loader._stylesheets);
	},
	
	loadJS: function(url, id, callback) {
		var script = document.createElement('script');
		if(id) {
			script.id = id;
		}
		script.type = "text/javascript";
		script.src = url;
		
		script.onload = function() {
			$loader._loadedScripts.push(url);
			callback();
		}
		
		document.head.appendChild(script);
	},
	
	loadCSS: function(url, id, callback) {
		var link = document.createElement('link');
		if(id) {
			link.id = id;
		}
		link.rel = "stylesheet";
		link.type = "text/css";
		link.href = url;
		
		link.onload = function() {
			$loader._loadedStylesheets.push(url);
			callback();
		}
		
		document.head.appendChild(link);
	},
	
	loadAllJS: function() {
		if($loader._loadedScripts.length < $loader._scripts.length) {
			$loader.loadJS($loader._scripts[$loader._loadedScripts.length], null, $loader.loadAllJS);
		} else {
			$loader._onScriptsLoaded();
		}
	},
	
	loadAllCSS: function() {
		if($loader._loadedStylesheets.length < $loader._stylesheets.length) {
			$loader.loadJS($loader._stylesheets[$loader._loadedStylesheets.length], null, $loader.loadAllCSS);
		} else {
			$loader._onCSSLoaded();
		}
	},
	
	_onScriptsLoaded: function() {
		if($loader._loadedStylesheets.length >= $loader._stylesheets.length) {
			$loader._loaded();
		}
	},
	
	_onCSSLoaded: function() {
		if($loader._loadedScripts.length >= $loader._scripts.length) {
			$loader._loaded();
		}
	},
	
	_loaded: function() {
		var len = $loader._onLoadCallbacks.length;
		var i;
		
		for(i=0; i<len; i++) {
			$loader._onLoadCallbacks[i]();
		}
	},
	
	onLoad: function(callback) {
		$loader._onLoadCallbacks.push(callback);
	},
	
	finish: function() {
		location.href = location.href;
	}
};