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

function ws_respond_exception($exception) {
	header('Content-type: application/json');
	$eventLog = ServerInterface::getTriggeredEvents();
	echo '{"success":'.'false'.',"value":'.json_encode($exception).',"eventLog":'.json_encode($eventLog).'}';
	exit;
}

function ws_respond_error($error) {
	$errorType = $error['type'];
	if($errorType == E_ERROR || $errorType == E_USER_ERROR) {
		header('Location: fatalerror.php?message='.urlencode($error['message']).'&file='.urlencode(preg_replace('/\\\\/', '/', $error['file'])).'&line='.urlencode($error['line']));
	}
}

ServerGateway::addExceptionListener('ws_respond_exception');
ServerGateway::addErrorListener('ws_respond_error');

Phase::setPhase(Phase::WEB_SERVICE);

if(isset($_POST['debug'])) {
	if($_POST['debug'] == 'true' || $_POST['debug'] == 1) {
		//Router::setReleaseMode(false);
		ServerGateway::setReleaseMode(false);
	} else {
		//Router::setReleaseMode(true);
		ServerGateway::setReleaseMode(true);
	}
} else if(isset($_GET['debug'])) {
	if($_GET['debug'] == 'true' || $_GET['debug'] == 1) {
		//Router::setReleaseMode(false);
		ServerGateway::setReleaseMode(false);
	} else {
		//Router::setReleaseMode(true);
		ServerGateway::setReleaseMode(true);
	}
} else {
	/*
	if(!Router::isDefaultModeSet()) {
		Router::setReleaseMode(true);
	}
	*/
	if(!ServerGateway::isDefaultModeSet()) {
		ServerGateway::setReleaseMode(true);
	}
}

require_once(JC_APP_DIR.'prepare.php');

if(isset($_POST['request'])) {
	$result = ServerGateway::execRequest($_POST['request']);
} else if(isset($_GET['request'])) {
	$result = ServerGateway::execRequest($_GET['request']);
} else {
	throw new NoRequestException();
}

/*
header('Content-type: application/json');
$eventLog = ServerInterface::getTriggeredEvents();
echo '{"success":'.'true'.',"value":'.json_encode($result).',"eventLog":'.json_encode($eventLog).'}';
exit;
*/
header('Content-type: application/json');
	$eventLog = ServerInterface::getTriggeredEvents();
	echo '{"success":'.'true'.',"value":'.json_encode($result).',"eventLog":'.json_encode($eventLog).'}';
	exit;

?>