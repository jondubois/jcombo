<?php
/**
* Here you can add constants, function definitions, includes, etc... That are going to be
* used throughout most of your application - These will be available throughout all server interface classes.
* The code written or included in this file will be called before every call to a server interface class - This makes it an ideal place for performing authentication and authorization to control
* access to your server interfaces. Note that the PHP $_SESSION variable and the ServerGateway class are accessible throughout this file.
*/

Router::includeLibPHP('jcomboutils/*');

?>