<?php
require_once(dirname(__FILE__).'/EventEmitter.php');

/**
* The PDOAdapter class is a wrapper for PHP's PDO class which is optimized for use within jCombo.
* It serves as an interface to a variety of databases - It returns simple datatypes such as integers, strings and arrays which
* can be easily converted to JSON.
*/
class PDOAdapter extends EventEmitter {
	const SELECT_EVENT = 'select';
	const UPDATE_EVENT = 'update';
	const DELETE_EVENT = 'delete';
	const INSERT_EVENT = 'insert';
	
	private $store;
	private $defaultResultType;
	private $prepMacros;
	
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
		$this->prepMacros = array('QUOTE' => array($this, 'quote'));
	}
	
	public function setDefaultResultType($resultType) {
		$this->defaultResultType = $resultType;
	}
	
	public function quickSelect($tableName, $fields=false, $whereCondition=false, $startIndex=0, $numElements=false, $resultType=null) {
		if(!$resultType) {
			$resultType = $this->defaultResultType;
		}
		
		$newFields = array();
		$query = "SELECT";
		
		if($fields && count($fields) > 0) {
			foreach($fields as $field) {
				$newFields[] = $field;
			}
			$query .= ' '.implode(',', $newFields);
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
		$fields = array();
		$values = array();
		
		foreach($fieldValueMap as $key => $value) {
			$fields[] = $key;
			$values[] = $this->quoteOnce($value);
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
		$expressions = array();
		
		foreach($fieldValueMap as $key => $value) {
			$expressions[] = $key.'='.$this->quoteOnce($value);
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
		
		$expressions = array();
		
		foreach($fieldValueMap as $key => $value) {
			$expressions[] = $key.'='.$this->quoteOnce($value);
		}
		
		$query = "DELETE FROM $tableName WHERE ".implode(" $andOrOr ", $expressions).";";
		
		return $this->exec($query);
	}
	
	private function triggerSQLEvent($sql) {
		
		preg_match('/^ *(select|update|insert|delete) /i', $sql, $matches);
		if($matches) {
			$matches = strtolower($matches[0]);
			$event = null;
			
			if($matches == 'select ') {
				$event = PDOAdapter::SELECT_EVENT;
			} else if($matches == 'insert ') {
				$event = PDOAdapter::INSERT_EVENT;
			} else if($matches == 'update ') {
				$event = PDOAdapter::UPDATE_EVENT;
			} else if($matches == 'delete ') {
				$event = PDOAdapter::DELETE_EVENT;
			}
			
			if($event) {
				$this->trigger($event);
			}
		}
	}
	
	private function isAlphaNumeric($char) {
		$ascii = ord($char);
		$isUpperAlpha = $ascii > 64 && $ascii < 91;
		$isLowerAlpha = $ascii > 96 && $ascii < 123;
		$isNum = $ascii > 47 && $ascii < 58;
		
		return $isUpperAlpha || $isLowerAlpha || $isNum;
	}
	
	public function prepare($sql) {
		$sqlArray = str_split($sql);
		$searching = true;
		$curWord = '';
		$preInput = '';
		$openedBrackets = 0;
		$complete = false;
		
		$newString = '';
		$num = count($sqlArray);

		for($i=0; $i<$num; $i++) {
			$char = $sqlArray[$i];
			
			if($char == "'") {
				$searching ^= true;
			}
			
			if(!$this->isAlphaNumeric($char)) {
				if(array_key_exists($curWord, $this->prepMacros)) {
					$complete = false;
					$preInput = '';
					$preInputStartIndex = $i;
					while($char == ' ' && $i<$num) {
						$char = $sqlArray[$i++];
						$preInput .= $char;
					}
					
					if($i>=$num-1) {
						$newString .= $curWord.$preInput;
						break;
					}
					
					if($char == '(') {
						$openedBrackets = 1;
						$input = '';
						$preInput .= $char;
						while($i<$num-1) {
							$char = $sqlArray[++$i];
							if($char == '(') {
								$openedBrackets++;
							} else if($char == ')') {
								$openedBrackets--;
							}
							if($openedBrackets > 0) {
								$input .= $char;
							} else {
								$curWord = call_user_func($this->prepMacros[$curWord], $input);
								$complete = true;
								break;
							}
						}
						
						if($i<$num-1) {
							$char = $sqlArray[++$i];
						} else {
							if($complete) {
								$newString .= $curWord;
							} else {
								$newString .= $curWord.$preInput.$input;
							}
							break;
						}
					} else {
						$newString .= $curWord;
						$curWord = '';
						$i = $preInputStartIndex - 1;
						continue;
					}
				}
				
				$newString .= $curWord;
				$curWord = '';
			}
			
			if($i>=$num-1) {
				$newString .= $curWord.$char;
				break;
			}
			
			if($searching && $this->isAlphaNumeric($char) && $i<$num-1) {
				$curWord .= $char;
			} else {
				$newString .= $char;
			}
		}
		
		return $newString;
	}
	
	/**
	* Execute a query and return a multidimensional array containing all results.
	* @param string $sql An SQL query to execute
	* @param int $resultType The type of array to return. Valid values include PDO::FETCH_NUM, PDO::FETCH_ASSOC or PDO::FETCH_BOTH
	* @return array An array of query results. The exact type of the array (associative, numeric, or both) depends on the $resultType parameter
	*/
	public function arrayQuery($sql, $resultType=null) {
		$sql = $this->prepare($sql);
		
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
		
		$this->triggerSQLEvent($sql);
		
		return $list;
	}
	
	/**
	* Execute a query and return only the first column of each row in the result set as an array.
	* @param string $sql An SQL query to execute
	* @return array An array containing the first column of each row returned by the query
	*/
	public function firstColumnArrayQuery($sql) {
		$sql = $this->prepare($sql);
		
		$list = array();
		$result = @$this->store->query($sql, PDO::FETCH_NUM);
		if($result) {
			foreach($result as $res) {
				$res[0] = self::autocastString($res[0]);
				array_push($list, $res[0]);
			}
		}
		
		$this->triggerSQLEvent($sql);
		
		return $list;
	}
	
	/**
	* Execute a query and return only the first row in the result set.
	* @param string $sql An SQL query to execute
	* @param int $resultType The type of object to return. Valid values include PDO::FETCH_NUM, PDO::FETCH_ASSOC or PDO::FETCH_BOTH
	* @return mixed The first row in the result set. The exact type of this object (associative, numeric, or both) depends on the $resultType parameter
	*/
	public function firstRowQuery($sql, $resultType=null) {
		$sql = $this->prepare($sql);
		
		if(!$resultType) {
			$resultType = $this->defaultResultType;
		}
		$list = $this->arrayQuery($sql, $resultType);
		
		$this->triggerSQLEvent($sql);
		
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
		$sql = $this->prepare($sql);
		
		$result = $this->store->exec($sql);
		$this->triggerSQLEvent($sql);
		return $result;
	}
	
	/**
	* Execute a query and return a single result (the first colum of the first row in case multiple values are returned).
	* @param string $sql An SQL query to execute
	* @return mixed The result of executing the specified SQL statement
	*/
	public function singleQuery($sql) {
		$sql = $this->prepare($sql);
		
		$result = @$this->store->query($sql);
		if(!$result) {
			return false;
		}
		$this->triggerSQLEvent($sql);
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
	
	public function quoteOnce($string) {
		$result = $this->store->quote($string);
		return preg_replace('/\\\+/', '\\', preg_replace("/(^'\\\'|\\\''$)/", "'", $result));
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