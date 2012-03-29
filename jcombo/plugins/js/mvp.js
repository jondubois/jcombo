$j.mvp = {
	_idCount: 0,
	_mainView: null,
	
	errors: {
		domNotReadyException: function() {
			return 'DOMNotReadyException: The DOM is not ready - Main view cannot be set';
		},
	
		methodNotImplemented: function(object, methodName) {
			return 'MethodNotImplementedException: The ' + methodName + ' method needs to be implemented by the following object: ' + object;
		},
		
		notAddedToDOM: function(componentName, actionName) {
			return 'NotAddedToDOMException: The ' + actionName + ' action cannot be executed because the ' + componentName + ' component has not been added to the DOM';
		},
		
		noParamsSpecified: function() {
			return 'No parameters were specified';
		}
	},
	
	init: function() {
		$j.mvp._mainView = new $j.mvp.View('{{root}}');
	},
	
	setMainView: function(view) {
		if(!$j.mvp._mainView) {
			throw $j.mvp.errors.domNotReadyException();
		}
		
		$(document.body).html($j.mvp._mainView.toString(true));
		$j.mvp._mainView.setContent('root', view);
	},
	
	getMainView: function() {
		return $j.mvp._mainView;
	},
	
	generateID: function() {
		return $j.mvp._idCount++;
	},
	
	Area: function(parentView, areaName) {
		var self = this;
		self._parentView = parentView;
		self._areaName = areaName;
		
		self.setContent = function(view) {
			self._parentView.setContent(self._areaName, view);
		}
		
		self.getContent = function() {
			return self._parentView.getContent(self._areaName);
		}
	},
	
	View: function(template) {
		var self = this;
		self._parent = null;
		self._callbacks = {};
		self._unbindSelectorMap = {};
		self._rebindEvents = [];
		self._callbacks['render'] = [];
		self._callbacks['unrender'] = [];
		self._children = {};
		self._classes = '';
		
		self.errors = {
			invalidTemplateError: function(areaName) {
				return 'Exception: The specified template must be of type String';
			},
			
			areaDoesNotExistError: function(areaName) {
				return 'Exception: View does not have an area with the areaName "' + areaName + '"';
			}
		};
		
		self._id = 'jComboView' + $j.mvp.generateID();
		
		if(typeof template != 'string') {
			throw self.errors.invalidTemplateError();
		}
		
		self._templateString = template;
		self._template = Handlebars.compile(template);
		self._data = {};
		
		self.getID = function() {
			return self._id;
		}
		
		self.setParent = function(parent) {
			self._parent = parent;
		}
		
		self.getParent = function() {
			return self._parent;
		}
		
		self.addViewableChild = function(child) {
			self._children[child.getID()] = child;
		}
		
		self.removeViewableChild = function(child) {
			delete self._children[child.getID()];
		}
		
		self._adoptDescendantViewables = function(iterable) {
			var basicType;
			$.each(iterable, function(index, value) {
				if(value) {
					basicType = $j.getBasicType(value);
					
					if(value.setParent && value.getID) {
						value.setParent(self);
						self._children[value.getID()] = value;
					} else if(basicType == 'Array' || basicType == 'Object') {
						self._adoptDescendantViewables(value);
					}
				}
			});
		}
		
		self.setData = function(data) {
			$.each(self._children, function(index, value) {
				if(value.triggerUnrender) {
					self.triggerUnrender();
				}
				if(value.setParent && value.getID) {
					value.setParent(null);
					delete self._children[value.getID()];
				}
			});
			
			$.each(data, function(index, value) {
				self._data[index] = value;
			});
			
			self._adoptDescendantViewables(self._data);
			
			if(self.isInDOM()) {
				self._update();
			}
		}
		
		self.clearData = function() {
			var newData = {};
			$.each(self._data, function(index) {
				newData[index] = '';
			});
			self.setData(newData);
		}
		
		self.getData = function() {
			return self._data;
		}
		
		self.getArea = function(areaName) {
			if(!self.hasArea(areaName)) {
				throw self.errors.areaDoesNotExistError(areaName);
			}
			return new $j.mvp.Area(self, areaName);
		}
		
		self.setContent = function(areaName, view) {
			if(!self.hasArea(areaName)) {
				throw self.errors.areaDoesNotExistError(areaName);
			}
			
			var data = {};
			data[areaName] = view;
			self.setData(data);
		}
		
		self.hasArea = function(areaName) {
			var areaRegex = new RegExp('[{][ ]*[{]([ ]*#[^ ]* +)?' + areaName + '[ ]*[}][ ]*[}]');
			return areaRegex.test(self._templateString);
		}
		
		self.getContent = function(areaName) {
			if(!self.hasArea(areaName)) {
				throw self.errors.areaDoesNotExistError(areaName);
			}
			
			return self._data[areaName];
		}
		
		self.select = function(selector) {
			if(!self.isInDOM()) {
				throw $j.mvp.errors.notAddedToDOM('View', 'select()');
			}
			
			if(!selector) {
				return $('.' + self._id);
			}
			var elSelector = '.' + self._id + ' ' + selector;
			self._unbindSelectorMap[elSelector] = true;
			return $(elSelector);
		}
		
		self.addClass = function(cssClass) {
			self._classes += ' ' + cssClass;
			if(self.isInDOM()) {
				var element = self.select();
				element.addClass(cssClass);
			}
		}
		
		self.removeClass = function(cssClass) {
			self._classes = self._classes.replace(new RegExp('( *' + cssClass + '| +$)', 'g'), '');
			
			if(self.isInDOM()) {
				var element = self.select();
				element.removeClass(cssClass);
			}
		}
		
		self._handlerTriggeredBy = function(handlerData, triggeredByData) {
			var triggers = true;
			$.each(triggeredByData, function(index, value) {
				if(!handlerData[index] || handlerData[index] != value) {
					triggers = false;
					return false;
				}
			});
			
			return triggers;
		}
		
		self.on = function() {
			var args = arguments;
			var selfSelector = '.' + self._id;
			var jObject = $(selfSelector);
			if(args.length < 1) {
				throw $j.mvp.errors.noParamsSpecified();
			}
			
			if(args[0] == 'render' || args[0] == 'unrender') {
				var lastArg = args[args.length-1];
				if(args.length < 2 || !lastArg instanceof Function) {
					throw 'Exception: Handler not specified for the ' + args[0] + ' event';
				}
			
				self._callbacks[args[0]].push(lastArg);
			} else {
				self._rebindEvents.push(args);
				if(self.isInDOM()) {
					jObject.on.apply(jObject, args);
				}
			}
		}
		
		self.off = function() {
			var args = arguments;
			if(args.length > 0 && (args[0] == 'render' || args[0] == 'unrender')) {
				var firstArg = args[0];
				var lastArg = args[args.length-1];
				
				if(args.length > 1) {
					self._callbacks[firstArg] = $.grep(self._callbacks[firstArg], function(value) {
						return value != lastArg;
					});
				} else {
					self._callbacks[firstArg] = [];
				}
			} else {
				var selfSelector = '.' + self._id;
				var jObject = $(selfSelector);
				
				jObject.off.apply(jObject, args);
				
				if(self._rebindEvents.length > 0) {
					self._rebindEvents = $.grep(self._rebindEvents, function(value) {
						return !self._handlerTriggeredBy(value, args);
					});
				}
			}
		}
		
		self.render = function(handler) {
			self.on('render', handler);
		}
		
		self.unrender = function(handler) {
			self.on('unrender', handler);
		}
		
		self.triggerUnrender = function() {
			var selector = '.' + self._id;
			
			$.each(self._callbacks['unrender'], function(index, value) {
				value();
			});
			
			$.each(self._unbindSelectorMap, function(index) {
				$(index).unbind();
				$(index).off();
			});
			
			if(self._rebindEvents.length > 0) {
				$(selector).off();
			};
			
			$.each(self._children, function(index, value) {
				if(value.triggerUnrender) {
					value.triggerUnrender();
				}
			});
			
			self._unbindSelectorMap = {};
		}
		
		self.triggerRender = function() {
			var selector = '.' + self._id;
			var jObject = $(selector);
			
			$.each(self._rebindEvents, function(index, value) {
				jObject.on.apply(jObject, value);
			});
			
			$.each(self._callbacks['render'], function(index, value) {
				value();
			});
			
			$.each(self._children, function(index, value) {
				if(value.triggerRender) {
					value.triggerRender();
				}
			});
		}
		
		self.isInDOM = function() {			
			return $('.' + self._id).length > 0;
		}
		
		self.toString = function(simpleFormat) {
			var str = self._wrapID(self._getContent());
			if(!simpleFormat) {
				str = new Handlebars.SafeString(str);
			}
			return str;
		}
		
		self._safeFormat = function(iterable) {
			var iter;
			if(iterable instanceof Array) {
				iter = [];
			} else {
				iter = {};
			}
			
			$.each(iterable, function(index, value) {
				if(value && (value instanceof $j.mvp.View || value.jComboMVPComponent)) {
					iter[index] = value.toString();
				} else if(typeof value == 'string') {
					iter[index] = new Handlebars.SafeString(value);
				} else if(value instanceof Object) {
					iter[index] = self._safeFormat(value);
				} else {
					iter[index] = value;
				}
			});
			
			return iter;
		}
		
		self._getContent = function() {
			var compiledData = self._safeFormat(self._data);
			return self._template(compiledData);
		}
		
		self._wrapID = function(html) {
			return '<div class="jComboWrapper ' + self._id + self._classes + '">' + html + '</div>'
		}
		
		self._update = function() {
			$('.' + self._id).replaceWith(self.toString(true));
			self.triggerRender();
		}
	}, 
	
	/**
		Mixin class to be mixed into all component classes which implement the getView() and getComponentName() methods.
		See $j.mixin() function.
	*/
	Component: function() {
		this.jComboMVPComponent = true;
	
		this.getComponentName = function() {
			throw $j.mvp.errors.methodNotImplemented(this.constructor.toString(), 'getComponentName()');
		}
		
		this.getView = function() {
			throw $j.mvp.errors.methodNotImplemented(this.getComponentName(), 'getView()');
		}
		
		this.getID = function() {
			return this.getView().getID();
		}
		
		this.addViewableChild = function(child) {
			this.getView().addViewableChild(child);
		}
		
		this.removeViewableChild = function(child) {
			this.getView().removeViewableChild(child);
		}
		
		this.isInDOM = function() {
			return this.getView().isInDOM();
		}
		
		this.select = function(selector) {
			var view = this.getView();
			
			if(!view.isInDOM()) {
				throw $j.mvp.errors.notAddedToDOM(this.getComponentName(), 'select()');
			}
			
			return view.select(selector);
		}
		
		this.on = function() {
			this.getView().on(arguments);
		}
		
		this.off = function() {
			this.getView().off(arguments);
		}
		
		this.toString = function() {
			return this.getView().toString();
		}
		
		this.setParent = function(parent) {
			return this.getView().setParent(parent);
		}
		
		this.getParent = function() {
			return this.getView().getParent();
		}
		
		this.triggerRender = function() {
			return this.getView().triggerRender();
		}
		
		this.triggerUnrender = function() {
			return this.getView().triggerUnrender();
		}
		
		this.triggerInit = function() {
			return this.getView().triggerInit();
		}
	}
};

$j.mvp.init();

$j.grab.view = function(templateName, jRequest) {
	if(jRequest) {
		$j.grab.handlebars(templateName, {
			success: function(template, textStatus, jqXHR) {
				var view = new $j.mvp.View(template);
				jRequest.success(view, textStatus, jqXHR);
			},
			
			error: jRequest.error,
			complete: jRequest.complete
		}, true);
	} else {
		return new $j.mvp.View($j.grab.handlebars(templateName, null, true));
	}
}