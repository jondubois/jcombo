<?php

require_once(dirname(__FILE__).'/../config.php');

class ServerInterfaceDescriptor {	
	public static function getInterfaceDesc() {
		$classes = array();
		
		$files = glob(JC_INTERFACES_DIR.'*.php');
		foreach($files as $file) {
			if(preg_match('/[^\/]*(?=[.]php$)/', $file, $matches)) {
				$className = $matches[0];
				$classObject = new stdClass();
				$classObject->className = $className;
				$classObject->methods = array();
				
				$reflectClass = new ReflectionClass($className);
				$reflectMethods = $reflectClass->getMethods();
				
				foreach($reflectMethods as $reflectMethod) {
					$methodObject = new stdClass();
					$methodObject->methodName = $reflectMethod->getName();
					$methodObject->requiredParams = array();
					
					$reflectParams = $reflectMethod->getParameters();
					
					foreach($reflectParams as $reflectParam) {
						if(!$reflectParam->isOptional()) {
							$methodObject->requiredParams[] = $reflectParam->getName();
						}
					}
					$classObject->methods[] = $methodObject;
				}
				$classes[] = $classObject;
			}
		}
		
		return json_encode($classes);
	}
}
?>