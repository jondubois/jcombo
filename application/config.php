<?php
/* 
	Configuration fle for JCombo application.
*/

// define the JCombo application's root directory
define('JC_APPLICATION_DIR', dirname(__FILE__).'/');

// define the appdata directory
define('JC_APPDATA_DIR', JC_APPLICATION_DIR.'appdata/');

// define the sqlite database directory
define('JC_DB_DIR', JC_APPLICATION_DIR.'databases/');

// define the assets directory
define('JC_ASSETS_DIR', JC_APPLICATION_DIR.'assets/');

// define the file storage directory
define('JC_FILES_DIR', JC_APPLICATION_DIR.'files/');

// define the data interfaces directory
define('JC_INTERFACES_DIR', JC_APPLICATION_DIR.'interfaces/');

// define the JavaScript scripts directory
define('JC_SCRIPTS_DIR', JC_APPLICATION_DIR.'scripts/');

// define the css styles directory
define('JC_STYLES_DIR', JC_APPLICATION_DIR.'styles/');

// define the templates directory
define('JC_TEMPLATES_DIR', JC_APPLICATION_DIR.'templates/');

define('JC_MAIN_SCRIPT', 'index');
define('JC_NOT_FOUND_SCRIPT', 'notfound');
define('JC_NOT_ACCESSIBLE_SCRIPT', 'notaccessible');

// define the JavaScript scripts directory URL
define('JC_SCRIPTS_URL', PathManager::convertPathToURL(JC_SCRIPTS_DIR));

// define the css styles directory URL
define('JC_STYLES_URL', PathManager::convertPathToURL(JC_STYLES_DIR));

// define the templates directory URL
define('JC_TEMPLATES_URL', PathManager::convertPathToURL(JC_TEMPLATES_DIR));

// define the assets directory URL
define('JC_ASSETS_URL', PathManager::convertPathToURL(JC_ASSETS_DIR));

// define the files directory URL
define('JC_FILES_URL', PathManager::convertPathToURL(JC_FILES_DIR));
?>