<?php
/**
* The PDOAdapter class is a wrapper for PHP's PDO class which is optimized for use within jCombo.
* It serves as an interface to a variety of databases - It returns simple datatypes such as integers, strings and arrays which
* can be easily converted to JSON.
*/
class PDOAdapter {
	private $store;
	private $defaultResultType;
	
	/**
	* Instantiate a new PDOAdapter. This constructor is an exact match to that of PHP's PDO class.
	* @param string $dsn A Data Source Name - A string that holds the information necessary to establish a connection to a database
	* @param string $username A username to use to access the specified database
	* @param string $password The password to use to access the specified database
	* @param string $options An array of driver-specific options
	*/
	public function __construct($dsn, $username='', $password='', $options=array()) {
		$this->store = new PDO($dsn, $username, $password, $options);
		$this->store->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
		$this->defaultResultType = PDO::FETCH_BOTH;
	}
	
	public function setDefaultResultType($resultType) {
		$this->defaultResultType = $resultType;
	}
	
	public function quickSelect($tableName, $fields=false, $whereCondition=false, $startIndex=0, $numElements=false, $resultType=null) {
		if(!$resultType) {
			$resultType = $this->defaultResultType;
		}
		
		$tableName = $this->escape($tableName);
		
		$newField = array();
		$query = "SELECT";
		
		if($fields && count($fields) > 0) {
			foreach($fields as $field) {
				$newField[] = $this->escape($field);
			}
			$query .= ' '.implode(',', $newField);
		} else {
			$query .= " *";
		}
		
		$query .= " FROM $tableName";
		
		if($whereCondition) {
			$query .= " WHERE $whereCondition";
		}

		if($startIndex < 0) {
			throw new Exception('The specified $startIndex was invalid');
		}
		
		if($numElements) {
			if($numElements < 0) {
				throw new Exception('The specified $numElements was invalid');
			}
			$query .= " LIMIT ".intval($startIndex).",".intval($numElements);
		} else {
			$query .= " LIMIT ".intval($startIndex).",18446744073709551615";
		}
		
		$query .= ";";
		
		return $this->arrayQuery($query, $resultType);
	}
	
	public function quickInsert($tableName, $fieldValueMap, $whereCondition=false) {
		$tableName = $this->escape($tableName);
	
		$fields = array();
		$values = array();
		
		foreach($fieldValueMap as $key => $value) {
			$fields[] = $this->escape($key);
			$values[] = $this->quote($value);
		}
		
		if(count($fields) < 1) {
			throw new Exception('The specified $fieldValueMap was empty');
		}
	
		$query = "INSERT INTO $tableName (".implode(',', $fields).") VALUES(".implode(',', $values).")";
		
		if($whereCondition) {
			$query .= " WHERE $whereCondition";
		}
		
		$query .= ";";
		
		return $this->exec($query);
	}
	
	public function quickUpdate($tableName, $fieldValueMap, $whereCondition=false) {
		$tableName = $this->escape($tableName);
	
		$expressions = array();
		
		foreach($fieldValueMap as $key => $value) {
			$expressions[] = $this->escape($key).'='.$this->quote($value);
		}
		
		if(count($expressions) < 1) {
			throw new Exception('The specified $fieldValueMap was empty');
		}
	
		$query = "UPDATE $tableName SET ".implode(',', $expressions);
		
		if($whereCondition) {
			$query .= " WHERE $whereCondition";
		}
		
		$query .= ";";
		
		return $this->exec($query);
	}
	
	public function quickDelete($tableName, $fieldValueMap, $andOrOr='AND') {
		$andOrOr = strtoupper($andOrOr);
		
		if($andOrOr != 'AND' && $andOrOr != 'OR') {
			throw new Exception('The $andOrOr parameter must be either \'AND\' or \'OR\'');
		}
		
		$tableName = $this->escape($tableName);
		
		$expressions = array();
		
		foreach($fieldValueMap as $key => $value) {
			$expressions[] = $this->escape($key).'='.$this->quote($value);
		}
		
		$query = "DELETE FROM $tableName WHERE ".implode(" $andOrOr ", $expressions).";";
		
		return $this->exec($query);
	}
	
	/**
	* Execute a query and return a multidimensional array containing all results.
	* @param string $sql An SQL query to execute
	* @param int $resultType The type of array to return. Valid values include PDO::FETCH_NUM, PDO::FETCH_ASSOC or PDO::FETCH_BOTH
	* @return array An array of query results. The exact type of the array (associative, numeric, or both) depends on the $resultType parameter
	*/
	public function arrayQuery($sql, $resultType=null) {
		if(!$resultType) {
			$resultType = $this->defaultResultType;
		}
		
		$list = array();
		$result = @$this->store->query($sql, $resultType);
		if($result) {
			foreach($result as $res) {
				foreach($res as &$r) {
					$r = self::autocastString($r);
				}
				array_push($list, $res);
			}
		}
		return $list;
	}
	
	/**
	* Execute a query and return only the first column of each row in the result set as an array.
	* @param string $sql An SQL query to execute
	* @return array An array containing the first column of each row returned by the query
	*/
	public function firstColumnArrayQuery($sql) {
		$list = array();
		$result = @$this->store->query($sql, PDO::FETCH_NUM);
		if($result) {
			foreach($result as $res) {
				$res[0] = self::autocastString($res[0]);
				array_push($list, $res[0]);
			}
		}
		return $list;
	}
	
	/**
	* Execute a query and return only the first row in the result set.
	* @param string $sql An SQL query to execute
	* @param int $resultType The type of object to return. Valid values include PDO::FETCH_NUM, PDO::FETCH_ASSOC or PDO::FETCH_BOTH
	* @return mixed The first row in the result set. The exact type of this object (associative, numeric, or both) depends on the $resultType parameter
	*/
	public function firstRowQuery($sql, $resultType=null) {
		if(!$resultType) {
			$resultType = $this->defaultResultType;
		}
		$list = $this->arrayQuery($sql, $resultType);
		if(isset($list[0])) {
			return $list[0];
		} else {
			return array();
		}
	}
	
	/**
	* Execute a query.
	* @param string $sql An SQL query to execute
	* @return boolean A boolean indicating whether or not the query was executed successfully
	*/
	public function exec($sql) {
		return $this->store->exec($sql);
	}
	
	/**
	* Execute a query and return a single result (the first colum of the first row in case multiple values are returned).
	* @param string $sql An SQL query to execute
	* @return mixed The result of executing the specified SQL statement
	*/
	public function singleQuery($sql) {
		$result = @$this->store->query($sql);
		if(!$result) {
			return false;
		}
		return self::autocastString($result->fetchColumn(0));
	}
	
	/**
	* Begin a database transaction which may consist of multiple queries being executed at different times. The database will not be changed until
	* the transaction has been committed.
	* @return boolean A boolean indicating whether or not the operation was successful
	*/
	public function beginTransaction() {
		return $this->store->beginTransaction();
	}
	
	/**
	* Commit an SQL transaction.
	* @return boolean A boolean indicating whether or not the operation was successful
	*/
	public function commit() {
		return $this->store->commit();
	}
	
	/**
	* Rollback an SQL transaction.
	* @return boolean A boolean indicating whether or not the operation was successful
	*/
	public function rollBack() {
		return $this->store->rollBack();
	}
	
	/**
	* Escape a string - This makes it safe to use as part of an SQL query.
	* @param string $string A string to escape and quote
	* @return string An escaped string
	*/
	public function escape($string) {
		return preg_replace('/(^[\'"]|[\'"]$)/', '', $this->store->quote($string));
	}
	
	/**
	* Escape a string and add single quotes around it - This makes it safe to use as part of an SQL query.
	* @param string $string A string to escape and quote
	* @return string An escaped, quoted string
	*/
	public function quote($string) {
		return $this->store->quote($string);
	}
	
	/**
	* Get the error code of the last SQL error that occurred.
	* @return int An error code
	*/
	public function errorCode() {
		return $this->store->errorCode();
	}
	
	/**
	* Get the error info of the last SQL error that occurred.
	* @return array An array containing error information
	*/
	public function errorInfo() {
		return $this->store->errorInfo();
	}
	
	/**
	* Get a list of database drivers which are available to the system.
	* @return array An array of available database drivers
	*/
	public function getAvailableDrivers() {
		return $this->store->getAvailableDrivers();
	}
	
	/**
	* Check whether or not the PDOAdapter is currently in the middle of an SQL transaction.
	* @return boolean A boolean indicating whether or not the PDOAdapter is in the middle of a transaction
	*/
	public function inTransaction() {
		return $this->store->inTransaction();
	}
	
	/**
	* Get the ID of the last inserted row.
	* @return string A string representing the ID of the last row inserted into the database
	*/
	public function lastInsertId() {
		return $this->store->lastInsertId();
	}
	
	private function autocastString($var) {
		$bool = ($var === 'true' ? true : false);
		$float = floatval($var);
		
		if($var === 'true' || $bool === 'false') {
			return $bool;
		} else if((string)$float === $var) {
			return $float;
		}
		
		return $var;
	}
}
?>