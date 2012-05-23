<?php
session_save_path(dirname(__FILE__).'/appdata/sessions');
ini_set('session.gc_probability', 1);
session_start();
?>