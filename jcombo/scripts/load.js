/**
	Default loader for jCombo applications.
*/

var jLoad = {
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
		jLoad._frameworkURL = frameworkURL;
		jLoad._loaderAnimText = [];
		jLoad._browser = navigator.appName;
		
		var imgURL = jLoad._frameworkURL + 'assets/logo.png';
		var textAnim = ['Loading jCombo App', 'Loading jCombo App.', 'Loading jCombo App..', 
				'Loading jCombo App...', 'Loading jCombo App..', 'Loading jCombo App.'];
		
		jLoad._load(imgURL, 'jCombo', 'http://jcombo.com/', textAnim);
	},
	
	_load: function(loadImageURL, loadImageCaption, loadImageLinkURL, loadTextAnimation) {		
		jLoad._loader = document.createElement('div');
		jLoad._loader.style.position = 'absolute';
		jLoad._loader.style.visibility = 'hidden';
		
		jLoad._loaderCounter = 0;
		jLoad._imgLoaded = false;
		jLoad.hideLoader();
		jLoad._loaderAnimText = loadTextAnimation;
		
		var startText;
		if(jLoad._loaderAnimText.length > 0) {
			startText = jLoad._loaderAnimText[0];
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
		
		jLoad._loaderTextBox = document.createElement('div');
		jLoad._loaderTextBox.style.marginTop = '2px';
		jLoad._loaderTextBox.style.fontFamily = 'Arial';
		jLoad._loaderTextBox.style.fontSize = '12px';
		jLoad._loaderTextBox.style.color = '#666';
		
		jLoad._loaderTextBox.innerHTML = startText;
		
		linkEl.appendChild(imgEl);
		jLoad._loader.appendChild(linkEl);
		jLoad._loader.appendChild(jLoad._loaderTextBox);
		
		var img = new Image();
		img.onload = jLoad._ready;
		
		img.src = loadImageURL;
	},
	
	_ready: function() {
		$loader.loadAll(jLoad._loaded);
		
		if(jLoad._loader) {
			document.body.appendChild(jLoad._loader);
			
			var loadWidth = jLoad._loader.offsetWidth;
			var loadHeight = jLoad._loader.offsetHeight;
			
			jLoad._loader.style.top = (jLoad.getWindowHeight() - loadHeight)/2 + 'px';
			jLoad._loader.style.left = (jLoad.getWindowWidth() - loadWidth)/2 + 'px';
			jLoad._loader.style.visibility = 'visible';
			
			window.onresize = function() {
				if(jLoad._loader) {
					loadWidth = jLoad._loader.offsetWidth;
					loadHeight = jLoad._loader.offsetHeight;
				
					jLoad._loader.style.top = (jLoad.getWindowHeight() - loadHeight)/2 + 'px';
					jLoad._loader.style.left = (jLoad.getWindowWidth() - loadWidth)/2 + 'px';
				}	
			}
			
			jLoad._loaderInterval = setInterval(jLoad._animateLoader, jLoad._loaderAnimInterval);
		}
	},
	
	_animateLoader: function() {
		if(jLoad._loader) {
			var animLen = jLoad._loaderAnimText.length;
			if(animLen > 0) {
				var frameNum = jLoad._loaderCounter++ % animLen;
				jLoad._loaderTextBox.innerHTML = jLoad._loaderAnimText[frameNum];
			} else {
				clearInterval(jLoad._loaderInterval);
				jLoad._loaderInterval = null;
			}
		}
	},
	
	_loaded: function() {
		jLoad.hideLoader();
		$loader.finish();
	},
	
	hideLoader: function() {		
		if(jLoad._loaderInterval) {
			clearInterval(jLoad._loaderInterval);
			jLoad._loaderInterval = null;
		}
		if(document.body && jLoad._loader.parentNode == document.body && jLoad._loader) {
			document.body.removeChild(jLoad._loader);
			jLoad._loader = null;
		}
	},
	
	getWindowWidth: function() {
		if(jLoad.IE) {
			return document.documentElement.clientWidth ? document.documentElement.clientWidth : document.body.clientWidth;
		} else {
			return window.innerWidth;
		}
	},
	
	getWindowHeight: function() {
		if(jLoad.IE) {
			return document.documentElement.clientHeight ? document.documentElement.clientHeight : document.body.clientHeight;
		} else {
			return window.innerHeight;
		}
	}
};

$loader.setLoader(jLoad);