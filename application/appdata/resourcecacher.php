<?php
	$fileName = $_GET['resource'];
	$filePath = dirname(__FILE__).'/../'.$fileName;
	if(preg_match('/(?<=[.])[^.]*$/', $fileName, $matches)) {
		$fileType = $matches[0];
		if($fileType == 'js') {
			header('Content-Type: text/javascript');
		} else if($fileType == 'css') {
			header('Content-Type: text/css');
		}
	}
	header('Expires: '.gmdate('D, d M Y H:i:s \G\M\T', time() + 2592000));
	header('Last-Modified: '.gmdate('D, d M Y H:i:s \G\M\T', filemtime($filePath)));
	include($filePath);
?>