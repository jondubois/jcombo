<?php
/**
* Main configuration file for jCombo.
*/

session_start();

// define the jCombo framework's root directory
define('JC_FRAMEWORK_DIR', dirname(__FILE__).'/');

// define the php addon library directory
define('JC_LIB_PHP_DIR', JC_FRAMEWORK_DIR.'libs/php/');

// define the javascript addon library directory
define('JC_LIB_JS_DIR', JC_FRAMEWORK_DIR.'libs/js/');

// define the javascript addon library directory
define('JC_PLUGIN_JS_DIR', JC_FRAMEWORK_DIR.'plugins/js/');

// define the framework's default styles directory
define('JC_FRAMEWORK_STYLES_DIR', JC_FRAMEWORK_DIR.'styles/');

require_once(JC_FRAMEWORK_DIR.'core/PathManager.php');

// define the root URL of jCombo's javascript libs directory
define('JC_LIB_JS_URL', PathManager::convertPathToURL(JC_LIB_JS_DIR));

// define the root URL of jCombo's default styles directory
define('JC_FRAMEWORK_STYLES_URL', PathManager::convertPathToURL(JC_FRAMEWORK_STYLES_DIR));

require_once(JC_FRAMEWORK_DIR.'core/Phase.php');
require_once(JC_FRAMEWORK_DIR.'core/Router.php');

// define the root URL of jCombo on this server
define('JC_FRAMEWORK_URL', PathManager::convertPathToURL(JC_FRAMEWORK_DIR));

define('JC_SERVER_GATEWAY_URL', PathManager::convertPathToURL(JC_FRAMEWORK_DIR.'core/ws.php'));
?>