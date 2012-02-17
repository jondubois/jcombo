var $loader = {
	IE: /*@cc_on!@*/false,
	MAX_ATTEMPTS: 3,
	
	_loader: null,
	_frameworkURL: null,
	
	_resources: null,
	_resourcesLoaded: null,
	
	_deepResources: null,
	_deepResourcesLoaded: null,
	
	_resourcesLoadedMap: null,
	
	_waitForReadyInterval: null,
	_attempts: null,
	_allLoadCallback: null,
	_loadFailCallback: null,
	
	_allowLoadAll: null,

	setLoader: function(loader) {
		$loader._loader = loader;
	},
	
	init: function(frameworkURL, resources) {
		$loader._frameworkURL = frameworkURL;
		$loader._resources = resources;
		$loader._resourcesLoaded = [];
		$loader._deepResources = {};
		$loader._deepResourcesLoaded = {};
		$loader._resourcesLoadedMap = {};
		$loader._allowLoadAll = true;
		
		$loader._waitForReadyInterval = setInterval($loader._waitForReady, 10);
		$loader._allLoadCallback = null;
		$loader._loadFailCallback = null;
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
		if($loader._loader) {
			$loader._loader.start($loader._frameworkURL, $loader._resources);
		} else {
			throw "The loader object has not been set - Use the $loader.setLoader() method to set a loader object.";
		}
	},
	
	loadResource: function(url, successCallback, errorCallback) {
		$loader._loadDeepResourceToCache(url, successCallback, errorCallback);
	},
	
	ajax: function(settings) {
		var type;
		if(settings.type) {
			type = settings.type;
		} else {
			type = "GET";
		}
	
		var xmlhttp = $loader._getHTTPReqObject();
		xmlhttp.open(type, settings.url, true);
		xmlhttp.onreadystatechange = function() {
			if(xmlhttp.readyState == 4) {
				if(xmlhttp.status == 200) {
					if(settings.success) {
						settings.success(xmlhttp.responseText);
					}
				} else {
					if(settings.error) {
						settings.error(xmlhttp.statusText);
					} else {
						throw "Failed to load resource: " + url;
					}
				}
			}
		}
		xmlhttp.send();
	},
	
	_loadDeepResourceToCache: function(url, successCallback, errorCallback, rootURL) {
		if(!$loader._resourcesLoadedMap[url]) {
			if(!rootURL || url == rootURL) {
				rootURL = url;
				$loader._deepResources[rootURL] = [];
				$loader._deepResourcesLoaded[rootURL] = [];
			}
			
			$loader._deepResources[rootURL].push(url);
			
			if(/[.](png|jpg|gif|bmp|wbm)$/.test(url)) {
				// images
				var img = new Image();
				img.onload = function() {
					$loader._resourcesLoadedMap[url] = true;
					$loader._deepResourcesLoaded[rootURL].push(url);
					
					if($loader._deepResourcesLoaded[rootURL].length >= $loader._deepResources[rootURL].length) {
						$loader._resourcesLoaded.push(rootURL);
						if(successCallback) {
							successCallback(rootURL);
						}
					}
				};
				
				img.onerror = function() {
					if(errorCallback) {
						errorCallback(url);
					} else {
						throw "Exception: Image failed to load";
					}
				};
				
				img.src = url;
			} else {
				// all text-based files
				$loader.ajax({
					url: url,
					type: "GET",
					success: function(data) {
						$loader._resourcesLoadedMap[url] = true;
						$loader._deepResourcesLoaded[rootURL].push(url);
						var urls;
						if(/[.]css$/.test(url)) {
							urls = $loader._parseDeepCSSURLs(data, url);
							
							var i, curURL;
							var len = urls.length;
							for(i=0; i<len; i++) {
								curURL = urls[i];
								
								if(!$loader._resourcesLoadedMap[curURL]) {
									$loader._loadDeepResourceToCache(curURL, successCallback, errorCallback, rootURL);
								}
							}
						}
						
						if($loader._deepResourcesLoaded[rootURL].length >= $loader._deepResources[rootURL].length) {
							$loader._resourcesLoaded.push(rootURL);
							if(successCallback) {
								successCallback(rootURL);
							}
						}
					},
					
					error: function() {
						if(errorCallback) {
							errorCallback(url);
						} else {
							throw "Exception: One or more resources failed to load";
						}
					}
				});
			}
		}
	},
	
	_parseDeepCSSURLs: function(fileContent, fileURL) {
		var urls = [];
		var fileDirURL = fileURL.match(/^(.*)\//)[0];
		
		var chuncks = $loader._parseFunctionCalls(fileContent, ['url']);
		
		var imports = fileContent.match(/@import +["'][^"']+["']/g);
		if(imports) {
			chuncks = chuncks.concat(imports);
		}
		
		var isolateURL = /(^url[(][ ]*"?|"?[)]$|^@import[ ]*["']|"$)/g;
		var absolute = /^https?:[/][/]/;
		
		var i, curURL;
		var len = chuncks.length;
		for(i=0; i<len; i++) {
			curURL = chuncks[i].replace(isolateURL, '');
			if(curURL != "") {
				if(!absolute.test(curURL)) {
					urls.push(fileDirURL + curURL);
				} else {
					urls.push(curURL);
				}
			}
		}
			
		return urls;
	},
	
	_parseFunctionCalls: function(string, functionNames) {
		var functionCalls = [];
		var functionsRegex = new RegExp('(([^A-Za-z0-9]|^)' + functionNames.join(' *[(]|([^A-Za-z0-9]|^)') + ' *[(])', 'gm');
		var startPos = 0;
		var i, ch, len, curFunc, bt;
		while(true) {
			startPos = string.search(functionsRegex);
			if(startPos < 0) {
				break;
			}
			
			if(string.charAt(startPos) == '(') {
				startPos++;
			}
			
			curFunc = '';
			len = string.length;
			bt = 0;
			for(i=startPos; i<len; i++) {
				ch = string.charAt(i);
				curFunc += ch;
				
				if(ch == '(') {
					bt++;
				} else if(ch == ')') {
					if(--bt == 0) {
						functionCalls.push(curFunc.replace(/^[^A-Za-z0-9]/, ''));
						break;
					}
				}
			}
			string = string.substr(startPos + 2);
		}
		return functionCalls;
	},
	
	abortLoadAll: function() {
		$loader._allowLoadAll = false;
	},
	
	loadAll: function(successCallback, errorCallback) {
		if($loader._allowLoadAll) {
			if(successCallback) {
				$loader._allLoadCallback = successCallback;
			}
			if(errorCallback) {
				$loader._loadFailCallback = errorCallback;
			}
			
			if($loader._resourcesLoaded.length < $loader._resources.length) {
				$loader.loadResource($loader._resources[$loader._resourcesLoaded.length], function(){$loader.loadAll()}, $loader._loadAllFail, true);
			} else {
				if($loader._allLoadCallback) {
					$loader._allLoadCallback($loader._resourcesLoaded);
				}
			}
		} else {
			$loader._allowLoadAll = true;
		}
	},
	
	_loadAllFail: function() {
		if($loader._loadFailCallback) {
			$loader._loadFailCallback($loader._resources, $loader._resourcesLoaded);
		}
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