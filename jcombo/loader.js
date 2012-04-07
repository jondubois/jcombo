var $loader = {
	_ie: false,
	_ieVersion: null,
	MAX_ATTEMPTS: 3,
	_embedCounter: null,
	
	_loader: null,
	_frameworkURL: null,
	_routToScriptURL: null,
	
	_appDefinition: null,
	_resources: null,
	_resourceIDs: null,
	_resourcesLoaded: null,
	
	_deepResources: null,
	_deepResourcesLoaded: null,
	
	_resourcesLoadedMap: null,
	
	_waitForReadyInterval: null,
	_attempts: null,
	_allLoadCallback: null,
	_loadFailCallback: null,
	
	_allowLoadAll: null,
	_skipPreload: null,

	setLoader: function(loader) {
		$loader._loader = loader;
		
		if(!$loader._waitForReadyInterval) {
			$loader._waitForReadyInterval = setInterval($loader._waitForReady, 20);
		}
	},
	
	init: function(frameworkURL, routToScriptURL, loadScriptURL, resources, appDefinition, skipPreload) {
		$loader._frameworkURL = frameworkURL;
		$loader._routToScriptURL = routToScriptURL;
		
		$loader._appDefinition = appDefinition;
		
		$loader._resourceIDs = {};
				
		$loader._resources = resources;
		$loader._resources.push($loader._routToScriptURL);
		$loader._resourceIDs[$loader._routToScriptURL] = 'jComboInitScript';
		
		$loader._resourcesLoaded = [];
		$loader._deepResources = {};
		$loader._deepResourcesLoaded = {};
		$loader._resourcesLoadedMap = {};
		$loader._allowLoadAll = true;
		
		$loader._allLoadCallback = null;
		$loader._loadFailCallback = null;
		$loader._attempts = 0;
		$loader._embedCounter = 0;
		
		if(/MSIE (\d+\.\d+);/.test(navigator.userAgent)) {
			$loader._ie = true;
			$loader._ieVersion = new Number(RegExp.$1)
		}
		
		if(skipPreload) {
			$loader._skipPreload = true;
			$loader._waitForReadyInterval = setInterval($loader._waitForReady, 20);
		} else {
			$loader._skipPreload = false;
			$loader.scriptTag(loadScriptURL, 'text/javascript');
		}
	},
	
	getAppDefinition: function() {
		return $loader._appDefinition;
	},
	
	_waitForReady: function() {
		var head = document.getElementsByTagName('head')[0];
		
		if(head && document.body) {
			clearInterval($loader._waitForReadyInterval);
			if($loader._skipPreload) {
				$loader.loadAll(function() {
					$loader._embedAllResources();
				});
			} else {
				$loader._startLoading();
			}
		}
	},
	
	_startLoading: function() {
		$loader._loader.start($loader._frameworkURL, $loader._resources);
	},
	
	_embedAllResources: function() {
		if($loader._embedCounter < $loader._resources.length) {
			var url = $loader._resources[$loader._embedCounter];
			var id = $loader._resourceIDs[url];
			
			if(/[.]js$/.test(url)) {
				$loader.scriptTag(url, 'text/javascript', id, function() {
					$loader._embedCounter++;
					$loader._embedAllResources();
				});
			} else if(/[.]css$/.test(url)) {
				$loader.linkTag(url, 'text/css', 'stylesheet', id);
				$loader._embedCounter++;
				$loader._embedAllResources();
			}
		}
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
				$loader._loadDeepResourceToCache($loader._resources[$loader._resourcesLoaded.length], function(){$loader.loadAll()}, $loader._loadAllFail);
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
			$loader._loadFailCallback($loader._arrayExclude($loader._resources, $loader._resourcesLoaded));
		} else {
			throw 'Exception: One or more resources could not be loaded';
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
					$loader._embedAllResources();
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
	
	/**
		Insert a script tag into the current document as it is being constructed.
		The id & callback parameters are optional.
	*/
	scriptTag: function(url, type, id, callback) {	
		var head = document.getElementsByTagName('head')[0];
	
		var script = document.createElement('script');
		
		if(callback) {
			if(!$loader._ie || $loader._ieVersion > 8) {
				script.onload = function() {callback(url);};
			} else {
				script.onreadystatechange = function() {callback(url);};
			}
		}
		
		if(id) {
			script.id = id;
		}
		script.type = type;
		script.src = url;
		
		head.appendChild(script);
	},
	
	/** 
		Insert a link tag into the current document as it is being constructed.
		The id & callback parameters are optional.
	*/
	linkTag: function(url, type, rel, id) {
		var head = document.getElementsByTagName('head')[0];
		
		var curScripts = document.getElementsByTagName('script');
		var firstScript = null;
		var firstIndex = 0;
		
		if(curScripts) {
			var len = curScripts.length;
			while(firstIndex < len && curScripts[firstIndex].parentNode != head) {
				firstIndex++;
			}
			if(firstIndex < len) {
				firstScript = curScripts[firstIndex];
			}
		}
		
		var link = document.createElement('link');
		
		if(id) {
			link.id = id;
		}
		link.rel = rel;
		link.type = type;
		link.href = url;
		
		if(firstScript) {
			head.insertBefore(link, firstScript);
		} else {
			var curLinks = document.getElementsByTagName('link');
			var lastLink = null;
			var lastIndex = curLinks.length - 1;
			if(curLinks) {
				while(lastIndex >= 0 && curLinks[lastIndex].parentNode != head) {
					lastIndex--;
				}
				if(lastIndex >= 0) {
					lastLink = curLinks[lastIndex];
				}
			}
			
			if(lastLink) {
				if(lastLink.nextSibling) {
					head.insertBefore(link, lastLink.nextSibling);
				} else {
					head.appendChild(link);
				}
			} else {
				head.appendChild(link);
			}
		}
	},
	
	_loadDeepResourceToCache: function(url, successCallback, errorCallback, rootURL) {
		if(!$loader._resourcesLoadedMap[url]) {
			if(!rootURL || url == rootURL) {
				rootURL = url;
				$loader._deepResources[rootURL] = [];
				$loader._deepResourcesLoaded[rootURL] = [];
			}
			
			$loader._deepResources[rootURL].push(url);
			
			if(/[.](png|jpg|gif)$/.test(url)) {
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
		var urlMap = {};
		var urls = [];
		var fileDirURL = fileURL.match(/^(.*)\//)[0];
		
		var chuncks = $j.grab._parseFunctionCalls(fileContent, ['url']);
		
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
			if(curURL != "" && !urlMap.hasOwnProperty(curURL)) {
				if(!absolute.test(curURL)) {
					urls.push(fileDirURL + curURL);
				} else {
					urls.push(curURL);
				}
				urlMap[curURL] = true;
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
	
	_arrayExclude: function(array, excludeArray) {
		var excl = [];
		var mapExcl = {};
		var i;
		var len = excludeArray.length;
		for(i=0; i<len; i++) {
			mapExcl[excludeArray[i]] = true;
		}
		
		len = array.length;
		for(i=0; i<len; i++) {
			if(!mapExcl[array[i]]) {
				excl.push(array[i]);
			}
		}
		return excl;
	},
	
	_getHTTPReqObject: function() {
		xmlhttp = null;
		
		if($loader._ie) {
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