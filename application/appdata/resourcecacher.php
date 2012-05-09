<?php
session_start();

$fileName = $_GET['resource'];
$filePath = dirname(__FILE__).'/../'.$fileName;
	
if(file_exists($filePath)) {
	if(preg_match('/(?<=[.])[^.]*$/', $fileName, $matches)) {
		$fileType = $matches[0];
		if($fileType == 'js') {
			header('Content-Type: text/javascript');
		} else if($fileType == 'css') {
			header('Content-Type: text/css');
		} else if($fileType == 'jpg') {
			header('Content-Type: image/jpeg');
		} else if($fileType == 'gif') {
			header('Content-Type: image/gif');
		} else if($fileType == 'png') {
			header('Content-Type: image/png');
		} else {
			header('Content-Type: text/html');
		}
	}
	if(isset($_SESSION['jcDebugMode']) && $_SESSION['jcDebugMode']) {
		header('Cache-Control: no-cache');
		header('Pragma: no-cache');
	} else {
		header('Cache-Control: public');
		header('Pragma: public');
		header('Expires: '.gmdate('D, d M Y H:i:s \G\M\T', time() + 2592000));
		header('Last-Modified: '.gmdate('D, d M Y H:i:s \G\M\T', filemtime($filePath)));
	}
	echo file_get_contents($filePath);
} else {
	header('HTTP/1.0 404 Not Found');
}
?>