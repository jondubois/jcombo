<?php
/*
* This class helps facilitate the task of accessing server-side PHP classes via AJAX using JSON requests.
*/

require_once(dirname(__FILE__).'/EventEmitter.php');
require_once(dirname(__FILE__).'/ServerInterface.php');

class ServerGateway {
	private static $request;
	private static $error;
	private static $eventEmitter = null;
	private static $allowedMap = array('*' => true);
	private static $tempMode = null;
	
	const ERROR_EVENT = 'errorevent';
	const EXCEPTION_EVENT = 'exceptionevent';
	
	public static function prepare() {
		self::$eventEmitter = new EventEmitter();
	}
	
	public static function setReleaseMode($boolean) {
		if($boolean) {
			self::$tempMode = 'release';
		} else {
			self::$tempMode = 'debug';
		}
	}
	
	public static function isDefaultModeSet() {
		return isset($_SESSION['jcReleaseMode']);
	}
	
	public static function isInReleaseMode() {
		return self::$tempMode == 'release' || (isset($_SESSION['jcReleaseMode']) && $_SESSION['jcReleaseMode']);
	}
	
	public static function addErrorListener($callback) {
		self::$eventEmitter->addEventListener(self::ERROR_EVENT, $callback);
	}
	
	public static function removeErrorListener($callback) {
		self::$eventEmitter->removeEventListener(self::ERROR_EVENT, $callback);
	}
	
	private static function triggerErrorEvent($error) {
		$callbacks = self::$eventEmitter->getEventListeners(self::ERROR_EVENT);
		foreach($callbacks as $callback) {
			call_user_func($callback, $error);
		}
	}
	
	public static function addExceptionListener($callback) {
		self::$eventEmitter->addEventListener(self::EXCEPTION_EVENT, $callback);
	}
	
	public static function removeExceptionListener($callback) {
		self::$eventEmitter->removeEventListener(self::EXCEPTION_EVENT, $callback);
	}
	
	private static function triggerExceptionEvent($errorMessage) {
		$callbacks = self::$eventEmitter->getEventListeners(self::EXCEPTION_EVENT);
		foreach($callbacks as $callback) {
			call_user_func($callback, $errorMessage);
		}
	}
	
	public static function restrict() {
		self::$allowedMap = array('*' => false);
	}
	
	public static function unrestrict() {
		self::$allowedMap = array('*' => true);
	}
	
	public static function allow($className, $methodName=null) {
		if(!$methodName) {
			self::$allowedMap[$className] = array();
			self::$allowedMap[$className]['*'] = true;
		} else {
			if(!isset(self::$allowedMap[$className])) {
				self::$allowedMap[$className] = array();
			}
			self::$allowedMap[$className][$methodName] = true;
		}
	}
	
	public static function forbid($className, $methodName=null) {
		if(!$methodName) {
			self::$allowedMap[$className] = array();
			self::$allowedMap[$className]['*'] = false;
		} else {
			if(!isset(self::$allowedMap[$className])) {
				self::$allowedMap[$className] = array();
			}
			self::$allowedMap[$className][$methodName] = false;
		}
	}
	
	public static function isAllowed($className, $methodName) {
		$permissive = self::$allowedMap['*'];
		
		if(isset(self::$allowedMap[$className])) {
			$allowedClass = isset(self::$allowedMap[$className]['*']) ? self::$allowedMap[$className]['*'] : $permissive;
			$allowedMethod = isset(self::$allowedMap[$className][$methodName]) ? self::$allowedMap[$className][$methodName] : $allowedClass;
		} else {
			$allowedMethod = $permissive;
		}
		
		return $allowedMethod;
	}
	
	/*
		Executes a jCombo request and returns the result.
	*/
	public static function execRequest($requestJSON) {
		self::$error = false;
		self::$request = json_decode($requestJSON, true);
		if(!isset(self::$request['className'])) {
			self::$request = json_decode(stripslashes($requestJSON));
		}
		
		if(!isset(self::$request['className'])) {
			if(preg_match('/(?<="className":")[^"]*/', $requestJSON, $classMatch) &&
					preg_match('/(?<="method":")[^"]*/', $requestJSON, $methodMatch)) {
				throw new IncorrectParamsException($classMatch[0], $methodMatch[0]);
			} else {
				throw new MalformedRequestException();	
			}
		}
		
		$classFile = JC_INTERFACES_DIR.self::$request['className'].'.php';
		
		if(file_exists($classFile)) {
			include_once($classFile);
		} else {
			throw new ClassNotFoundException(self::$request['className']);	
		}
		
		if(!is_callable(array(self::$request['className'], self::$request['method']))) {
			throw new InvalidMethodException(self::$request['className'], self::$request['method']);
		}
		
		$reflectMethod = new ReflectionMethod(self::$request['className'], self::$request['method']);
		$reqNumParams = $reflectMethod->getNumberOfRequiredParameters();
		
		if(count(self::$request['params']) < $reqNumParams) {
			throw new IncorrectParamsException(self::$request['className'], self::$request['method']);
		}
		
		ServerInterface::clearTriggeredEvents();
		
		$className = self::$request['className'];
		$methodName = self::$request['method'];
		
		if(self::isAllowed($className, $methodName)) {
			$result = @call_user_func_array($className.'::'.$methodName, self::$request['params']);
		} else {
			throw new UnauthorizedCallException($className, $methodName);
		}
		
		return $result;
	}
	
	public static function handleException($e) {
		self::$error = array('type'=>'', 'message'=>$e->getMessage(), 'file'=>$e->getFile(), 'line'=>$e->getLine());
		self::triggerExceptionEvent(self::compileExceptionMessage($e));
	}
	
	/*
		Sends back a ProgramCrashError error response to the client.
		A ProgramCrashError is an error that occurred on the serverside due to an issue with a PHP script.
	*/
	public static function handleError($errno, $errstr, $errfile, $errline) {
		self::$error = array('type'=>$errno, 'message'=>$errstr, 'file'=>$errfile, 'line'=>$errline);
		self::triggerExceptionEvent(self::compileExceptionMessage(new ProgramCrashError($errno, $errstr, $errfile, $errline)));
	}
	
	public static function compileExceptionMessage($exception) {
		if(!self::isInReleaseMode()) {
			$backtrace = $exception->getTraceAsString();
			return 'ServerGatewayError: ['.self::errorNumberToString($exception->getCode()).'] '.$exception->getMessage().' in '.$exception->getFile().' on line '.$exception->getLine()." \nBacktrace: \n$backtrace";
		} else {
			return $exception->getMessage();
		}
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
	
	public static function handleShutdown() {
		$error = error_get_last();
		restore_error_handler();
		
		if(self::$error && !isset($error)) {
			$error = self::$error;
		}
		
		if(isset($error)) {
			self::triggerErrorEvent($error);
		}
	}
}

register_shutdown_function(array('ServerGateway', 'handleShutdown'));
set_error_handler(array('ServerGateway', 'handleError'));
set_exception_handler(array('ServerGateway', 'handleException'));

ServerGateway::prepare();

class UnauthorizedCallException extends Exception {
	public function __construct($className, $methodName) {
		parent::__construct('Unauthorized call to the \''.$methodName.'\' method of the server interface class \''.$className.'\'');
	}
}

class MalformedRequestException extends Exception {
	public function __construct() {
		if(isset($_POST['request'])) {
			parent::__construct('The JSON request sent to ServerGateway was malformed - Received: '.$_POST['request']);
		} else {
			parent::__construct('The JSON request sent to ServerGateway was malformed');
		}
	}
}

class ClassNotFoundException extends Exception {
	public function __construct($className) {
		parent::__construct('The server interface class \''.$className.'\' was not found');
	}
}

class InvalidMethodException extends Exception {
	public function __construct($className, $methodName) {
		parent::__construct('The static method \''.$methodName.'\' cannot be called on the \''.$className.'\' class');
	}
}

class IncorrectParamsException extends Exception {
	public function __construct($className, $methodName) {
		parent::__construct('The static method \''.$methodName.'\' of the server interface class \''.$className.'\' was passed an invalid set of parameters');
	}
}

// Thrown if the PHP program crashes altogether.
class ProgramCrashError extends Exception {
	public function __construct($errno, $errstr, $errfile, $errline) {
		parent::__construct($errstr, $errno);
		$this->file = $errfile;
		$this->line = $errline;
	}
}

// Thrown if the PHP program crashes altogether due to a fatal error
class ProgramCrashFatalException extends Exception {
	public function __construct() {
		parent::__construct('The PHP server gateway process crashed with a fatal error');
	}
}

class NoRequestException extends Exception {
	public function __construct() {
		parent::__construct('No valid GET or POST request was sent to ServerGateway');
	}
}

class NoApplicationTargetException extends Exception {
	public function __construct() {
		parent::__construct('No valid application directory path could be associated with this request');
	}
}
?>