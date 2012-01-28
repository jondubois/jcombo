<?php
/**	
* This PHP script includes all the necessary JavaScript files and libraries into the parent HTML document.
* To make use of JCombo inside a page of your choice, you need to place a PHP include to this file
* within your document's <head></head> tag. E.g. include_once('jcombo/jcombo.php');
*/

require_once(dirname(__FILE__).'/config.php');
require_once(JC_FRAMEWORK_DIR.'core/Cacher.php');
require_once(JC_FRAMEWORK_DIR.'core/ServerInterfaceDescriptor.php');
?>