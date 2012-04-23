/**
	This script provides the core javascript functionality of jCombo.
*/
var $j = {
	_appPath: null,
	_frameworkURL: null,
	_jsLibsURL: null,
	_frameworkStylesURL: null,
	_serverGatewayURL: null,
	_scriptsRouterURL: null,
	_appScriptsURL: null,
	_appStylesURL: null,
	_appAssetsURL: null,
	_appFilesURL: null,
	_appTemplatesURL: null,
	_cacheSeverCalls: false,
	_cacheTemplates: true,
	_callbacks: {},
	_callListeners: {},
    
	init: function(appDefinition) {
		$j._appPath = appDefinition.appPath;
		$j._frameworkURL = appDefinition.frameworkURL;
		$j._jsLibsURL = appDefinition.jsLibsURL;
		$j._frameworkStylesURL = appDefinition.frameworkStylesURL;
		$j._serverGatewayURL = appDefinition.serverGatewayURL;
		$j._scriptsRouterURL = location.href.replace(/\?.*/, '');
		$j._appScriptsURL = appDefinition.appScriptsURL;
		$j._appStylesURL = appDefinition.appStylesURL;
		$j._appTemplatesURL = appDefinition.appTemplatesURL;
		$j._appAssetsURL = appDefinition.appAssetsURL;
		$j._appFilesURL = appDefinition.appFilesURL;
		$j._callbacks['ready'] = [];
		$j._callbacks['fail'] = [];
	},
	
	/**
		Convert a class (function) into a mixin-extendable class. This will give the class internal access to an
		initMixin(mixinClass, args) method and a callMixinMethod(mixinClass, method, args) which will allow the current
		class to manipulate base mixins.
	*/
	mixin: function(mainClass) {
		var mixinHolder = function() {
			this._internalMixinArgs = {};
			
			this.initMixin = function(mixinClass, args) {
				if(args && !(args instanceof Array)) {
					throw 'Exception: The args parameter of the initMixin function must be an Array';
				}
				this._internalMixinArgs[mixinClass] = args;
				
				if(args) {
					mixinClass.apply(this, args);
				} else {
					mixinClass.apply(this);
				}
			}
			
			this.callMixinMethod = function(mixinClass, method, args) {
				if(args && !(args instanceof Array)) {
					throw 'Exception: The args parameter of the callMixinMethod function must be an Array';
				}
				var mixedIn = new mixinClass(this._internalMixinArgs[mixinClass]);
				var methodToCall = mixedIn[method];
				
				var value, index;
				for(index in this) {
					value = this[index];
					if((!(value instanceof Function) || !(mixedIn[index] instanceof Function) || mixedIn[index].toString() != value.toString())) {
						mixedIn[index] = value;
					}
				}
				var result = methodToCall.apply(mixedIn, args);
				delete mixedIn;
				
				return result;
			}
			
			this.instanceOf = function(classReference) {
				return this instanceof classReference || this._internalMixinArgs.hasOwnProperty(classReference);
			}
		}
		mixinHolder.apply(mainClass.prototype);
		
		return mainClass;
	},
	
	getBasicType: function(variable) {
		var classType = {}.toString
		var typeRegex = /[^0-9A-Za-z]*([A-Z][a-zA-Z0-9]*)/;
		var typeString = classType.call(variable);
		return typeString.match(typeRegex)[1];
	},
	
	/**
		Bind a callback function to jCombo's ready event. The specified function will be called when jCombo is ready to begin processing.
	*/
	ready: function(callback) {
		if(!$j.grab.isGrabbing()) {
			callback();
		} else {
			$j._callbacks['ready'].push(callback);
		}
	},
	
	/**
		Bind a callback function to jCombo's fail event. The specified function will be called when jCombo fails to load a resource.
		The callback can accept a parameter which indicates the URL of the resource which failed to load.
	*/
	fail: function(callback) {
		$j._callbacks['fail'].push(callback);
	},
	
	_triggerReady: function() {
		if($j._callbacks['ready'].length > 0) {
			$j._execReadyCallbacks();
		}
	},
	
	_execReadyCallbacks: function() {
		var len = $j._callbacks['ready'].length;
		var i;
		for(i=len-1; i>=0; i--) {
			$j._callbacks['ready'][i]();
		}
		$j._callbacks['ready'] = [];
	},
	
	_triggerFail: function(url) {
		var len = $j._callbacks['fail'].length;
		var i;
		for(i=0; i<len; i++) {
			 $j._callbacks['fail'][i](url);
		}
	},
	
	/**
		This object holds error functions to handle various client-side error types that can occur within the system.
		Each function handles a specific type of error and can accept any suitable number of parameters
		in order to generate the appropriate error message.
	*/
	errors: {
		serverGatewayError: function(message) {
			return "ServerGatewayError: " + message;
		},
		
		loadTemplateError: function(message) {
			return "LoadTemplateError: Could not load one or more templates because of the following AJAX error: " + message;
		},
		
		serverInterfaceError: function(message) {
			return "ServerInterfaceError: " + message;
		},
		
		loadError: function(resourceURL) {
			return "LoadError: Failed to load resource: " + resourceURL;
		}
	},
	
	/**
		Get the URL of jCombo's root directory.
	*/
	getRootURL: function() {
		return $j._frameworkURL;
	},
	
	/**
		Navigate to another script.
	*/
	navigateToScript: function(scriptName) {
		location.href = $j._scriptsRouterURL + (scriptName ? "?" + scriptName : "");
	},
	
	caching: {
		/**
			Enable/disable default caching for server interface AJAX calls performed by jCombo.
			Server call caching is disabled by default.
		*/
		cacheServerCalls: function(bool) {
			$j._cacheSeverCalls = bool;
		},
		
		/**
			Enable/disable default caching for loading templates.
			Template caching is enabled by default.
		*/
		cacheTemplates: function(bool) {
			$j._cacheTemplates = bool;
		}
	},
	
	/**
		Grab allows you to include external scripts, CSS stylesheets and templates into your JavaScript.
		Some grab methods allow you to load resources either synchronously or asynchronously.
	*/
	grab: {
		_activeScripts: new Object(),
		_activeCSS: new Object(),
		_loadedTemplates: new Object(),
		_resources: [],
		_resourcesLoaded: [],
		_resourcesGrabbed: [],
		_deepResources: [],
		_deepResourcesLoaded: [],
		_resourcesLoadedMap: {},
		
		_deepResources: {},
		_deepResourcesLoaded: {},
		_cssImportRegex: /@import +(url([(] *| +))?"[^"]*"/g,
		_quoteRegex: /"([^"]*)"/,
		_curFileDir: /^(.*)\//,
		
		/**
			Include a script from the application's script directory into the current script.
		*/
		script: function(name, successCallback, errorCallback) {
			var resourceName = $j._appScriptsURL + name + '.js';
			if(!$j.grab._activeScripts[resourceName]) {
				$j.grab.loadAndEmbedScript(resourceName, successCallback, errorCallback);
				$j.grab._activeScripts[resourceName] = true;
			}
		},
		
		/**
			Include a script from jCombo's javascript library directory into the current script.
		*/
		lib: function(name, successCallback, errorCallback) {
			var resourceName = $j._jsLibsURL + name + '.js';
			if(!$j.grab._activeScripts[resourceName]) {
				$j.grab.loadAndEmbedScript(resourceName, successCallback, errorCallback);
				$j.grab._activeScripts[resourceName] = true;
			}
		},
		
		/**
			Include a script from a given URL.
		*/
		remoteScript: function(url, successCallback, errorCallback) {
			var resourceName = url;
			if(!$j.grab._activeScripts[resourceName]) {
				$j.grab.loadAndEmbedScript(resourceName, successCallback, errorCallback);
				$j.grab._activeScripts[resourceName] = true;
			}
		},
		
		/**
			Include an application CSS stylesheet (from the application directory) into the application.
		*/
		appCSS: function(name, successCallback, errorCallback) {
			var resourceName = $j._appStylesURL + name + '.css';
			if(!$j.grab._activeCSS[resourceName]) {
				$j.grab.loadAndEmbedCSS(resourceName, successCallback, errorCallback);
				$j.grab._activeCSS[resourceName] = true;
			}
		},
		
		/**
			Include a default framework CSS stylesheet (from the jcombo framework directory) into the application.
		*/
		frameworkCSS: function(name, successCallback, errorCallback) {
			var resourceName = $j._frameworkStylesURL + name + '.css';
			if(!$j.grab._activeCSS[resourceName]) {
				$j.grab.loadAndEmbedCSS(resourceName, successCallback, errorCallback);
				$j.grab._activeCSS[resourceName] = true;
			}
		},
		
		/**
			Get the the image at the given URL and start downloading it.
		*/
		image: function(url, callback) {
			var img = new Image();
			if(callback) {
				img.onload = function() {
					callback(url);
				}
			}
			
			img.src = url;
			return img;
		},
		
		/**
			Grab the URL of an asset from the application's assets folder. A file extension must be appended to the file name.
		*/
		assetURL: function(nameWithExtension) {
			return $j._appAssetsURL + nameWithExtension;
		},
		
		/**
			Grab the URL of a file from the application's file folder. A file extension must be appended to the file name.
		*/
		fileURL: function(nameWithExtension) {
			return $j._appFilesURL + nameWithExtension;
		},
		
		/**
			Load a handlebars template for use within the current script.
			The jRequest parameter is optional and should be set when you want to load a template 
			dynamically at runtime.
			If the jRequest parameter is omitted, this function will return the compiled handlebars 
			template - Otherwise it will return nothing; the compiled template will need to be accessed through jRequest's 
			success handler.
		*/
		handlebars: function(name, jRequest, raw) {
			var resourceName = $j._appTemplatesURL + name + '.handlebars';
			
			if(jRequest) {		
				if(!$j.grab._loadedTemplates[resourceName] || $j.grab._loadedTemplates[resourceName].status == "error") {
					
					$j.grab._loadedTemplates[resourceName] = {status: "loading", response: null, callbacks: new Array(jRequest)};
					
					var cacheTemplate;
					if(jRequest.cache) {
						cacheTemplate = jRequest.cache;
					} else {
						cacheTemplate = $j._cacheTemplates;	
					}
					
					var settings = {
						url: resourceName,
						cache: cacheTemplate,
						dataType: "html",
						async: true,
						
						success: function(data, textStatus, jqXHR) {
							if($j.grab._loadedTemplates[resourceName] && $j.grab._loadedTemplates[resourceName].status != "done") {
								if(!raw) {
									data = Handlebars.compile(data);
								}
								$j.grab._loadedTemplates[resourceName].status = "done";
								$j.grab._loadedTemplates[resourceName].response = {data: data, textStatus: textStatus, jqXHR: jqXHR};
								$.each($j.grab._loadedTemplates[resourceName].callbacks, function(index, jReq) {
									if(jReq.success) {
										jReq.success(data, textStatus, jqXHR);	
									}
								});
								$j.grab._loadedTemplates[resourceName].callbacks = new Array();
							}
						},
						
						error: function(jqXHR, textStatus, errorThrown) {
							$j._triggerFail(resourceName);
							if($j.grab._loadedTemplates[resourceName]) {
								$j.grab._loadedTemplates[resourceName].status = "error";
								$j.grab._loadedTemplates[resourceName].response = null;
								$.each($j.grab._loadedTemplates[resourceName].callbacks, function(index, jReq) {
									if(jReq.error) {
										jReq.error($j.errors.loadTemplateError(errorThrown), textStatus, jqXHR);
									}
								});
							}
						},
						
						complete: function(jqXHR, textStatus) {
							if($j.grab._loadedTemplates[resourceName]) {
								$.each($j.grab._loadedTemplates[resourceName].callbacks, function(index, jReq) {
									if(jReq.complete) {
										jReq.complete(textStatus, jqXHR);
									}	
								});
								if($j.grab._loadedTemplates[resourceName].status == "error") {
									$j.grab._loadedTemplates[resourceName] = null;
								}
							}
						}
					};
					$.ajax(settings);
					
				} else if($j.grab._loadedTemplates[resourceName].status == "loading") {
					$j.grab._loadedTemplates[resourceName].callbacks.push(jRequest);
				} else if($j.grab._loadedTemplates[resourceName].status == "done") {
					var response = $j.grab._loadedTemplates[resourceName].response;
					jRequest.success(response.data, response.textStatus, response.jqXHR);
				}
			} else {	
				if(!$j.grab._loadedTemplates[resourceName] || $j.grab._loadedTemplates[resourceName].status == "loading" ||
						$j.grab._loadedTemplates[resourceName].status == "error") {
							
					if(!$j.grab._loadedTemplates[resourceName]) {
						$j.grab._loadedTemplates[resourceName] = {status: "loading", response: null, callbacks: new Array()};
					}
					
					var settings = {
						url: resourceName,
						cache: $j._cacheTemplates,
						dataType: "html",
						async: false,
						
						success: function(data, textStatus, jqXHR) {
							if(!raw) {
								data = Handlebars.compile(data);
							}
							$j.grab._loadedTemplates[resourceName].status = "done";
							$j.grab._loadedTemplates[resourceName].response = {data: data, textStatus: textStatus, jqXHR: jqXHR};
							$.each($j.grab._loadedTemplates[resourceName].callbacks, function(index, jReq) {
								if(jReq.success) {
									jReq.success(data, textStatus, jqXHR);
								}	
							});
						},
						
						error: function(jqXHR, textStatus, errorThrown) {
							$j._triggerFail(resourceName);
							$.each($j.grab._loadedTemplates[resourceName].callbacks, function(index, jReq) {
								if(jReq.error) {
									jReq.error($j.errors.loadTemplateError(errorThrown), textStatus, jqXHR);
								}	
							});
							
							$.each($j.grab._loadedTemplates[resourceName].callbacks, function(index, jReq) {
								if(jReq.complete) {
									jReq.complete(textStatus, jqXHR);
								}	
							});
							$j.grab._loadedTemplates[resourceName] = null;
							throw $j.errors.loadTemplateError(errorThrown);
						}
					};
					$.ajax(settings);
				}
				
				return $j.grab._loadedTemplates[resourceName].response.data;	
			}
		},
		
		loadAndEmbedScript: function(url, successCallback, errorCallback) {
			$j.grab._loadDeepResourceToCache(url, function() {
				$j.grab.scriptTag(url, 'text/javascript', null, function() {
					$j.grab._resourcesGrabbed.push(url);
					if(successCallback) {
						successCallback(url);
					}
					if(!$j.grab.isGrabbing()) {
						$j._triggerReady();
					}
				});
			}, errorCallback);
		},
		
		loadAndEmbedCSS: function(url, successCallback, errorCallback) {
			$j.grab._loadDeepResourceToCache(url, function() {
				$j.grab._resourcesGrabbed.push(url);
				$j.grab.linkTag(url, 'text/css', 'stylesheet');
				if(successCallback) {
					successCallback(url);
				}
				if(!$j.grab.isGrabbing()) {
					$j._triggerReady();
				}
			}, errorCallback);
		},
		
		/**
			Insert a script tag into the current document as it is being constructed.
			The id & callback parameters are optional.
		*/
		scriptTag: function(url, type, id, callback) {		
			var head = document.getElementsByTagName('head')[0];
			var initScript = document.getElementById('jComboInitScript');
		
			var script = document.createElement('script');
			
			if(!$.browser.msie || parseInt($.browser.version) > 8) {
				script.onload = function() {callback(url);};
			} else {
				script.onreadystatechange = function() {callback(url);};
			}
			
			if(id) {
				script.id = id;
			}
			script.type = type;
			script.src = url;
			
			head.insertBefore(script, initScript);
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
		
		isGrabbing: function() {
			return $j.grab._resourcesGrabbed.length < $j.grab._resources.length;
		},
		
		_loadDeepResourceToCache: function(url, successCallback, errorCallback, rootURL) {
			if(!$j.grab._resourcesLoadedMap[url]) {
				if(!rootURL || url == rootURL) {
					rootURL = url;
					$j.grab._resources.push(url);
					$j.grab._deepResources[rootURL] = [];
					$j.grab._deepResources[rootURL].push(url);
					
					$j.grab._deepResourcesLoaded[rootURL] = [];
				}
				
				if(/[.](png|jpg|gif)$/.test(url)) {
					// images
					var img = new Image();
					img.onload = function() {
						$j.grab._resourcesLoadedMap[url] = true;
						$j.grab._deepResourcesLoaded[rootURL].push(url);
						
						if($j.grab._deepResourcesLoaded[rootURL].length >= $j.grab._deepResources[rootURL].length) {
							$j.grab._resourcesLoaded.push(rootURL);
							if(successCallback) {
								successCallback(rootURL);
							}
						}
					};
					
					img.onerror = function() {
						$j._triggerFail(url);
						if(errorCallback) {
							errorCallback(url);
						}
					};
					
					img.src = url;
				} else {
					// all text-based files
					$.ajax({
						url: url,
						type: "GET",
						dataType: "html",
						cache: true,
						async: true,
						success: function(data) {
							$j.grab._resourcesLoadedMap[url] = true;
							$j.grab._deepResourcesLoaded[rootURL].push(url);
							var urls;
							if(/[.]css$/.test(url)) {
								urls = $j.grab._parseDeepCSSURLs(data, url);
								
								var i;
								var len = urls.length;
								for(i=0; i<len; i++) {
									$j.grab._deepResources[rootURL].push(urls[i]);
								}
								for(i=0; i<len; i++) {
									$j.grab._loadDeepResourceToCache(urls[i], successCallback, errorCallback, rootURL);
								}
							}
							
							if($j.grab._deepResourcesLoaded[rootURL].length >= $j.grab._deepResources[rootURL].length) {
								$j.grab._resourcesLoaded.push(rootURL);
								if(successCallback) {
									successCallback(rootURL);
								}
							}
						},
						
						error: function() {
							$j._triggerFail(url);
							if(errorCallback) {
								errorCallback(url);
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
		}
	},
	
	serverInterfaceDescription: {},
	
	/*
		The following methods are part of the core of jCombo.
		Do not call these methods directly.
	*/
	_sendCallRequest: function(appPath, jRequest, callRequest) {
		var self = this;
		var className = callRequest.className;
		var method = callRequest.method;
		
		jRequest.data = "appPath=" + encodeURIComponent(appPath) + "&request=" + JSON.stringify(callRequest);
		jRequest.dataType = "json";
		
		var proxyRequest = $.extend(true, {}, jRequest);
		
		self.onSuccess = function(data, textStatus, jqXHR) {
			if(data.success) {
				$j._triggerSuccessListeners(className, method, data.value, textStatus, jqXHR);
				
				if(jRequest.success) {
					jRequest.success(data.value, textStatus, jqXHR);
				}
			} else {
				if(proxyRequest.error) {
					proxyRequest.error(jqXHR, textStatus, data.value);
				}
				if(!jRequest.error) {
					throw $j.errors.serverGatewayError(data.value);
				}
			}
		}
		
		self.onError = function(jqXHR, textStatus, errorThrown) {
			$j._triggerErrorListeners(className, method, errorThrown, textStatus, jqXHR);
			
			if(jRequest.error) {
				jRequest.error(errorThrown, textStatus, jqXHR);
			}
		}
		
		self.onComplete = function(jqXHR, textStatus) {
			if(jRequest.complete) {
				jRequest.complete(textStatus, jqXHR);
			}
		}
		
		proxyRequest.success = self.onSuccess;
		proxyRequest.error = self.onError;
		proxyRequest.complete = self.onComplete;
		
		$.ajax(proxyRequest);
	},
	
	/**
		Call a static PHP method from JavaScript - The call will be performed asynchronously and any returned value will be passed
		to the handler object.
		@param string className The name of the PHP class to invoke
		@param string method The name of the static method of the specified class to call
		@param array params An array of parameters to pass to the specified method
		@param object handler A handler object that will handle the return value of the PHP method - 
		The handler is an object which implements any of the following handler methods: success(data, textStatus, jqXHR), error(data, textStatus, jqXHR), complete(textStatus, jqXHR)
	*/
	acall: function(className, method, params, resultHandler, errorHandler) {
		$j.validateCall(className, method, params);
		var jRequest = {};
		var handler;
		
		if(resultHandler) {
			if(resultHandler.success) {
				handler = resultHandler;
			} else {
				handler = {success: resultHandler};
				if(errorHandler) {
					handler.error = errorHandler;
				}
			}
			
			if(handler.success) {
				jRequest.success = handler.success;
			}
			if(handler.error) {
				jRequest.error = handler.error;
			}
			if(handler.complete) {
				jRequest.complete = handler.complete;
			}
		}
		jRequest.url = $j._serverGatewayURL;
		jRequest.type = "POST";
		jRequest.async = true;
		jRequest.processData = true;
		
		jRequest.cache = $j._cacheSeverCalls;
		
		var args = new Array();
		if(params) {
			var len = params.length;
			var i;
			for(i=0; i<len; i++) {
				if(params[i] !== undefined) {
					args.push(params[i]);
				}
			}
		}
		
		var request = {
			className: className,
			method: method,
			params: args
		};
		
		$j._sendCallRequest($j._appPath, jRequest, request);
	},
	
	/**
		Call a static PHP method from JavaScript - The call will be performed synchronously and any returned value will be returned by this method.
		@param string className The name of the PHP class to invoke
		@param string method The name of the static method of the specified class to call
		@param array params An array of parameters to pass to the specified method
		@return mixed The value returned by the specified static PHP method. This could be any JSON-compatible type such as an object, array, string or number
	*/
	scall: function(className, method, params) {
		$j.validateCall(className, method, params);
	
		var response = null;
		
		var jRequest = {};
		jRequest.url = $j._serverGatewayURL;
		jRequest.success = function(data){response = data;};
		jRequest.type = "POST";
		jRequest.async = false;
		jRequest.cache = $j._cacheSeverCalls;
		jRequest.processData = true;
		
		var args = new Array();
		if(params) {
			var len = params.length;
			var i;
			for(i=0; i<len; i++) {
				if(params[i] !== undefined) {
					args.push(params[i]);
				}
			}
		}
		
		var request = {
			className: className,
			method: method,
			params: args
		};
		
		$j._sendCallRequest($j._appPath, jRequest, request);
		return response;
	},
	
	_getListenerKey: function(className, method) {
		return className + method;
	},
	
	listen: function(className, method, resultHandler, errorHandler) {
		var key = $j._getListenerKey(className, method);
		if(!$j._callListeners.hasOwnProperty(key)) {
			$j._callListeners[key] = [];
		}
		if(resultHandler.success) {
			$j._callListeners[key].push(resultHandler);
		} else {
			$j._callListeners[key].push({'success': resultHandler, 'error': errorHandler});
		}
	},
	
	_getListener: function(className, method, resultHandler, errorHandler) {
		var key = $j._getListenerKey(className, method);
		if($j._callListeners[key]) {
			var listeners = $j._callListeners[key];
			var len = listeners.length;
			var i;
			for(i=0; i<len; i++) {
				if(resultHandler.success) {
					if(listeners[i].success == resultHandler.success) {
						return listeners[i];
					}
				} else {
					if(listeners[i].success == resultHandler) {
						return listeners[i];
					}
				}
			}
		}
		return null;
	},
	
	isListening: function(className, method, resultHandler, errorHandler) {
		return $j._getListener(className, method, resultHandler, errorHandler) ? true : false;
	},
	
	_triggerSuccessListeners: function(className, method, data, textStatus, jqXHR) {
		var key = $j._getListenerKey(className, method);
		if($j._callListeners[key]) {
			var listeners = $j._callListeners[key];
			var len = listeners.length;
			var i;
			for(i=0; i<len; i++) {
				if(listeners[i].success) {
					listeners[i].success(data, textStatus, jqXHR);
				}
			}
		}
	},
	
	_triggerErrorListeners: function(className, method, errorThrown, textStatus, jqXHR) {
		var key = $j._getListenerKey(className, method);
		if($j._callListeners[key]) {
			var listeners = $j._callListeners[key];
			var len = listeners.length;
			var i;
			for(i=0; i<len; i++) {
				if(listeners[i].error) {
					listeners[i].error(errorThrown, textStatus, jqXHR);
				}
			}
		}
	},
	
	unlisten: function(className, method, resultHandler, errorHandler) {
		var key = $j._getListenerKey(className, method);
		if($j._callListeners[key]) {
			var listeners = $j._callListeners[key];
			var len = listeners.length;
			var i;
			for(i=0; i<len; i++) {
				if(resultHandler.success) {
					if(listeners[i].success == resultHandler.success) {
						listeners.splice(i, 1);
						break;
					}
				} else {
					if(listeners[i].success == resultHandler) {
						listeners.splice(i, 1);
						break;
					}
				}
			}
		}
	},
	
	validateCall: function(className, method, params) {
		var classNum = $j.serverInterfaceDescription.length;
		var methods;
		var methodNum;
		
		var paramsNum;
		if(params) {
			paramsNum = params.length;
		} else {
			paramsNum = 0;
		}
		var reqParamsNum;
		
		var classFound = false;
		var methodFound = false;
		
		for(var i=0; i<classNum; i++) {
			if($j.serverInterfaceDescription[i].className == className) {
				classFound = true;
				
				methods = $j.serverInterfaceDescription[i].methods;	
				methodNum = methods.length;
				for(var j=0; j<methodNum; j++) {
					if(methods[j].methodName == method) {
						methodFound = true;
						
						reqParamsNum = methods[j].requiredParams.length;
						
						if(reqParamsNum > paramsNum) {
							throw $j.errors.serverInterfaceError("An invalid set of parameters was supplied to the '" + 
									method + "' method of the '" + className + "' PHP server interface class");
						}
					}
				}
				
				if(!methodFound) {
					throw $j.errors.serverInterfaceError("Method '" + method + "' is not a valid method of the '" + className + "' PHP server interface class");
				}
			}
		}
		
		if(!classFound) {
			throw $j.errors.serverInterfaceError("Class '" + className + "' is not a valid PHP server interface class");
		}
	}
};

if(!Array.prototype.indexOf) {
	Array.prototype.indexOf = function(item, start) {
		if(!start) {
			start = 0;
		}
		var len = this.length;
		var i;
		for(i=start; i<len; i++) {
			if(this[i] === item) {
				return i;
			}
		}
		return -1;
	}
}