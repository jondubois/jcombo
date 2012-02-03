<?php
/*
* This file serves as an interface to facilitate accessing server-side server via AJAX using JSON requests.
* It allows you to make calls to PHP methods using AJAX and JSON requests directly from JavaScript.
*/

if(isset($_POST['appDirPath'])) {
	define('JC_APP_DIR', urldecode($_POST['appDirPath']));
} else if(isset($_GET['appDirPath'])) {
	define('JC_APP_DIR', urldecode($_GET['appDirPath']));
} else {
	ServerGateway::respondException(new NoApplicationTargetException());
}

require_once(dirname(__FILE__).'/../config.php');
require_once(JC_APP_DIR.'config.php');

register_shutdown_function(array('ServerGateway', 'handleShutdown'));
set_error_handler(array('ServerGateway', 'handleError'));
set_exception_handler(array('ServerGateway', 'handleException'));
		
require_once(JC_APP_DIR.'include.php');

if(isset($_POST['request'])) {
	ServerGateway::execRequest($_POST['request']);
} else if(isset($_GET['request'])) {
	ServerGateway::execRequest($_GET['request']);
} else {
	throw new NoRequestException();
}

class ServerGateway {
	private static $request;
	private static $error;
	
	/*
		Executes a JCombo request and returns the result.
	*/
	public static function execRequest($requestJSON) {		
		self::$error = false;
		self::$request = json_decode($requestJSON);
		if(!isset(self::$request->class)) {
			self::$request = json_decode(stripslashes($requestJSON));
		}
		
		if(!isset(self::$request->class)) {
			if(preg_match('/(?<="class":")[^"]*/', $requestJSON, $classMatch) && 
					preg_match('/(?<="method":")[^"]*/', $requestJSON, $methodMatch)) {
				throw new IncorrectParamsException($classMatch[0], $methodMatch[0]);
			} else {
				throw new MalformedRequestException();	
			}
		}
		
		$classFile = JC_INTERFACES_DIR.self::$request->class.'.php';
		
		if(file_exists($classFile)) {
			include_once($classFile);
		} else {
			throw new ClassNotFoundException(self::$request->class);	
		}
		
		if(!is_callable(array(self::$request->class, self::$request->method))) {
			throw new InvalidMethodException(self::$request->class, self::$request->method);
		}
		
		$reflectMethod = new ReflectionMethod(self::$request->class, self::$request->method);
		$reqNumParams = $reflectMethod->getNumberOfRequiredParameters();
		
		if(count(self::$request->params) < $reqNumParams) {
			throw new IncorrectParamsException(self::$request->class, self::$request->method);
		}
		
		$args = array();
		$i = 0;
		foreach(self::$request->params as $param) {
			$args[] = 'self::$request->params['.$i++.']';	
		}
		
		$result = @eval('return '.self::$request->class.'::'.self::$request->method.'('.implode(',', $args).');');

		self::respond($result);
	}
	
	/*
		Sends back a ProgramCrashError error response to the client.
		A ProgramCrashError is an error that occurred on the serverside due to an issue with a PHP script.
	*/
	public static function handleError($errno, $errstr, $errfile, $errline) {
		self::$error = array('type'=>$errno, 'message'=>$errstr, 'file'=>$errfile, 'line'=>$errline);
		self::respondException(new ProgramCrashError($errno, $errstr, $errfile, $errline));
	}
	
	public static function handleException($e) {
		self::$error = array('type'=>'', 'message'=>$e->getMessage(), 'file'=>$e->getFile(), 'line'=>$e->getLine());
		self::respondException($e);
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