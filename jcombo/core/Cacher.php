<?php
/**
* A simple class to assist with caching.
*/
class Cacher {
	private $cacheDirPath;
	private $cacheTime;
	
	/**
	* Instantiate a Cacher object.
	* @param string $cacheDirPath The path of the directory in which to store cache files
	* @param int $cacheTimeSeconds The lifetime of each cache record in seconds
	*/
	public function __construct($cacheDirPath, $cacheTimeSeconds) {
		$this->cacheDirPath = $cacheDirPath;
		$this->cacheTime = $cacheTimeSeconds;
	}
	
	/**
	* Check if a cache file with the specified key exists.
	* @param string $key The key to use to search for a particular cache record
	* @return boolean A boolean value indicating whether or not the given cache file exists (hit or miss)
	*/
	public function exists($key) {
		$cacheFile = $this->getCacheFileName($key);
		return (file_exists($cacheFile) && filemtime($cacheFile) > time() - $this->cacheTime);
	}
	
	/**
	* Retrieve a previously cached entry using the specified key.
	* @param string $key The key to use to search for a particular cache record
	* @return string The content of the file cached using the key provided. If no cache file can be found, this method will return an empty string
	*/
	public function get($key) {
		$cacheFile = $this->getCacheFileName($key);
		if(file_exists($cacheFile)) {
			if(filemtime($cacheFile) > time() - $this->cacheTime) {
				return file_get_contents($cacheFile);
			} else {
				@unlink($cacheFile);
			}
		}
		return '';
	}
	
	/**
	* Store content in cache using the specified key.
	* @param string $key The key on which to store the content
	* @param string The content to store on the specified key
	*/
	public function put($key, $content) {
		$cacheFile = $this->getCacheFileName($key);
		touch($cacheFile);
		file_put_contents($cacheFile, $content, LOCK_EX);
	}
	
	/**
	* Clear cache at the specified key.
	* @param string $key The key on which to clear cache
	* @return boolean A boolean value indicating whether or not the given cache entry was deleted successfully
	*/
	public function clear($key) {
		$cacheFile = $this->getCacheFileName($key);
		return @unlink($cacheFile);
	}
	
	/*
	* Convert a key into a sha1-hashed cache file name
	* @param string $key The key to convert into a cache file name
	* @return string The cache file path that the specified key maps to
	*/
	private function getCacheFileName($key) {
		return $this->cacheDirPath.sha1($key).'.cache';
	}
}
?>