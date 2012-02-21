$j.mvp = {
	_idCount: 0,
	_mainView: null,
	
	setMainView: function(view) {
		$j.mvp._mainView = view;
		$(document.body).html(view.toString());
	},
	
	generateID: function() {
		return $j.mvp._idCount++;
	},
	
	View: function(template) {
		var self = this;
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
		
		self.setData = function(data) {
			if(data) {
				self._data = data;
			} else {
				self._data = {};
			}
			self._update();
		}
		
		self.clearData = function() {
			self._data = {};
			self._update();
		}
		
		self.getData = function() {
			return self._data;
		}
		
		self.setContent = function(areaName, view) {
			self._data[areaName] = view;
			self._update();
		}
		
		self.toString = function() {
			return self._wrapID(self._getContent());
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
			var div = $('#' + self._id);
			if(div) {
				div.html(self._getContent());
			}
		}
	}
};

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