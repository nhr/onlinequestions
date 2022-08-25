<?php

// MIT License
// Copyright 2019 Thorsten Thormaehlen
// Contact: www.thormae.de

// Permission is hereby granted, free of charge, to any person obtaining a copy 
// of this software and associated documentation files (the "Software"), to deal 
// in the Software without restriction, including without limitation the rights 
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
// of the Software, and to permit persons to whom the Software is furnished to
// do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all 
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR 
// A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
// CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE 
// OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

$userDataDir = "./events/";


function my_file_get_contents($path, $ignored) {
  $tmp = fopen($path, 'rb');
  @flock($tmp, LOCK_SH);
  $contents = file_get_contents($path);
  @flock($tmp, LOCK_UN);
  fclose($tmp);
  return $contents;
}



function cleanUpOldEvents($dir) {
  $secondsToLive = 60 * 60 * 24 * 8; // 8 days
  foreach (glob($dir . "event*") as $eventDir) {
    if (is_dir($eventDir)) {
      if ((time() - filemtime($eventDir)) > $secondsToLive) {
        foreach (glob($eventDir . "/*") as $inDirFile) {
          unlink($inDirFile);
        }
        rmdir($eventDir);
        $dateStr = date("[Y/m/d G:i:s]");
        file_put_contents($dir . "clicker.log", $dateStr . "\t" . "Delete: Event with name " . $eventDir . "\n", FILE_APPEND | LOCK_EX);
      }
    }
  }
}


function adminCommand($dir, $command, $selected) {
  if (!file_exists($dir . "/event_questions.txt")) {
    return;
  }
  
  $selElements = explode(",", $selected);
  $selCount = count($selElements);
  
  $questions = my_file_get_contents($dir . "/event_questions.txt", LOCK_EX);
  $lines = explode("\n", $questions);
  $length = count($lines);
  
  $output = "";
  for($i=0; $i < $length; $i++) {
    $parts = explode(",", $lines[$i]);
    if(count($parts) >= 7) {
      
      $found = false;
      for($j=0; $j < $selCount; $j++) {
        if(intval($parts[0]) == intval($selElements[$j])) {
          $found = true;
        }
      }
      
      if(intval($command) >= 0 && intval($command) < 5 && $found) {
        $parts[3] = intval($command);
      }
      
      if($command == "5" && $found) { // delete
        $parts[5] = 1;
      }
      if($command == "6" && $found) { // answered
        $parts[4] = 1;
      }
      
      if($command == "7") { // answered
        $parts[1] = base64_encode("wiped");
        $parts[5] = 1;
      }
      
      $output .= $parts[0] . "," . $parts[1] . "," . $parts[2] . "," . $parts[3] . "," . $parts[4] . "," .  $parts[5] . "," . $parts[6] . "\n";
    }
    
  }
  file_put_contents($dir . "/event_questions.txt", $output, LOCK_EX);
  
}

function createEventSummary($dir, $Wait) {
  
  if (!is_dir($dir)) {
    return;
  }
  if (!file_exists($dir . "/event_summary.txt")) {
    return;
  }
  if (!file_exists($dir . "/event_questions.txt")) {
    return;
  }
  
  if ($Wait) {
    $secondsTillNextUpdate = 3;
    if ((time() - filemtime($dir . "/event_summary.txt")) < $secondsTillNextUpdate) {
      return;
    }
  }

  $questions = my_file_get_contents($dir . "/event_questions.txt", LOCK_EX);
  
  $lines = explode("\n", $questions);
 
  $output = "[\n";
  $length = count($lines);


  // count votes
  $counters = range(0, $length - 1);
  for ($i = 0; $i < $length; $i++) {
    $counters[$i] = 0;
  }

  $total = 0;
  $dh = opendir($dir);
  while (($file = readdir($dh)) !== false) {
    $f = $dir . "/" . $file;
    if (is_file($f)) {
      //echo "filename: " . $file . "\n";
      $fileParts = explode("_", $file);
      if (count($fileParts) > 2) {
        if ($fileParts[0] == "vote") {
          $ii = intval($fileParts[1]);
          if ($ii > 0 && $ii <= $length) {
            $counters[$ii - 1] ++;
            $total++;
          }
        }
      }
    }

    //echo "\n";
  }
  //print_r( array_values( $counters ));
  closedir($dh);

  for($i=0; $i < $length; $i++) {
    $parts = explode(",", $lines[$i]);
    if(count($parts) >= 7) {
      if($i > 0) {
        $output .= ",\n";
      }
      $upvotes = $counters[$i];
      
      $text = str_replace('"', '\"', base64_decode($parts[1]));
      
      $output .= '{';
      $output .= '"id": ' . $parts[0] . ', ';
      $output .= '"text": '   . json_encode($text) . ', ';
      $output .= '"userId": ' . $parts[2] . ', ';
      $output .= '"upvotes": '   . $upvotes . ', ';
      $output .= '"color": ' . $parts[3] . ', ';
      $output .= '"answered": ' . $parts[4] . ', ';
      $output .= '"deleted": ' . $parts[5] . ', ';
      $output .= '"sorting": ' . $parts[6];
      $output .= '}';
    }
  }
  $output .= "\n]\n";
  file_put_contents($dir . "/event_summary.txt", $output , LOCK_EX);

  return $output;
}

// read initial post parameters that are required by all request types
$event = filter_input(INPUT_POST, 'eventNumber', FILTER_VALIDATE_INT);
$requestType = filter_input(INPUT_POST, 'requestType', FILTER_VALIDATE_INT);
$userId = filter_input(INPUT_POST, 'userId', FILTER_VALIDATE_INT);
$questionColor = filter_input(INPUT_POST, 'questionColor', FILTER_VALIDATE_INT);
$upvoteQuestionId =  filter_input(INPUT_POST, 'upvoteQuestionId', FILTER_VALIDATE_INT);
$command =  filter_input(INPUT_POST, 'command', FILTER_VALIDATE_INT);
$selected =  filter_input(INPUT_POST, 'selected');
$password = filter_input(INPUT_POST, 'adminPassword');
$questionText =  filter_input(INPUT_POST, 'questionText');




// check input
if (!$event || !$requestType) {
  die('Internal error: Wrong post format ' . ' event=' . $event . " requestType=" . $requestType);
}

if (intval($requestType) < 1 || intval($requestType) > 7) {
  die('Internal error: requestType=' . $requestType);
}

$eventDir = "event" . $event;
$dateStr = date("[Y/m/d G:i:s]");

if ($requestType == "1") { // create event as admin (lecturer)
  
  cleanUpOldEvents($userDataDir, $dateStr);
  
  // encrypt password
  $passwordHash = "";
  if (!empty($password)) {
    $passwordHash = hash("sha256", $password);
  }

  if (!file_exists($userDataDir)) {
    mkdir($userDataDir, 0777, true);
  }

  if (is_dir($userDataDir . $eventDir)) {
    die('An event with number ' . $event . ' already exists. Press &quot;Open&quot; or choose a different event number.');
  } else {
    
    if(empty($passwordHash)) {
      die('Please enter a password.');
    }
    
    mkdir($userDataDir . $eventDir, 0777, true);
    file_put_contents($userDataDir . $eventDir . "/event_passwort.txt", $passwordHash, LOCK_EX);
    touch($userDataDir . $eventDir . "/event_users.txt");
    touch($userDataDir . $eventDir . "/event_questions.txt");
    touch($userDataDir . $eventDir . "/event_summary.txt");
    
    file_put_contents($userDataDir . "clicker.log", $dateStr . "\t" . "Create: Event with name " . $eventDir . " created \n", FILE_APPEND | LOCK_EX);
    echo "Success";
  }
}

if ($requestType == "2") { // open event as admin (lecturer)
  
  cleanUpOldEvents($userDataDir, $dateStr);
  
  // encrypt password
  $passwordHash = "";
  if (!empty($password)) {
    $passwordHash = hash("sha256", $password);
  }

  if (empty($passwordHash)) {
    die('Please enter a password.');
  }
  
  if (!is_dir($userDataDir . $eventDir)) {
    die('An event with number ' . $event . ' does not exist. Events are automatically deleted eight days after their creation. Press &quot;Create&quot; if you like to generate a new event.');
  }

  $readpasswordHash = my_file_get_contents($userDataDir . $eventDir . "/event_passwort.txt", LOCK_EX);
    
  if($readpasswordHash === $passwordHash) {
    echo "Success";
  }else{
    die('An event with number ' . $event . ' exists but the given password is wrong');
  }
}

if ($requestType == "3") { // get event data (admin and students)
  $dir = $userDataDir . $eventDir;
  
  if (!is_dir($dir)) {
      die('An event with number ' . $event . ' does not exist.');
  } else {

    // create new summery file if time is up
    createEventSummary($userDataDir.$eventDir, true);
    
    $summaryFile = $dir . "/event_summary.txt";
    if (!file_exists($summaryFile)) {
      die('Internal error: can not open ' . $summaryFile);
    }
    echo "Success:" . my_file_get_contents($summaryFile, LOCK_EX);
  }
}

if ($requestType == "4") { // add new question (admin and students)
  if (!is_dir($userDataDir . $eventDir)) {
    die('A event with number ' . $event . ' does not exist.');
  } else {
    
    $questionFile = $userDataDir . $eventDir . "/event_questions.txt";
    $readquestions = my_file_get_contents($questionFile, LOCK_EX);
    $count = substr_count($readquestions, "\n" );
    $count += 1;  
    
    $sorting = $count;
    $answered = 0;
    $deleted = 0;
    
    $output = $count . "," . base64_encode($questionText) . "," . $userId . "," . $questionColor . "," . $answered . "," . $deleted . "," . $sorting . "\n";
   
    file_put_contents($questionFile, $output , FILE_APPEND | LOCK_EX);
    
    // create new summery file immediately
    $summary = createEventSummary($userDataDir.$eventDir, false);
    
    echo "Success:" . $count . ":" . $summary;
  }
}

if ($requestType == "5") { // upvote
  if (!is_dir($userDataDir . $eventDir)) {
    die('A event with number ' . $event . ' does not exist.');
  } else {
     $voteFileName = "vote_" . $upvoteQuestionId . "_" . $userId . ".txt"; 

    touch($userDataDir . $eventDir . "/" . $voteFileName);
    echo "Success:" . $voteFileName;
  }
}

if ($requestType == "6") { // student enter
  if (!is_dir($userDataDir . $eventDir)) {
    die('An event with number ' . $event . ' does not exist. Press the &quot;Admin&quot; button if you like to create a new event with this number.');
  } else {
    
    $readusers = my_file_get_contents($userDataDir . $eventDir . "/event_users.txt", LOCK_EX);
    $count = substr_count($readusers, "student" );
    $count += 1;
    file_put_contents($userDataDir . $eventDir . "/event_users.txt", "student". $count . "\n", FILE_APPEND | LOCK_EX);
    
    echo "Success:" . $count;
  }
}

if ($requestType == "7") { // admin command on selection
  
  // encrypt password
  $passwordHash = "";
  if (!empty($password)) {
    $passwordHash = hash("sha256", $password);
  }
  if (empty($passwordHash)) {
    die('No admin password received.');
  }
  if (!is_dir($userDataDir . $eventDir)) {
    die('An event with number ' . $event . ' does not exist.');
  }
  $readpasswordHash = my_file_get_contents($userDataDir . $eventDir . "/event_passwort.txt", LOCK_EX);
    
  if ($readpasswordHash !== $passwordHash) {
    die('Wrong admin password received.');
  }

  adminCommand($userDataDir . $eventDir, $command, $selected);

  // create new summery file immediately
  $summary = createEventSummary($userDataDir.$eventDir, false);
  
  echo "Success:" . $summary;
}


?>