<?php 
include_once('../jcombo/jcombo/jcombo.php');
Router::init('application/');
Router::useScript('index');
Router::exec();
?>

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>jCombo App</title>
<link rel="stylesheet" type="text/css" href="<?php echo JC_FRAMEWORK_STYLES_URL; ?>jcombo.css" />
</head>
<body>
<noscript>
<div id="centeredNoScriptContent">
	<a href="http://jcombo.com/" target="_blank"><img src="<?php echo JC_FRAMEWORK_URL; ?>assets/logo.png" alt="jCombo" border="0px" /></a>
	<div class="textDiv">JavaScript needs to be enabled in order to run this application.</div>
</div>
</noscript>
</body>
</html>