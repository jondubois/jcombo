<?php
/*
* This class helps facilitate the task of accessing server-side PHP classes via AJAX using JSON requests.
*/

class ServerGateway {
	private static $request;
	private static $error;
	private static $crossDomain = false;
	private static $allowedMap = array();
	
	public static function crossDomainMode($bool) {
		self::$crossDomain = $bool;
	}
	
	public static function allowCrossDomainClass($className) {
		self::$allowedMap[$className] = true;
	}
	
	public static function allowCrossDomainMethod($className, $methodName) {
		if(!isset(self::$allowedMap[$className]) || self::$allowedMap[$className] === true) {
			self::$allowedMap[$className] = array();
		}
		self::$allowedMap[$className][$methodName] = true;
	}
	
	/*
		Executes a jCombo request and returns the result.
	*/
	public static function execRequest($requestJSON) {		
		self::$error = false;
		self::$request = json_decode($requestJSON);
		if(!isset(self::$request->className)) {
			self::$request = json_decode(stripslashes($requestJSON));
		}
		
		if(!isset(self::$request->className)) {
			if(preg_match('/(?<="className":")[^"]*/', $requestJSON, $classMatch) && 
					preg_match('/(?<="method":")[^"]*/', $requestJSON, $methodMatch)) {
				throw new IncorrectParamsException($classMatch[0], $methodMatch[0]);
			} else {
				throw new MalformedRequestException();	
			}
		}
		
		$classFile = JC_INTERFACES_DIR.self::$request->className.'.php';
		
		if(file_exists($classFile)) {
			include_once($classFile);
		} else {
			throw new ClassNotFoundException(self::$request->className);	
		}
		
		if(!is_callable(array(self::$request->className, self::$request->method))) {
			throw new InvalidMethodException(self::$request->className, self::$request->method);
		}
		
		$reflectMethod = new ReflectionMethod(self::$request->className, self::$request->method);
		$reqNumParams = $reflectMethod->getNumberOfRequiredParameters();
		
		if(count(self::$request->params) < $reqNumParams) {
			throw new IncorrectParamsException(self::$request->className, self::$request->method);
		}
		
		$args = array();
		$i = 0;
		foreach(self::$request->params as $param) {
			$args[] = 'self::$request->params['.$i++.']';	
		}
		
		if(self::$crossDomain) {
			$className = self::$request->className;
			$methodName = self::$request->method;
			if((isset(self::$allowedMap[$className]) && self::$allowedMap[$className] === true) || 
					(isset(self::$allowedMap[$className][$methodName]) && self::$allowedMap[$className][$methodName] === true)) {
				$result = @eval('return '.self::$request->className.'::'.self::$request->method.'('.implode(',', $args).');');
			} else {
				throw new InvalidCrossDomainCallException($className, $methodName);
			}
		} else {
			$result = @eval('return '.self::$request->className.'::'.self::$request->method.'('.implode(',', $args).');');
		}
		self::respond($result);
	}
	
	public static function handleException($e) {
		self::$error = array('type'=>'', 'message'=>$e->getMessage(), 'file'=>$e->getFile(), 'line'=>$e->getLine());
		self::respondException($e);
	}
	
	/*
		Sends back a ProgramCrashError error response to the client.
		A ProgramCrashError is an error that occurred on the serverside due to an issue with a PHP script.
	*/
	public static function handleError($errno, $errstr, $errfile, $errline) {
		self::$error = array('type'=>$errno, 'message'=>$errstr, 'file'=>$errfile, 'line'=>$errline);
		self::respondException(new ProgramCrashError($errno, $errstr, $errfile, $errline));
	}
	
	public static function handleShutdown() {
		$error = error_get_last();
		restore_error_handler();
		
		if(self::$error && !isset($error)) {
			$error = self::$error;
		}
		
		if(isset($error)) {
			$errorType = $error['type'];
			
			Router::reportError($error);
			
			if($errorType == E_ERROR || $errorType == E_USER_ERROR) {
				header('Location: fatalerror.php?message='.urlencode($error['message']).'&file='.urlencode(preg_replace('/\\\\/', '/', $error['file'])).'&line='.urlencode($error['line']));
			}
		}
	}
	
	/*
		Sends back an error response to the client.
	*/
	public static function respondException($exception) {
		self::respond(Router::compileExceptionMessage($exception), false);
	}
	
	/* 
		Sends back a response to the client.
	*/
	public static function respond($object, $success=true) {
		header('Content-type: application/json');
		echo '{"success":'.($success ? 'true' : 'false').',"value":'.json_encode($object).'}';
		exit;
	}
}

class InvalidCrossDomainCallException extends Exception {
	public function __construct($className, $methodName) {
		parent::__construct('The method \''.$methodName.'\' of the server interface class \''.$className.'\' cannot be called from a third-party domain.');
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