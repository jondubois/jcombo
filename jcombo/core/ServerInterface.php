<?php
class ServerInterface {
	private static $eventLog = null;
	public static function call($className, $method, Array $args=array()) {
		include_once(JC_INTERFACES_DIR.$className.'.php');
		return @call_user_func_array("$className::$method", $args);
	}
	
	public static function get($className) {
		require_once(JC_INTERFACES_DIR.$className.'.php');
	}
	
	public static function classTrigger($className, $event) {
		if(self::$eventLog === null) {
			self::$eventLog = array();
		}
		self::$eventLog["$className.$event"] = true;
	}
	
	public static function trigger($event) {
		if(self::$eventLog === null) {
			self::$eventLog = array();
		}
		self::$eventLog[$event] = true;
	}
	
	public static function clearTriggeredEvents() {
		self::$eventLog = array();
	}
	public static function getTriggeredEvents() {
		$set = array();
		if(self::$eventLog === null) {
			return $set;
		}
		
		foreach(self::$eventLog as $key => $value) {
			$set[] = $key;
		}
		return $set;
	}
}
?>