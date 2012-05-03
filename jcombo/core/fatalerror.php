<?php
require_once(dirname(__FILE__).'/ServerInterface.php');
echo '{"success":false,"value":"[Fatal Error] '.urldecode($_GET['message']).', in file \''.urldecode($_GET['file']).'\' on line '.urldecode($_GET['line']).'", "eventLog":'.json_encode(ServerInterface::getTriggeredEvents()).'}';
?>