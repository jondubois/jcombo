<?php
class ServerInterface {
	private static $callLog;
	public static function call($className, $method, Array $args=array()) {
		include_once(JC_INTERFACES_DIR.$className.'.php');
		if(!isset(self::$callLog)) {
			self::$callLog = array();
		}
		self::$callLog[] = array($className, $method);
		return @call_user_func_array("$className::$method", $args);
	}
	public static function resetCallLog() {
		self::$callLog = array();
	}
	public static function getCallLog() {
		if(!isset(self::$callLog)) {
			return array();
		}
		return self::$callLog;
	}
	public static function getCallSet() {
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
}
?>