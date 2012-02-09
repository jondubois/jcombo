var $loader = {
	IE: /*@cc_on!@*/false,
	MAX_ATTEMPTS: 3,
	
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
	_attempts: null,

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
		$loader._attempts = 0;
	},
	
	_waitForReady: function() {
		var head = document.getElementsByTagName('head')[0];
		
		if(head && document.body) {
			clearInterval($loader._waitForReadyInterval);
			$loader._startLoading();
		}
	},
	
	_startLoading: function() {
		$loader._loader.start($loader._frameworkURL, $loader._scripts, $loader._stylesheets);
	},
	
	loadCSS: function(url, id) {
		var head = document.getElementsByTagName('head')[0];
		
		var link = document.createElement('link');
		if(id) {
			link.id = id;
		}
		link.rel = "stylesheet";
		link.type = "text/css";
		link.href = url;
		
		if(head.firstChild) {
			head.insertBefore(link, head.firstChild);
		} else {
			head.appendChild(link);
		}
	},
	
	loadJS: function(url, id, callback) {
		var head = document.getElementsByTagName('head')[0];
		
		var script = document.createElement('script');
		if(id) {
			script.id = id;
		}
		script.type = "text/javascript";
		script.src = url;
		
		script.onload = function(e) {
			$loader._loadedScripts.push(url);
			callback(e);
		}
		
		head.appendChild(script);
	},
	
	_loadAllCSS: function() {
		var len = $loader._stylesheets.length;
		var i;
		for(i=0; i<len; i++) {
			$loader.loadCSS($loader._stylesheets[i]);
		}
	},
	
	_loadAllJS: function() {
		if($loader._loadedScripts.length < $loader._scripts.length) {
			$loader.loadJS($loader._scripts[$loader._loadedScripts.length], null, $loader._loadAllJS);
		} else {
			$loader._loaded();
		}
	},
	
	loadAll: function() {
		$loader._loadAllCSS();
		$loader._loadAllJS();
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
		var xmlhttp = $loader._getHTTPReqObject();
		var jcLoadedScript = $loader._frameworkURL + "core/jcloaded.php";
		if(xmlhttp) {
			xmlhttp.open("GET", jcLoadedScript, true);
			
			xmlhttp.onreadystatechange = function() {
				if(xmlhttp.readyState == 4) {
					if(xmlhttp.status == 200) {
						// Refresh Router. Now that the scripts in cache, Router will launch the app
						location.href = location.href;
					} else {
						if(++$loader._attempts < $loader.MAX_ATTEMPTS) {
							// try again
							$loader.finish();
						}
					}
				}
			}
			// set the jcLoaded session variable to true to inform Router that the app is loaded
			 xmlhttp.send();
			
		} else {
			throw "Could not instantiate XMLHttpRequest";
		}
	},
	
	_getHTTPReqObject: function() {
		xmlhttp = null;
		
		if($loader.IE) {
			try {
				xmlhttp = new ActiveXObject("Msxml2.XMLHTTP");
			} catch (exceptionA) {
				try {
					xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
				} catch (exceptionB) {
					xmlhttp = null;
				}
			}
		}
		
		if (!xmlhttp && typeof XMLHttpRequest != 'undefined') {
			try {
				xmlhttp = new XMLHttpRequest();
			} catch (e) {
				xmlhttp = null;
			}
		}
		
		return xmlhttp;
	}
};