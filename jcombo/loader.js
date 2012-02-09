var $loader = {
	IE: /*@cc_on!@*/false,
	MAX_ATTEMPTS: 3,
	
	_loader: null,
	_frameworkURL: null,
	
	_resources: null,
	_loadedResources: null,
	
	_waitForReadyInterval: null,
	
	_loadCallbacks: null,
	_attempts: null,

	setLoader: function(loader) {
		$loader._loader = loader;
	},
	
	init: function(frameworkURL, resources) {
		$loader._frameworkURL = frameworkURL;
		$loader._resources = resources;
		$loader._loadedResources = [];
		$loader._waitForReadyInterval = setInterval($loader._waitForReady, 10);
		$loader._loadCallbacks = [];
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
		$loader._loader.start($loader._frameworkURL, $loader._resources);
	},
	
	loadResource: function(url, id, callback) {
		var xmlhttp = $loader._getHTTPReqObject();
		xmlhttp.open("GET", url, true);
		xmlhttp.onreadystatechange = function() {
			if(xmlhttp.readyState == 4) {
				if(xmlhttp.status == 200) {
					$loader._loadedResources.push(url);
					callback();
				} else {
					throw "Failed to load resource: " + url;
				}
			}
		}
		xmlhttp.send();
	},
	
	startLoading: function() {
		if($loader._loadedResources.length < $loader._resources.length) {
			$loader.loadResource($loader._resources[$loader._loadedResources.length], null, $loader.startLoading);
		} else {
			$loader._loaded();
		}
	},
	
	_loaded: function() {
		var len = $loader._loadCallbacks.length;
		var i;
		
		for(i=0; i<len; i++) {
			$loader._loadCallbacks[i]();
		}
	},
	
	load: function(callback) {
		$loader._loadCallbacks.push(callback);
	},
	
	finish: function() {
		var jcLoadedScript = $loader._frameworkURL + "core/jcloaded.php";
		
		var xmlhttp = $loader._getHTTPReqObject();
		xmlhttp.open("GET", jcLoadedScript, true);
		xmlhttp.onreadystatechange = function() {
			if(xmlhttp.readyState == 4) {
				if(xmlhttp.status == 200) {
					// refresh Router - Now that the script is in cache, Router will launch the app
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
		
		if(!xmlhttp) {
			throw "Could not instantiate XMLHttpRequest";
		}
		
		return xmlhttp;
	}
};