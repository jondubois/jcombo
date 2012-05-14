<?php
class EventEmitter {
	private $listeners;
	
	public function __construct() {
		$this->listeners = array();
	}
	
	public function addEventListener($event, $callback) {
		if(!isset($this->listeners[$event])) {
			$this->listeners[$event] = array();
		}
		$this->listeners[$event][$callback] = true; 
	}
	
	public function getEventListeners($event) {
		$listeners = array();
		if(isset($this->listeners[$event])) {
			$listenerMap = $this->listeners[$event];
			foreach($listenerMap as $key => $value) {
				$listeners[] = $key;
			}
		}
		return $listeners;
	}
	
	public function removeEventListener($event, $callback) {
		if(isset($this->listeners[$event])) {
			unset($this->listeners[$event][$callback]);
		}
	}
	
	public function willTrigger($event, $callback) {
		return isset($this->listeners[$event]) && isset($this->listeners[$event][$callback]);
	}
	
	public function trigger($event, $data=null) {
		if(isset($this->listeners[$event])) {
			foreach($this->listeners[$event] as $callback => $value) {
				$eventObject = new Event($this, $data);
				call_user_func($callback, $eventObject);
			}
		}
	}
}

class Event {
	private $target;
	private $data;
	public function __construct($target, $data=null) {
		$this->target = $target;
		$this->data = $data;
	}
	
	public function getTarget() {
		return $this->target;
	}
	
	public function getData() {
		return $this->data;
	}
}
?>