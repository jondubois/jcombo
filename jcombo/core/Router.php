<?php
/**
* The purpose of the Router class is to define running conditions for the application and to control the routing of scripts.
*/
class Router {
	private static $scripts;
	private static $serverInterfaces;
	private static $logErrors = true;
	private static $jsFiles;
	private static $jsPluginFiles;
	private static $cssFiles;
	private static $error = false;
	private static $headCode = '';
	private static $bodyCode = '';
	const INCLUDE_FILE = 'include.conf';
	
	private static $applicationDirPath;
	
	/**
	* Initialize the Router class to rout URLs to the specified application.
	* @param string $applicationDirPath An absolute or relative path to the application's root directory.
	* @param boolean $logErrors A boolean value that indicates whether or not this application should log all errors into the system log file.
	*/
	public static function init($applicationDirPath, $logErrors=true) {
		ob_start(array('Router', 'outputBuffer'));
		
		self::$error = false;
		self::$logErrors = $logErrors;
		self::$applicationDirPath = self::cleanFormatDirPath(realpath($applicationDirPath));
		
		self::$headCode = '';
		self::$bodyCode = '';
		
		require_once(self::$applicationDirPath.'config.php');
		
		register_shutdown_function(array('Router', 'handleShutdown'));
		set_error_handler(array('Router', 'handleError'));
		set_exception_handler(array('Router', 'handleException'));
		
		self::$scripts = array();
		self::$serverInterfaces = array();
		
		self::$jsFiles = array();
		self::$cssFiles = array();
		
		self::$jsPluginFiles = array();
		
		self::useAllServerInterfaces();
		self::includeDefaultLibsJS();
		self::includeDefaultPluginsJS();
	}
	
	/**
	* Output all necessary preparation and routing scripts for client-side execution.
	*/
	public static function exec() {
		self::requiresRouterInit();
		
		$jComboScriptURL = JC_FRAMEWORK_URL.'jcombo.js';
		$serverInterfacesPath = JC_APPDATA_DIR.'serverinterfaces.js';
		$serverInterfacesURL = PathManager::convertPathToURL($serverInterfacesPath);
		$initScriptURL = JC_FRAMEWORK_URL.'core/init.js';
		
		$jsIncludes = self::$jsFiles;
		$jsIncludes[] = $jComboScriptURL;
		$jsIncludes[] = $serverInterfacesURL;
		$jsIncludes[] = $initScriptURL;
		$jsIncludes = array_merge($jsIncludes, self::$jsPluginFiles);
		
		$unchanged = false;
		if(isset($_SESSION['loadedFiles'])) {
			$unchanged = self::isSubset($_SESSION['loadedFiles']['js'], $jsIncludes) && 
					self::isSubset($_SESSION['loadedFiles']['css'], self::$cssFiles);
		}
		
		$defaultFile = JC_MAIN_SCRIPT;
		$notFoundFile = JC_NOT_FOUND_SCRIPT;
		$notAccessibleFile = JC_NOT_ACCESSIBLE_SCRIPT;
		
		$useScriptFile = $defaultFile;
		
		if(preg_match_all('/(?<=[?&])[^?&]+/', $_SERVER['REQUEST_URI'], $matches, PREG_PATTERN_ORDER, 0)) {
			foreach($matches[0] as $match) {
				if(strpos($match, '=', 0) === false) {
					$useScriptFile = $match;
					break;
				} else if(preg_match('/^(.+)=true$/', $match, $mat)) {
					$useScriptFile = $mat[1];
					break;
				}
			}
		}
		
		$useScriptFile = preg_replace('/[\/?]+$/', '/'.$defaultFile, $useScriptFile);
		
		$scriptFilePath = JC_SCRIPTS_DIR.$useScriptFile.".js";
		if(!file_exists($scriptFilePath)) {
			$useScriptFile = $notFoundFile;
			$notFoundPath = JC_SCRIPTS_DIR.$useScriptFile.".js";
			if(file_exists($notFoundPath)) {
				$scriptFilePath = $notFoundPath;
			} else {
				$scriptFilePath = JC_FRAMEWORK_DIR."scripts/".$useScriptFile.".js";
			}
		} else if(!in_array($useScriptFile, self::$scripts)) {
			$useScriptFile = $notAccessibleFile;
			$notAccessiblePath = JC_SCRIPTS_DIR.$useScriptFile.".js";
			if(file_exists($notAccessiblePath)) {
				$scriptFilePath = $notAccessiblePath;
			} else {
				$scriptFilePath = JC_FRAMEWORK_DIR."scripts/".$useScriptFile.".js";
			}
		}
	
		$scriptFileURL = PathManager::convertPathToURL($scriptFilePath);
		
		$loaderPath = JC_SCRIPTS_DIR.JC_LOAD_SCRIPT.".js";
		if(!file_exists($loaderPath)) {
			$loaderPath = JC_FRAMEWORK_DIR."scripts/".JC_LOAD_SCRIPT.".js";
		}
		
		$interfaceDesc = '$j.serverInterfaceDescription = '.ServerInterfaceDescriptor::getInterfaceDesc().';';
		$storedInterfaceDesc = '';
		
		if(file_exists($serverInterfacesPath)) {
			$storedInterfaceDesc = file_get_contents($serverInterfacesPath);
		} else {
			$storedInterfaceDesc = '';
		}
		
		if($storedInterfaceDesc != $interfaceDesc) {
			file_put_contents($serverInterfacesPath, $interfaceDesc, LOCK_EX);
		}
		
		// this is to keep track of changes made to code in the middle a user's session
		$_SESSION['loadedFiles'] = array('js'=>$jsIncludes, 'css'=>self::$cssFiles);
		
		self::embedScript(JC_FRAMEWORK_URL.'loader.js');
		
		$loadScriptURL = PathManager::convertPathToURL($loaderPath);
		
		$includeResoucesArg = str_replace('\/', '/', json_encode(array_merge(self::$cssFiles, $jsIncludes)));
		
		$appInitArgs = '{appPath:"'.self::$applicationDirPath.'", frameworkURL:"'.JC_FRAMEWORK_URL.'", jsLibsURL:"'.JC_LIB_JS_URL.
					'", frameworkStylesURL:"'.JC_FRAMEWORK_STYLES_URL.'", serverGatewayURL:"'.JC_SERVER_GATEWAY_URL.'", appScriptsURL:"'.JC_SCRIPTS_URL.
					'", appStylesURL:"'.JC_STYLES_URL.'", appTemplatesURL:"'.JC_TEMPLATES_URL.'", appAssetsURL:"'.JC_ASSETS_URL.'", appFilesURL:"'.JC_FILES_URL.'"}';
		
		
		if(isset($_SESSION['jcLoaded']) && $unchanged) {
			$skipPreload = 'true';
		} else {
			$skipPreload = 'false';
		}
		
		self::$headCode .= '<script type="text/javascript">$loader.init("'.JC_FRAMEWORK_URL.'", "'.$scriptFileURL.'", "'.$loadScriptURL.'", '.$includeResoucesArg.', '.$appInitArgs.', '.$skipPreload.');</script>';
		self::$headCode .= "\n";
	}
	
	/*
	* Include all default JavaScript libraries into the current page. Default libraries are specified in a file called 'includes.conf'
	* located inside the JC_LIB_JS_DIR directory.
	* @throws Throws an exception if the the includes.conf file cannot be found.
	* @throws Throws an exception if one or more default libraries could not be found.
	*/
	public static function includeDefaultLibsJS() {
		$includesFileName = self::INCLUDE_FILE;
		$includesFile = JC_LIB_JS_DIR.$includesFileName;
		if(file_exists($includesFile)) {
			$fileContents = file_get_contents($includesFile);
			if($fileContents !== false) {
				$includes = explode(',', $fileContents);
				try {
					foreach($includes as $include) {
						$inc = trim($include);
						if($inc) {
							self::includeLibJS($inc);
						}
					}
				} catch(Exception $e) {
					throw new Exception('Failed to load default library: '.$e->getMessage().' as referenced in '.$includesFile);
				}
			} else {
				throw new Exception('System could not read '.$includesFileName.' in the libs/js/ directory');	
			}
		}
	}
	
	/**
	* Include a JavaScript library file from the framework/libs/js/ directory.
	* @param string $lib The name of the library to include. This could be a single library file or an entire directory of files (using /*). The path is relative to the JC_LIB_JS_DIR directory.
	* @throws Throws an exception if the specified JavaScript library cannot be found.
	*/
	public static function includeLibJS($lib) {
		$libs = glob(JC_LIB_JS_DIR.$lib.'.js');
		
		if(count($libs) < 1) {
			throw new Exception('System could not load the JS library "'.$lib.'" - Include path may have been specified incorrectly');	
		}
		
		foreach($libs as $scriptPath) {
			self::$jsFiles[] = PathManager::convertPathToURL($scriptPath);
		}
	}
	
	public static function includeDefaultPluginsJS() {
		$includesFileName = self::INCLUDE_FILE;
		$includesFile = JC_PLUGIN_JS_DIR.$includesFileName;
		if(file_exists($includesFile)) {
			$fileContents = file_get_contents($includesFile);
			if($fileContents !== false) {
				$includes = explode(',', $fileContents);
				try {
					foreach($includes as $include) {
						$inc = trim($include);
						if($inc) {
							self::includePluginJS($inc);
						}
					}
				} catch(Exception $e) {
					throw new Exception('Failed to load default plugin: '.$e->getMessage().' as referenced in '.$includesFile);
				}
			} else {
				throw new Exception('System could not read '.$includesFileName.' in the plugins/js/ directory');	
			}
		}
	}
	
	public static function includePluginJS($plugin) {
		$plugins = glob(JC_PLUGIN_JS_DIR.$plugin.'.js');
		
		if(count($plugins) < 1) {
			throw new Exception('System could not load the JS plugin "'.$plugin.'" - Include path may have been specified incorrectly');	
		}
		
		foreach($plugins as $scriptPath) {
			self::$jsPluginFiles[] = PathManager::convertPathToURL($scriptPath);
		}
	}
	
	/**
	* Allow the user to navigate to any of the main scripts located directly in the application/scripts/ directory.
	*/
	public static function useMainScripts() {
		self::requiresRouterInit();
		self::useScriptDir('');
	}
	
	/**
	* Allow the user to navigate to any of the scripts located under the specified subdirectory of the application/scripts/ directory.
	* @param string $scriptDir The path of the script directory to use.
	* @throws Throws an exception if the specified directory cannot be found.
	*/
	public static function useScriptDir($scriptDir) {
		self::requiresRouterInit();
		$scriptDir = self::cleanFormatDirPath($scriptDir);
		$path = JC_SCRIPTS_DIR.$scriptDir;
		if(!is_dir($path)) {
			throw new Exception('There is no directory called '.$scriptDir.' in the '.JC_SCRIPTS_DIR.' directory');	
		}
		
		$includes = array();
		$files = scandir($path);		
		
		foreach($files as $file) {
			if(preg_match('/(.*)[.]js$/', $file, $matches)) {
				$includes[] = $scriptDir.$matches[1];
			}
		}
		
		self::$scripts = array_merge(self::$scripts, $includes);
	}
	
	/**
	* Allow the user to navigate to a particular script.
	* @param string $script The name of a script without the .js extension.
	* @throws Throws an exception if the specified script cannot be found.
	*/
	public static function useScript($script) {
		self::requiresRouterInit();
		if(!file_exists(JC_SCRIPTS_DIR.$script.'.js')) {
			throw new Exception('There is no script called \''.$script.' \' in the '.JC_SCRIPTS_DIR.' directory');	
		}
		self::$scripts[] = $script;
	}
	
	/**
	* Allow the user to navigate to the specified scripts.
	* @param array $scripts An array of script names without the .js extension.
	*/
	public static function useScripts(array $scripts) {
		self::requiresRouterInit();
		foreach($scripts as $script) {
			self::useScript($script);
		}
	}
	
	/*
	* Import all server interfaces located in the application/interfaces/ directory for use by the application through JavaScript.
	* Note that the system calls this method by default. Do not call this directly.
	*/
	private static function useAllServerInterfaces() {
		self::requiresRouterInit();
		$includes = array();
		$files = scandir(JC_INTERFACES_DIR);
		
		foreach($files as $file) {
			if(preg_match('/(.*)[.]php$/', $file, $matches)) {
				self::useServerInterface($matches[1]);
			}
		}
	}
	
	/*
	* Import a specific server interface for use by the application through JavaScript.
	* @param string $serverInterface The name of a server interface without the .php extension.
	*/
	private static function useServerInterface($serverInterface) {
		self::requiresRouterInit();
		$path = JC_INTERFACES_DIR.$serverInterface.'.php';
		if(!file_exists($path)) {
			throw new Exception('There is no server interface called  \''.$serverInterface.'.php\' in the '.JC_INTERFACES_DIR.' directory');
		}
		include_once($path);
		
		if(class_exists($serverInterface, false)) {
			$classReflect = new ReflectionClass($serverInterface);
			if($classReflect->getName() != $serverInterface) {
				throw new Exception('The server interface file  \''.$serverInterface.'.php\' does not contain a matching \''.$serverInterface.'\' class definition - Capitalization must match exactly');
			}		
		} else {
			throw new Exception('The server interface file  \''.$serverInterface.'.php\' does not contain a matching \''.$serverInterface.'\' class definition');	
		}
		self::$serverInterfaces[] = $serverInterface;
	}
	
	/*
	* Import multiple server interfaces for use by the application through JavaScript.
	* @param array $serverInterfaces An array of names of server interfaces to import into the application.
	*/
	private static function useServerInterfaces(array $serverInterfaces) {
		self::requiresRouterInit();
		foreach($serverInterfaces as $serverInterface) {
			self::useServerInterface($serverInterface);
		}
	}
	
	/*
	* Sanitize a directory path.
	* @param string $dir A directory path to sanitize.
	* @return string A sanitized directory path.
	*/
	private static function cleanFormatDirPath($dir) {
		if(!$dir) {
			return $dir;
		}
		return preg_replace('/(?<!\/)$/', '/', str_replace('\\', '/', $dir));
	}
	
	/**
	* Include an entire PHP library directory.
	* @param string $lib The name of the library to include. This could be a single library file or an entire directory of files (using /*). The path is relative to the JC_LIB_PHP_DIR directory.
	* @throws Throws an exception if the specified PHP library cannot be found.
	*/
	public static function includeLibPHP($lib) {
		$libs = glob(JC_LIB_PHP_DIR.$lib.'.php');
		if(count($libs) < 1) {
			throw new Exception('System could not load the PHP library "'.$lib.'" - Include path may have been specified incorrectly');	
		}
		foreach($libs as $lib) {
			include_once($lib);
		}
	}
	
	/**
	* Include a CSS stylesheet from the framework/styles/ or application/styles/ directory.
	* If there is a file with the same name in both directories, the file in the application/styles/ directory will be used.
	* @param string $cssName The path of the CSS file to include relative to the JC_STYLES_DIR directory.
	* @throws Throws an exception if the specified CSS stylesheet cannot be found.
	*/
	public static function includeCSS($cssName) {
		self::requiresRouterInit();
		$appCssPath = JC_STYLES_DIR.$cssName.'.css';
		$sysCssPath = JC_FRAMEWORK_DIR.'styles/'.$cssName.'.css';
		
		if(file_exists($appCssPath)) {
			$cssPath = $appCssPath;
		} else if(file_exists($sysCssPath)) {
			$cssPath = $sysCssPath;
		} else {
			throw new Exception('The CSS stylesheet "'.$cssName.'" does not exist');	
		}
		self::$cssFiles[] = PathManager::convertPathToURL($cssPath);
	}
	
	/*
	* Include a JavaScript file from the application/scripts/ directory.
	* @param string $scriptName The name of the script to include into the current page without the .js extension.
	* @throws Throws an exception if the specified script cannot be found.
	*/
	public static function includeScript($scriptName) {
		$scriptPath = JC_SCRIPTS_DIR.$scriptName.'.js';
		if(!file_exists($scriptPath)) {
			throw new Exception('The script "'.$scriptPath.'" does not exist');
		}
		self::$jsFiles[] = PathManager::convertPathToURL($scriptPath);
	}
	
	/**
	* Return the specified SQLite database file's absolute path, the filename must be complete with extension (if it has one).
	* @param string $databaseFileName The path of the database file with extension. This path must be relative to the JC_DB_DIR directory.
	* @return string The absolute database file's path.
	*/
	public static function getDBPath($databaseFileName) {
		return JC_DB_DIR.$databaseFileName;
	}
	
	/*
	* Mostly used internally to embed a script at from the specified path.
	*/
    public static function embedScript($scriptURL, $id=null) {
		$idAttr = '';
		if(isset($id) && $id) {
			$idAttr = 'id="'.$id.'" ';
		}
		
		self::$headCode .= "<script ".$idAttr."type=\"text/javascript\" src=\"$scriptURL\"></script>\n";
    }
	
	public static function embedCSS($cssURL) {
		self::$headCode .= "<link rel=\"stylesheet\" type=\"text/css\" href=\"$cssURL\" />\n";
	}
	
	public static function compileExceptionMessage($exception) {
		return '['.self::errorNumberToString($exception->getCode()).'] '.$exception->getMessage().' in '.$exception->getFile().' on line '.$exception->getLine();
	}
	
	private static function errorNumberToString($errorNumber) {
		if(!$errorNumber) {
			$errorType = 'Exception';
		} else if($errorNumber == E_ERROR) {
			$errorType = 'Fatal Error';
		} else if($errorNumber == E_WARNING) {
			$errorType = 'Warning';
		} else if($errorNumber == E_PARSE) {
			$errorType = 'Parse Error';
		} else if($errorNumber == E_NOTICE) {
			$errorType = 'Notice';
		} else if($errorNumber == E_USER_ERROR) {
			$errorType = 'Fatal Error';
		} else if($errorNumber == E_USER_WARNING) {
			$errorType = 'Warning';
		} else if($errorNumber == E_USER_NOTICE) {
			$errorType = 'Notice';
		} else if($errorNumber == E_STRICT) {
			$errorType = 'Strict Error';
		} else if($errorNumber == E_RECOVERABLE_ERROR) {
			$errorType = 'Fatal Error';
		} else if($errorNumber == E_USER_DEPRECATED) {
			$errorType = 'Deprecated Error';
		} else {
			$errorType = 'Error';
		}
		return $errorType;
	}
	
	/*
	* Report an error to the router. If error logging is turned on, The router will append the error
	* to the application's errors.txt file.
	* @param string $error The error message to append to the error log.
	*/
	public static function reportError($error) {
		$errorType = self::errorNumberToString($error['type']);
		$errorMessage = $error['message'];
		$errorFile = $error['file'];
		$errorLine = $error['line'];
		
		$errorMessage = "[$errorType] $errorMessage in $errorFile on line $errorLine\r\n";
		self::$bodyCode .= $errorMessage;
		if(self::$logErrors) {
			file_put_contents(JC_APPDATA_DIR.'errors.txt', '['.date("j F Y, g:i:sa").'] '.$errorMessage, FILE_APPEND);
		}
	}
	
	public static function handleException($e) {
		$errstr = $e->getMessage();
		$errfile = $e->getFile();
		$errline = $e->getLine();
		
		self::$error = array('type'=>'', 'message'=>$errstr, 'file'=>$errfile, 'line'=>$errline);
		exit;
	}
	
	public static function handleError($errno, $errstr, $errfile, $errline) {
		self::$error = array('type'=>$errno, 'message'=>$errstr, 'file'=>$errfile, 'line'=>$errline);
		$errorType = self::errorNumberToString($errno);
		exit;
	}
	
	public static function handleShutdown() {
		$error = error_get_last();
		restore_error_handler();
		
		if(self::$error && !isset($error)) {
			$error = self::$error;
		}
		
		if(isset($error)) {
			ob_clean();
			self::reportError($error);
			echo self::getErrorTempalte();
		}
	}
	
	private static function requiresRouterInit() {
		if(!isset(self::$applicationDirPath)) {
			throw new Exception("This method cannot be called before the router has been initialized");
		}
	}
	
	public static function outputBuffer($buffer) {
		$head = '</head>';
		$pos = strpos($buffer, $head);
		if($pos !== false) {
			$buffer = substr_replace($buffer, self::$headCode.'</head>', $pos, strlen($head));
		}
		
		if(self::$bodyCode) {
			$body = '<body>';
			$pos = strpos($buffer, $body);
			if($pos !== false) {
				$buffer = substr_replace($buffer, '<body>'.self::$bodyCode, $pos, strlen($body));
			}
		}
		
		return $buffer;
	}
	
	private static function isSubset($array, $sub) {
		$keys = array();
		foreach($array as $value) {
			$keys[$value] = true;
		}
		
		foreach($sub as $value) {
			if(!array_key_exists($value, $keys)) {
				return false;
			}
		}
		
		return true;
	}
	
	private function getErrorTempalte() {
		$html = "<!DOCTYPE html><head><title>jCombo Server Error</title></head><body></body>";
		return $html;
	}
}

?>