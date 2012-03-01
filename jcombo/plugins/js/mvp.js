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
		}
	},
	
	init: function() {
		$j.mvp._mainView = new $j.mvp.View('{{root}}');
	},
	
	setMainView: function(view) {
		if(!$j.mvp._mainView) {
			throw $j.mvp.errors.domNotReadyException();
		}
		
		$j.mvp._mainView.setContent('root', view);
		$(document.body).html($j.mvp._mainView.toString(true));
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
		self._rebindSelectorMap = {};
		self._callbacks['refresh'] = [];
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
		
		self.setData = function(data) {
			$.each(self._data, function(index, value) {
				if(value.triggerBeforeRemove) {
					value.triggerBeforeRemove();
				}
			});
			
			$.each(data, function(index, value) {
				if(self._data.hasOwnProperty(index)) {
					if(self._data[index] instanceof $j.mvp.View) {
						self._data[index].setParent(null);
					}
				}
				if(value instanceof $j.mvp.View) {
					value.setParent(self);
				}
				
				if(value.getView) {
					var view = value.getView();
					view.setParent(self);
					self._data[index] = view;
				} else {
					self._data[index] = value;
				}
			});
			
			self._update();
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
			var areaRegex = new RegExp("[{][ ]*[{]([ ]*#[^ ]* +)?" + areaName + "[ ]*[}][ ]*[}]");
			return areaRegex.test(self._templateString);
		}
		
		self.getContent = function(areaName) {
			if(!self.hasArea(areaName)) {
				throw self.errors.areaDoesNotExistError(areaName);
			}
			
			return self._data[areaName];
		}
		
		self.select = function(selector) {
			if(!selector) {
				return $("." + self._id);
			}
			var elSelector = "." + self._id + " " + selector;
			self._unbindSelectorMap[elSelector] = true;
			return $(elSelector);
		}
		
		self.delegate = function(selector, eventType, handler) {
			$(document.body).delegate("." + self._id + " " + selector, eventType, handler);
		}
		
		self.undelegate = function(selector, eventType, handler) {
			if(!selector) {
				throw "ParamException: The selector parameter was not specified";
			}
			
			if(!eventType) {
				throw "ParamException: The eventType parameter was not specified";
			}
			
			if(!handler) {
				$(document.body).undelegate("." + self._id + " " + selector, eventType);
			} else {
				$(document.body).undelegate("." + self._id + " " + selector, eventType, handler);
			}
		}
		
		self.bind = function(eventType, handler) {
			var selector = '.' + self._id;
			self._rebindSelectorMap[selector] = {eventType: eventType, handler: handler};
			$(selector).bind(eventType, handler);
		}
		
		self.unbind = function(eventType, handler) {
			if(eventType == 'refresh') {
				self._callbacks['refresh'] = $.grep(self._callbacks['refresh'], function(value) {
					return value != handler;
				});
			} else {
				var selector = '.' + self._id;
				self._rebindSelectorMap[selector] = null;
				$(selector).unbind(eventType, handler);
			}
		}
		
		self.refresh = function(callback) {
			self._callbacks['refresh'].push(callback);
		}
		
		self.triggerBeforeRemove = function() {			
			$.each(self._unbindSelectorMap, function(index) {
				$(index).unbind();
			});
			
			$.each(self._rebindSelectorMap, function(index) {
				$(index).unbind();
			});
			
			self._unbindSelectorMap = {};
		}
		
		self.triggerRefresh = function() {
			if(self._parent) {
				$.each(self._rebindSelectorMap, function(index, value) {
					$(index).bind(value.eventType, value.handler);
				});
				
				$.each(self._data, function(index, value) {
					if(value instanceof $j.mvp.View) {
						value.triggerRefresh();
					}
				});
				
				$.each(self._callbacks['refresh'], function(index, value) {
					value();
				});
			}
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
				if(value instanceof $j.mvp.View) {
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
			return '<div class="jComboWrapper ' + self._id + '">' + html + '</div>'
		}
		
		self._update = function() {
			$('.' + self._id).replaceWith(self.toString(true));
			self.triggerRefresh();
		}
	}, 
	
	/**
		Mixin class to be mixed into all component classes which implement the getView() method.
		See $j.mixin() function.
	*/
	Component: function() {	
		this.getComponentName = function() {
			throw $j.mvp.errors.methodNotImplemented(this.constructor.toString(), 'getComponentName()');
		}
		
		this.getView = function() {
			throw $j.mvp.errors.methodNotImplemented(this.getComponentName(), 'getView()');
		}
		
		this.isInDOM = function() {
			return this.getView().getParent() ? true : false;
		}
		
		this.select = function(selector) {
			var view = this.getView();
			
			if(!view.getParent()) {
				throw $j.mvp.errors.notAddedToDOM(this.getComponentName(), 'select()');
			}
			
			return view.select(selector);
		}
		
		this.delegate = function(selector, eventType, handler) {
			var view = this.getView();
			
			if(!view.getParent()) {
				throw $j.mvp.errors.notAddedToDOM(this.getComponentName(), 'delegate()');
			}
			view.delegate(selector);
		}
		
		this.undelegate = function(selector, eventType, handler) {
			var view = this.getView();
			
			if(!view.getParent()) {
				throw $j.mvp.errors.notAddedToDOM(this.getComponentName(), 'undelegate()');
			}
			view.undelegate(selector, eventType, handler);
		}
		
		this.bind = function(eventType, handler) {
			var view = this.getView();
			
			if(!view.getParent()) {
				throw $j.mvp.errors.notAddedToDOM(this.getComponentName(), 'bind()');
			}
			view.bind(eventType, handler);
		}
		
		this.unbind = function(eventType, handler) {
			var view = this.getView();
			
			if(!view.getParent()) {
				throw $j.mvp.errors.notAddedToDOM(this.getComponentName(), 'unbind()');
			}
			view.unbind(eventType, handler);
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