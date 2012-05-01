<?php
class Phase {
	const INIT = 'init';
	const WEB_SERVICE = 'webservice';
	const SERVER_SERVICE = 'serverservice';
	
	private static $phase;
	public static function setPhase($phase) {
		self::$phase = $phase;
	}
	public static function getPhase() {
		return self::$phase;
	}
	public static function isPhase($phase) {
		return self::$phase == $phase;
	}
}
?>