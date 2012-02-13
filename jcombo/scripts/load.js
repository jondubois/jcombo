/**
	Default loader for jCombo applications.
*/

var Load = {
	IE: /*@cc_on!@*/false,
	_loader: null,
	_loaderTextBox: null,
	_loaderInterval: null,
	_loaderAnimInterval: 200,
	_loaderAnimText: null,
	_loaderCounter: null,
	_frameworkURL: null,
	_browser: null,
	_imgLoaded: false,
    
	start: function(frameworkURL, resources) {
		Load._frameworkURL = frameworkURL;
		Load._loaderAnimText = [];
		Load._browser = navigator.appName;
		
		var imgURL = Load._frameworkURL + 'assets/logo.png';
		var textAnim = ['Loading jCombo App', 'Loading jCombo App.', 'Loading jCombo App..', 
				'Loading jCombo App...', 'Loading jCombo App..', 'Loading jCombo App.'];
		
		Load._load(imgURL, 'jCombo', 'http://jcombo.com/', textAnim);
	},
	
	_load: function(loadImageURL, loadImageCaption, loadImageLinkURL, loadTextAnimation) {		
		Load._loader = document.createElement('div');
		Load._loader.style.position = 'absolute';
		Load._loader.style.visibility = 'hidden';
		
		Load._loaderCounter = 0;
		Load._imgLoaded = false;
		Load.hideLoader();
		Load._loaderAnimText = loadTextAnimation;
		
		var startText;
		if(Load._loaderAnimText.length > 0) {
			startText = Load._loaderAnimText[0];
		} else {
			startText = '';
		}
		
		var linkEl = document.createElement('a');
		linkEl.setAttribute('href', loadImageLinkURL);
		linkEl.setAttribute('target', '_blank');
		
		var imgEl = document.createElement('img');
		imgEl.setAttribute('src', loadImageURL);
		imgEl.setAttribute('alt', loadImageCaption);
		imgEl.setAttribute('border', '0px');
		
		Load._loaderTextBox = document.createElement('div');
		Load._loaderTextBox.style.marginTop = '4px';
		Load._loaderTextBox.style.fontSize = '12px';
		Load._loaderTextBox.style.color = '#666';
		
		Load._loaderTextBox.innerHTML = startText;
		
		linkEl.appendChild(imgEl);
		Load._loader.appendChild(linkEl);
		Load._loader.appendChild(Load._loaderTextBox);
		
		var img = new Image();
		img.onload = Load._ready;
		
		img.src = loadImageURL;
	},
	
	_ready: function() {
		$loader.loadAll(Load._loaded);
		
		if(Load._loader) {
			document.body.appendChild(Load._loader);
			
			var loadWidth = Load._loader.offsetWidth;
			var loadHeight = Load._loader.offsetHeight;
			
			Load._loader.style.top = (Load.getWindowHeight() - loadHeight)/2 + 'px';
			Load._loader.style.left = (Load.getWindowWidth() - loadWidth)/2 + 'px';
			Load._loader.style.visibility = 'visible';
			
			window.onresize = function() {
				if(Load._loader) {
					loadWidth = Load._loader.offsetWidth;
					loadHeight = Load._loader.offsetHeight;
				
					Load._loader.style.top = (Load.getWindowHeight() - loadHeight)/2 + 'px';
					Load._loader.style.left = (Load.getWindowWidth() - loadWidth)/2 + 'px';
				}	
			}
			
			Load._loaderInterval = setInterval(Load._animateLoader, Load._loaderAnimInterval);
		}
	},
	
	_animateLoader: function() {
		if(Load._loader) {
			var animLen = Load._loaderAnimText.length;
			if(animLen > 0) {
				var frameNum = Load._loaderCounter++ % animLen;
				Load._loaderTextBox.innerHTML = Load._loaderAnimText[frameNum];
			} else {
				clearInterval(Load._loaderInterval);
				Load._loaderInterval = null;
			}
		}
	},
	
	_loaded: function() {
		Load.hideLoader();
		$loader.finish();
	},
	
	hideLoader: function() {		
		if(Load._loaderInterval) {
			clearInterval(Load._loaderInterval);
			Load._loaderInterval = null;
		}
		if(document.body && Load._loader.parentNode == document.body && Load._loader) {
			document.body.removeChild(Load._loader);
			Load._loader = null;
		}
	},
	
	getWindowWidth: function() {
		if(Load.IE) {
			return document.documentElement.clientWidth ? document.documentElement.clientWidth : document.body.clientWidth;
		} else {
			return window.innerWidth;
		}
	},
	
	getWindowHeight: function() {
		if(Load.IE) {
			return document.documentElement.clientHeight ? document.documentElement.clientHeight : document.body.clientHeight;
		} else {
			return window.innerHeight;
		}
	}
};

$loader.setLoader(Load);