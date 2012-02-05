/**
	This script provides the core javascript functionality of JCombo.
*/
var $j = {
	_appDirPath: null,
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
    
	init: function(appDirPath, frameworkURL, jsLibsURL, frameworkStylesURL, serverGatewayURL, appScriptsURL, appStylesURL, appTemplatesURL, appAssetsURL, appFilesURL) {
		$j._appDirPath = appDirPath;
		$j._frameworkURL = frameworkURL;
		$j._jsLibsURL = jsLibsURL;
		$j._frameworkStylesURL = frameworkStylesURL;
		$j._serverGatewayURL = serverGatewayURL;
		$j._scriptsRouterURL = location.href.replace(/\?.*/, '');
		$j._appScriptsURL = appScriptsURL;
		$j._appStylesURL = appStylesURL;
		$j._appTemplatesURL = appTemplatesURL;
		$j._appAssetsURL = appAssetsURL;
		$j._appFilesURL = appFilesURL;
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
			return "LoadTemplateError: System could not load one or more templates because of the following AJAX error: " + message;
		},
		
		serverInterfaceError: function(message) {
			return "ServerInterfaceError: " + message;
		}
	},
	
	/**
		Get the URL of JCombo's root directory.
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
			Enable/disable default caching for server interface AJAX calls performed by JCombo.
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
		},
	},
	
	/**
		Grab allows you to include external scripts, CSS stylesheets and templates into your JavaScript.
		Grab can be used through either a synchronous or asynchronous interface. The sync interface blocks the
		browser while the resources are loaded, while the async interface allows you to load resources dynamically
		at runtime. At present only templates can be loaded asynchronously.
	*/
	grab: {
		_loadedScripts: new Object(),
		_loadedCSS: new Object(),
		_loadedTemplates: new Object(),
		
		/**
			Include a script from the application script directory into the current script.
		*/
		script: function(name) {
			var resourceName = $j._appScriptsURL + name + '.js';
			if(!$j.grab._loadedScripts[resourceName]) {
				$j.grab.scriptTag(resourceName, 'text/javascript');
				$j.grab._loadedScripts[resourceName] = true;
			}
		},
		
		/**
			Include a script from JCombo's javascript library directory into the current script.
		*/
		lib: function(name) {
			var resourceName = $j._jsLibsURL + name + '.js';
			if(!$j.grab._loadedScripts[resourceName]) {
				$j.grab.scriptTag(resourceName, 'text/javascript');
				$j.grab._loadedScripts[resourceName] = true;
			}
		},
		
		/**
			Include a script from a given URL.
		*/
		remoteScript: function(url) {
			var resourceName = url;
			if(!$j.grab._loadedScripts[resourceName]) {
				$j.grab.scriptTag(resourceName, 'text/javascript');
				$j.grab._loadedScripts[resourceName] = true;
			}
		},
		
		/**
			Include an application CSS stylesheet into the application.
		*/
		appCSS: function(name) {
			var resourceName = $j._appStylesURL + name + '.css';
			
			if(!$j.grab._loadedCSS[resourceName]) {
				$j.grab.linkTag(resourceName, 'text/css', 'stylesheet');
				$j.grab._loadedCSS[resourceName] = true;
			}
		},
		
		/**
			Include a default framework CSS stylesheet into the application.
		*/
		frameworkCSS: function(name) {
			var resourceName = $j._frameworkStylesURL + name + '.css';
			
			if(!$j.grab._loadedCSS[resourceName]) {
				$j.grab.linkTag(resourceName, 'text/css', 'stylesheet');
				$j.grab._loadedCSS[resourceName] = true;
			}
		},
		
		/**
			Get the the image at the given URL and start downloading it.
		*/
		image: function(url) {
			var img = new Image();			
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
		handlebars: function(name, jRequest) {
			var resourceName = $j._appTemplatesURL + name + '.handlebars';
			
			if(jRequest) {				
				if(!$j.grab._loadedTemplates[resourceName] || $j.grab._loadedTemplates[resourceName].status == "error") {
					
					$j.grab._loadedTemplates[resourceName] = {status: "loading", response: null, callbacks:new Array(jRequest)};
					
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
								data = Handlebars.compile(data);
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
						},
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
							data = Handlebars.compile(data);
							$j.grab._loadedTemplates[resourceName].status = "done";
							$j.grab._loadedTemplates[resourceName].response = {data: data, textStatus: textStatus, jqXHR: jqXHR};
							$.each($j.grab._loadedTemplates[resourceName].callbacks, function(index, jReq) {
								if(jReq.success) {
									jReq.success(data, textStatus, jqXHR);
								}	
							});
						},
						
						error: function(jqXHR, textStatus, errorThrown) {
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
						},
						
					};
					$.ajax(settings);
				}
				
				return $j.grab._loadedTemplates[resourceName].response.data;	
			}
		},
		
		/**
			Insert a script tag into the current document as it is being constructed.
			The id parameter is optional.
		*/
		scriptTag: function(url, type, id) {
			var idAttr = '';
			if(id) {
				idAttr = 'id="' + id + '" ';
			}
			document.write('<script ' + idAttr + 'type="' + type + '" src="' + url + '"></script>');
		},
		
		/** 
			Insert a link tag into the current document as it is being constructed.
			The id parameter is optional.
		*/
		linkTag: function(url, type, rel, id) {
			var idAttr = '';
			if(id) {
				idAttr = 'id="' + id + '" ';
			}
			document.write('<link ' + idAttr + 'rel="' + rel + '" type="' + type + '" href="' + url + '" />');	
		}
	},
	
	serverInterfaceDescription: {},
	
	/*
		The following methods are part of the core of JCombo.
		Do not call these methods directly.
	*/
	sendRequest: function(jRequest) {
		var self = this;
		var proxyRequest = $.extend(true, {}, jRequest);
		
		self.onSuccess = function(data, textStatus, jqXHR) {
			if(data.success) {
				if(jRequest.success) {
					jRequest.success(data.value, textStatus, jqXHR);
				}
			} else {
				if(proxyRequest.error) {
					proxyRequest.error(jqXHR, textStatus, data.value);
				}
				
				throw $j.errors.serverGatewayError(data.value);
			}
		}
		
		self.onError = function(jqXHR, textStatus, errorThrown) {
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
	
	acall: function(className, method, params, handler) {
		$j.validateCall(className, method, params);
		var jRequest = {};
		
		if(handler) {
			var type = typeof handler;
			if(type != "object") {
				throw $j.errors.serverGatewayError("The specified handler must be a valid JavaScript Object; " + type + " was found");
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
		
		if(!jRequest.cache){
			jRequest.cache = $j._cacheSeverCalls;
		}
		
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
			class: className,
			method: method,
			params: args
		};
		
		jRequest.data = "appDirPath=" + encodeURIComponent($j._appDirPath) + "&request=" + JSON.stringify(request);
		jRequest.dataType = "json";
		$j.sendRequest(jRequest);
	},
	
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
			class: className,
			method: method,
			params: args
		};
		
		jRequest.data = "appDirPath=" + encodeURIComponent($j._appDirPath) + "&request=" + JSON.stringify(request);
		jRequest.dataType = "json";
		$j.sendRequest(jRequest);
		return response;
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