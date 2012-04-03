<?php
/*
* This file serves as a web service interface to facilitate accessing server-side PHP classes via AJAX using JSON requests.
* It allows you to make calls to PHP methods using AJAX and JSON requests directly from JavaScript.
*/

require_once(dirname(__FILE__).'/ServerGateway.php');

if(isset($_POST['appPath'])) {
	define('JC_APP_DIR', urldecode($_POST['appPath']));
} else if(isset($_GET['appPath'])) {
	define('JC_APP_DIR', urldecode($_GET['appPath']));
} else if(isset($_POST['relAppPath'])) {
	define('JC_APP_DIR', dirname(__FILE__).'/../../'.urldecode($_POST['relAppPath']));
} else if(isset($_GET['relAppPath'])) {
	define('JC_APP_DIR', dirname(__FILE__).'/../../'.urldecode($_GET['relAppPath']));
} else {
	ServerGateway::respondException(new NoApplicationTargetException());
}

require_once(dirname(__FILE__).'/../config.php');
require_once(JC_APP_DIR.'config.php');

register_shutdown_function(array('ServerGateway', 'handleShutdown'));
set_error_handler(array('ServerGateway', 'handleError'));
set_exception_handler(array('ServerGateway', 'handleException'));

require_once(JC_APP_DIR.'prepare.php');

if(isset($_POST['request'])) {
	ServerGateway::execRequest($_POST['request']);
} else if(isset($_GET['request'])) {
	ServerGateway::execRequest($_GET['request']);
} else {
	throw new NoRequestException();
}
?>