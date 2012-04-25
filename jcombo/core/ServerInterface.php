<?php
class ServerInterface {
	private static $callLog;
	final public static function _resetCallLog() {
		self::$callLog = array();
	}
	final public static function _getCallLog() {
		return self::$callLog;
	}
	final public static function _getCallSet() {
		if(!isset(self::$callLog)) {
			return array();
		}
		$map = array();
		$set = array();
		foreach(self::$callLog as $call) {
			if(!isset($map[$call[0]])) {
				$map[$call[0]] = array();
			}
			if(!isset($map[$call[0]][$call[1]])) {
				$set[] = $call;
				$map[$call[0]][$call[1]] = true;
			}
		}
		return $set;
	}
	
	public static function __callStatic($method, $args) {
		$className = get_called_class();
		if(method_exists($className, $method)) {
			$result = @call_user_func_array("$className::$method", $args);
			if(isset(self::$callLog)) {
				self::$callLog[] = array($className, $method);
			}
			return $result;
		} else {
			throw new Exception("The ServerInterface class $className does not have a $method method");
		}
	}
}
?>