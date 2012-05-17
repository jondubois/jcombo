<?php
/*
* This file serves as a server service interface to facilitate accessing server interface classes from other server side scripts.
*/

require_once(dirname(__FILE__).'/../config.php');

$relDir = dirname($_SERVER['SCRIPT_FILENAME']).'/';

while(!file_exists($relDir.'config.php') || !file_exists($relDir.'prepare.php')) {
	if(!file_exists($relDir)) {
		throw new Exception("The server service can only be used within a valid application subdirectory");
	}
	$relDir .= '../';
}

define('JC_APP_DIR', $relDir);

require_once(JC_APP_DIR.'config.php');
require_once(dirname(__FILE__).'/ServerInterface.php');

Phase::setPhase(Phase::SERVER_SERVICE);

require_once(JC_APP_DIR.'prepare.php');

?>