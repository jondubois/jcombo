<?php
/**
* A simple class for managing paths.
*/
class PathManager {

	/**
	* Convert an absolute path into a url - This will not work with relative paths.
	* @param string $path A valid directory or file path
	* @return string A URL
	*/
	public static function convertPathToURL($path) {
		$serverDocRoot = isset($_SERVER['DOCUMENT_ROOT']) ? $_SERVER['DOCUMENT_ROOT'] : '';
		$serverHTTPS = isset($_SERVER['HTTPS']) ? $_SERVER['HTTPS'] : 'off';
		$serverPort = isset($_SERVER['SERVER_PORT']) ? $_SERVER['SERVER_PORT'] : 80;
		$serverName = isset($_SERVER['SERVER_NAME']) ? $_SERVER['SERVER_NAME'] : '';
		
		$path = str_replace('\\', '/', $path);
		
		$docRoot = preg_replace('/\/$/', '', str_replace('\\', '/', $serverDocRoot));
		$rootURL = 'http';
		if($serverHTTPS == 'on' || $serverPort == 443) {
			$rootURL .= "s";
		}
		$rootURL .= '://';
		if($serverPort != 80) {
			$rootURL .= $serverName.':'.$serverPort;
		} else {
			$rootURL .= $serverName;
		}
		
		return preg_replace('/^'.str_replace('/', '\/', $docRoot).'/', $rootURL, $path);
	}
	
	/**
	* Get the URL of the current PHP script.
	* @return string A URL
	*/
	public static function getCurrentURL() {
		$serverHTTPS = isset($_SERVER['HTTPS']) ? $_SERVER['HTTPS'] : 'off';
		$serverPort = isset($_SERVER['SERVER_PORT']) ? $_SERVER['SERVER_PORT'] : 80;
		$serverName = isset($_SERVER['SERVER_NAME']) ? $_SERVER['SERVER_NAME'] : '';
		$serverRequestURI = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '';
		
		$curURL = 'http';
		if($serverHTTPS == 'on' || $serverPort == 443) {
			$curURL .= "s";
		}
		$curURL .= '://';
		if($serverPort != 80) {
			$curURL .= $serverName.':'.$serverPort;
		} else {
			$curURL .= $serverName;
		}
		
		$curURL .= $serverRequestURI;
		
		return $curURL;
	}
}
?>