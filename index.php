<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>JCombo App</title>
<style type="text/css">
body {
	font-family:Arial, Helvetica, sans-serif;
}
</style>

<?php 
include_once('jcombo/jcombo.php');
Router::init('application/');
Router::useScript('index');
Router::exec();
?>
</head>

<body>
</body>
</html>