$j.mvp = {
	_idCount: 0,
	_mainView: null,
	
	init: function() {
		$j.mvp._mainView = new $j.mvp.View('{{root}}');
	},
	
	setMainView: function(view) {
		if(!$j.mvp._mainView) {
			throw 'DOMNotReadyException: the DOM is not ready - Main view cannot be set';
		}
		
		$j.mvp._mainView.setContent('root', view);
		$(document.body).html($j.mvp._mainView.toString());
	},
	
	generateID: function() {
		return $j.mvp._idCount++;
	},
	
	View: function(template) {
		var self = this;
		self._parent = null;
		self._callbacks = {};
		self._unbindSelectorMap = {};
		self._rebindSelectorMap = {};
		self._callbacks['refresh'] = [];
		
		self._id = 'jComboView' + $j.mvp.generateID();
		
		if(typeof template == 'string') {
			self._template = Handlebars.compile(template);
		} else {
			self._template = template;
		}
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
				if(value instanceof $j.mvp.View) {
					value.triggerBeforeRemove();
				}
			});
			
			$.each(data, function(index, value) {
				if(self._data.hasOwnProperty(index) && self._data[index] instanceof $j.mvp.View) {
					self._data[index].setParent(null);
				}
				if(value instanceof $j.mvp.View) {
					value.setParent(self);
				}
				self._data[index] = value;
			});
			
			self._update();
		}
		
		self.clearData = function(areaName) {
			var newData = {};
			if(areaName) {
				newData[areaName] = '';
			} else {
				$.each(self._data, function(index) {
					newData[index] = '';
				});
			}
			self.setData(newData);
		}
		
		self.getData = function() {
			return self._data;
		}
		
		self.setContent = function(areaName, view) {
			var data = {};
			data[areaName] = view;
			self.setData(data);
		}
		
		self.toString = function() {
			return self._wrapID(self._getContent());
		}
		
		self.select = function(selector) {
			var elSelector = "#" + self._id + " " + selector;
			self._unbindSelectorMap[elSelector] = true;
			return $(elSelector);
		}
		
		self.delegate = function(selector, eventType, handler) {
			$(document.body).delegate("#" + self._id + " " + selector, eventType, handler);
		}
		
		self.undelegate = function(selector, eventType, handler) {
			if(!selector) {
				throw "ParamException: The selector parameter was not specified";
			}
			
			if(!eventType) {
				throw "ParamException: The eventType parameter was not specified";
			}
			
			if(!handler) {
				$(document.body).undelegate("#" + self._id + " " + selector, eventType);
			} else {
				$(document.body).undelegate("#" + self._id + " " + selector, eventType, handler);
			}
		}
		
		self.bind = function(eventType, handler) {
			var selector = '#' + self._id;
			self._rebindSelectorMap[selector] = {eventType: eventType, handler: handler};
			$(selector).bind(eventType, handler);
		}
		
		self.unbind = function(eventType, handler) {
			if(eventType == 'refresh') {
				self._callbacks['refresh'] = $.grep(self._callbacks['refresh'], function(value) {
					return value != handler;
				});
			} else {
				var selector = '#' + self._id;
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
		
		self._getContent = function(areaName) {
			if(areaName) {
				var content = self._data[areaName];
				if(content instanceof $j.mvp.View) {
					return new Handlebars.SafeString(content.toString());
				} else {
					return content;
				}
			} else {
				var compiledData = {};
				$.each(self._data, function(index, value) {
					if(value instanceof $j.mvp.View) {
						compiledData[index] = new Handlebars.SafeString(value.toString());
					} else if(typeof value == 'string') {
						compiledData[index] =  new Handlebars.SafeString(value);
					} else {
						compiledData[index] = value;
					}
				});
				
				return self._template(compiledData);
			}
		}
		
		self._wrapID = function(html) {
			return '<div id="' + self._id + '">' + html + '</div>'
		}
		
		self._update = function() {
			$('#' + self._id).html(self._getContent());
			self.triggerRefresh();
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
		});
	} else {
		return new $j.mvp.View($j.grab.handlebars(templateName));
	}
}