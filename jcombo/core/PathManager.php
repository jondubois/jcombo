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
		$path = str_replace('\\', '/', $path);
		$docRoot = preg_replace('/\/$/', '', str_replace('\\', '/', $_SERVER['DOCUMENT_ROOT']));
		$rootURL = 'http';
		if((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] == 'on') || $_SERVER['SERVER_PORT'] == 443) {
			$rootURL .= "s";
		}
		$rootURL .= '://';
		if($_SERVER['SERVER_PORT'] != '80') {
			$rootURL .= $_SERVER['SERVER_NAME'].':'.$_SERVER['SERVER_PORT'];
		} else {
			$rootURL .= $_SERVER['SERVER_NAME'];
		}
		
		return preg_replace('/^'.str_replace('/', '\/', $docRoot).'/', $rootURL, $path);
	}
	
	/**
	* Get the URL of the current PHP script.
	* @return string A URL
	*/
	public static function getCurrentURL() {
		$curURL = 'http';
		if((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] == 'on') || $_SERVER['SERVER_PORT'] == 443) {
			$curURL .= "s";
		}
		$curURL .= '://';
		if($_SERVER['SERVER_PORT'] != '80') {
			$curURL .= $_SERVER['SERVER_NAME'].':'.$_SERVER['SERVER_PORT'];
		} else {
			$curURL .= $_SERVER['SERVER_NAME'];
		}
		
		$curURL .= $_SERVER['REQUEST_URI'];
		
		return $curURL;
	}
}
?>