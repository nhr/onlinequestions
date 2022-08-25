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

// globals
var stopRefresh = true;
var previousResult = "";
var questionsColors = ["EBF09C", "99F0A1", "A1F0EC", "869BD9", "D6A5FA"];
var user = {
  selectedQuestionColor: 0,
  sorting: 0,
  eventNumber: -1,
  userId: -1,
  admin: false,
  upvoted: new Object(),
  submitted: new Object(),
  selected: new Object(),
  password: ""
};

function resetTmpUserData() {
  user.upvoted = new Object();
  user.submitted = new Object();
  user.selected = new Object();
}

function resetUserData() {
  previousResult = "";
  user.selectedQuestionColor = 0;
  user.sorting = 0;
  user.eventNumber = -1;
  user.userId = -1;
  user.admin = false;
  user.password = "";
  resetTmpUserData();
}

var wids = new Array("#pageEntry", "#pageCreate", "#pageEventData", "#pageHelp");
function showWidget(id) {
  for (var i = 0; i < wids.length; i++) {
    if (i === id) {
      $(wids[i]).removeClass("hidden");
    } else {
      $(wids[i]).addClass("hidden"); // commenting this line is useful for debugging
    }
  }
  if (id !== 2) {
    stopRefresh = true;
  }
}

function parseEventNumber(id, error) {
  var event = $(id).val();
  $("#showEventNo").html(event);
  $("#showEventNo2").html(event);
  var eventInt = parseInt(event);
  if (!eventInt || eventInt <= 0 || isNaN(eventInt)) {
    $(error).html("Please enter a valid event number");
    return -1;
  }
  return eventInt;
}

function makeAdmin() {
  user.admin = true;
  $("#adminTools").removeClass("hidden");
  $("#studentTools").hide();
}

function makeStudent() {
  user.admin = false;
  $("#adminTools").addClass("hidden");
  $("#studentTools").show();
}

function openEvent() {
  adminOpenEvent(false);
}

function createEvent() {
  adminOpenEvent(true);
}

function adminOpenEvent(create) {

  var eventNo = parseEventNumber("#eventNumberCreate", "#createError");
  if (eventNo < 0) {
    return;
  }

  if (eventNo < 10000) {
    $("#createError").html("Event number must have at least 5 digits.");
    return;
  }

  var password = $("#adminPasswordCreate").val();

  if (password.length === 0) {
    $("#createError").html("Please enter a valid password");
    return;
  }

  resetUserData();
  $("#createError").html("");

  var requestType = 2;
  if (create) {
    requestType = 1;
  }
  var dataStr = "eventNumber=" + eventNo + "&adminPassword=" + encodeURIComponent(password) + "&requestType=" + requestType;
  $.ajax({
    url: "clicker.php",
    type: "post",
    data: dataStr,
    success: function (response) {
      if (response === "Success") {
        $("#createError").html("");

        user.eventNumber = eventNo;
        user.userId = 0;
        user.password = password;
        makeAdmin();

        stopRefresh = false;
        getEventData();
      } else {
        $("#createError").html(response);
      }
    },
    error: function (response) {
      $("#createError").html('Error:' + response);
    }
  });
}

function studentEnter() {
  var eventNo = parseEventNumber("#eventNumber", "#enterError");
  if (eventNo < 0)
    return;

  resetUserData();

  $.ajax({
    url: "clicker.php",
    type: "post",
    data: "eventNumber=" + eventNo + "&requestType=6",
    success: function (response) {
      var good = false;

      var splitResponse = response.split(":");
      if (splitResponse.length === 2) {
        if (splitResponse[0] === "Success") {
          good = true;

          makeStudent();
          user.eventNumber = eventNo;
          user.userId = parseInt(splitResponse[1]);

          stopRefresh = false;
          getEventData();

        }
      }
      if (!good) {
        $("#enterError").html(response);
      } else {
        $("#enterError").html("");
      }
    },
    error: function (response) {
      $("#enterError").html('Error:' + response);
    }
  });
}

function handleQuestionClick(id) {

  if (!user.admin) {
    if (id.substring(0, 8) === "question") {
      var questionId = id.substring(8);

      var element = document.getElementById("num_" + id);
      var num = parseInt(element.innerHTML);
      if (!isNaN(num)) {
        if (!user.upvoted.hasOwnProperty(questionId)) {
          num += 1;
          user.upvoted[questionId] = num;

          if (previousResult.length > 0) {
            var html = generateEventOutput(previousResult);
            $("#feedbackLecturerContent").html(html);
          }

          if (user.eventNumber < 0 || user.userId < 0) {
            $("#feedbackLecturerError").html("Internal error. Event number of userId not set.");
            return;
          }
          var postData = "eventNumber=" + user.eventNumber + "&userId=" + user.userId + "&upvoteQuestionId=" + questionId + "&requestType=5";
          $.ajax({
            url: "clicker.php",
            type: "post",
            data: postData,
            success: function (response) {
              var good = false;

              var splitResponse = response.split(":");
              if (splitResponse.length === 2) {
                if (splitResponse[0] === "Success") {
                  good = true;
                }
              }
              if (!good) {
                $("#feedbackLecturerError").html(response);
              } else {
                $("#feedbackLecturerError").html("");
              }
            },
            error: function (response) {
              $("#feedbackLecturerError").html('Error:' + response);
            }
          });
        }
      }
    }
  } else { // if admin
    if (id.substring(0, 8) === "question") {
      var questionId = id.substring(8);

      if (questionId in user.selected) {
        delete user.selected[questionId];
      } else {
        user.selected[questionId] = 1;
      }

      if (previousResult.length > 0) {
        var html = generateEventOutput(previousResult);
        $("#feedbackLecturerContent").html(html);
      }
    }
  }
}

function handleColorButtonClick(event) {
  var id = event.currentTarget.id;
  if (id.substring(0, 15) === "colorButtonMenu") {
    var numStr = id.substring(15);
    var num = parseInt(numStr);
    if (!isNaN(num)) {
      var color = questionsColors[num];
    }
  }
  if (id.substring(0, 15) === "colorButtonNewQ") {
    var numStr = id.substring(15);
    var num = parseInt(numStr);
    if (!isNaN(num)) {
      var color = questionsColors[num];
      $("#questionPreview").css("background-color", "#" + color);
      user.selectedQuestionColor = num;
    }
  }
}

function getQuesitonTextScaling(text) {
  var ss = "larger";
  if (text.length > 60) {
    ss = "bitLarger";
  }
  if (text.length > 120) {
    ss = "smaller";
  }
  if (text.length > 160) {
    ss = "tiny";
  }
  return ss;
}

function sortResults(results, sortType) {

  var sorted = new Array();
  for (var i = 0; i < results.length; i++) {
    sorted.push(results[i]);
  }
  switch (sortType) {
    case 0 :
      { // sort by upvotes, then newest
        sorted.sort(function (a, b) {
          return 100000 * (b.upvotes - a.upvotes) + (b.id - a.id);
        });
      }
      break;
    case 1 :
      { // sort by newest
        sorted.sort(function (a, b) {
          return (b.id - a.id);
        });
      }
      break;
    case 2 :
      { // sort by color id, then newest
        sorted.sort(function (a, b) {
          return 100000 * (a.color - b.color) + (b.id - a.id);
        });
      }
      break;
    case 3 :
      { // sort by user id, then newest, lastly place own in front
        sorted.sort(function (a, b) {
          return 100000 * (b.userId - a.userId) + (b.id - a.id);
        });

        var ownFirst = new Array();
        var othersSecond = new Array();

        for (var i = 0; i < sorted.length; i++) {
          if (sorted[i].id in user.submitted) {
            ownFirst.push(sorted[i]);
          } else {
            othersSecond.push(sorted[i]);
          }
        }

        sorted = new Array();
        for (var i = 0; i < ownFirst.length; i++) {
          sorted.push(ownFirst[i]);
        }
        for (var i = 0; i < othersSecond.length; i++) {
          sorted.push(othersSecond[i]);
        }
      }
      break;
  }
  return sorted;
}

function generateEventOutput(resultStr) {
  var html = "";
  var unsortedResults = "";
  try {
    unsortedResults = JSON.parse(resultStr);
  } catch (e) {
    console.log("Wrong string received from server:" + resultStr);
    return;
  }
    
  if (unsortedResults.length >= 1) {

    // ensure that it is never smaller than the user expects
    for (var i = 0; i < unsortedResults.length; i++) {
      if (unsortedResults[i].id in user.upvoted) {
        unsortedResults[i].upvotes = Math.max(user.upvoted[unsortedResults[i].id], unsortedResults[i].upvotes);
      }
    }

    var results = sortResults(unsortedResults, user.sorting);

    html += "<div class='questionContainer'>";
    for (var i = 0; i < results.length; i++) {

      if (results[i].deleted !== 1) {
        var text = results[i].text;
        var ss = getQuesitonTextScaling(text);

        var colorCss = questionsColors[results[i].color];

        var hiddenHeart = "hidden";
        if (results[i].id in user.upvoted) {
          hiddenHeart = "";
        }

        var hiddenSubmitted = "hidden";
        if (results[i].id in user.submitted) {
          hiddenSubmitted = "";
        }

        var selected = "";
        if (results[i].id in user.selected) {
          selected = " questionSelected";
        }

        var hiddenAnswered = "hidden";
        if (results[i].answered === 1) {
          hiddenAnswered = "";
        }

        html += "<div id='question" + results[i].id + "' class='question' style='background-color:#" + colorCss + ";' onclick='handleQuestionClick(this.id)'>";
        html += "  <div class='outerContainer" + selected + "'>";
        html += "    <div class='upvoteNumber'><span class='ui-button-icon ui-icon ui-icon-star'></span>&nbsp;";
        html += "      <span id='num_question" + results[i].id + "'>" + results[i].upvotes + "</span>";
        html += "    </div>";

        html += "    <div class='upvotedContainter'>";
        html += "      <span id='upvote_question" + results[i].id + "' class='ui-button-icon ui-icon ui-icon-heart " + hiddenHeart + "' title='You have upvoted this question'></span>";
        html += "    </div>";

        html += "    <div class='answeredContainer'>";
        html += "      <span id='answered_question" + results[i].id + "' class='ui-button-icon ui-icon ui-icon-check " + hiddenAnswered + "' title='The question was answered'></span>";
        html += "    </div>";

        html += "    <div class='submittedContainer'>";
        html += "      <span id='submitted_question" + results[i].id + "' class='ui-button-icon ui-icon ui-icon-person " + hiddenSubmitted + "' title='This question was submitted by you'></span>";
        html += "    </div>";

        html += "    <div class='innerContainer " + ss + "'>";
        html += text;
        html += "    </div>";
        html += "  </div>";
        html += "</div>";
      }
    }
    html += "</div>";

  }

  return html;
}

function getEventData() {

  if (stopRefresh) {
    return;
  }
  showWidget(2);
  $.ajax({
    url: "clicker.php",
    type: "post",
    data: "eventNumber=" + user.eventNumber + "&requestType=3",
    success: function (response) {
      var good = false;

      if (response.length >= 8 && response.substring(0, 8) === "Success:") {

        good = true;
        if (!stopRefresh) {
            setTimeout(getEventData, 4000);
        }

        var currentResult = response.substring(8);
        if (previousResult !== currentResult) {
          previousResult = currentResult;
          var html = generateEventOutput(currentResult);
          $("#feedbackLecturerContent").html(html);
        }
      }

      if (!good) {
        $("#feedbackLecturerError").html(response);
        $("#feedbackLecturerContent").html("");
      } else {
        $("#feedbackLecturerError").html("");
      }
    },
    error: function (response) {
      $("#feedbackLecturerError").html('Server unreachable or an error occured:' + response);

      if (true) {
        if (!stopRefresh) {
            setTimeout(getEventData, 4000);
        }
      }
    }
  });
}

function submitQuestion() {
  var textPlain = $("#newQuestionText").val();
  
  var text = cleanupAndLinkify(textPlain);
  
  if (text.length < 1) {
    $("#submitQuestionError").html("Please enter a question text");
    return;
  }
  if (user.eventNumber < 0 || user.userId < 0) {
    $("#submitQuestionError").html("Internal error. Event number of userId not set.");
    return;
  }

  $.ajax({
    url: "clicker.php",
    type: "post",
    data: "eventNumber=" + user.eventNumber + "&userId=" + user.userId + "&questionText=" + encodeURIComponent(text) + "&questionColor=" + user.selectedQuestionColor + "&requestType=4",
    success: function (response) {
      var good = false;

      if (response.length >= 8 && response.substring(0, 8) === "Success:") {
        var index = response.indexOf(":", 8);
        if (index > 8) {
          var questionNo = parseInt(response.substring(8, index));
          
          user.submitted[questionNo] = 1;
          
          var currentResult = response.substring(index + 1);

          if (previousResult !== currentResult) {
            previousResult = currentResult;
            var html = generateEventOutput(currentResult);
            $("#feedbackLecturerContent").html(html);
          }

          good = true;
          $("#newQuestionText").val("");
          $("#questionPreviewContent").html("");
          $("#textLength").html("0");
          $("#newQuestionDialog").dialog("close");  
        }
      }
      if (!good) {
        $("#submitQuestionError").html(response);
      } else {
        $("#submitQuestionError").html("");
      }
    },
    error: function (response) {
      $("#submitQuestionError").html('Error:' + response);
    }
  });
}

function adminCommandOnSelection(command) {

  var selStr = "";
  var count = 0;
  for (var sel in user.selected) {
    if (count > 0) {
      selStr += ",";
    }
    selStr += sel;
    count++;
  }

  var dataStr = "eventNumber=" + user.eventNumber + "&adminPassword=" + encodeURIComponent(user.password) + "&requestType=7" + "&command=" + command + "&selected=" + selStr;
  $.ajax({
    url: "clicker.php",
    type: "post",
    data: dataStr,
    success: function (response) {
      
      if (response.length >= 8 && response.substring(0, 8) === "Success:") {

        var currentResult = response.substring(8);
        if (previousResult !== currentResult) {
          previousResult = currentResult;
          var html = generateEventOutput(currentResult);
          $("#feedbackLecturerContent").html(html);
        }
        
        if (command === 7) { // wipe user data
          resetTmpUserData();
        }
        
        $("#feedbackLecturerError").html("");
      } else {
        $("#feedbackLecturerError").html(response);
      }
    },
    error: function (response) {
      $("#feedbackLecturerError").html('Error:' + response);
    }
  });
}

function convertForExport() {
  $("#exporttabs-2").html(previousResult);

  var r = JSON.parse(previousResult);

  var text = "";
  for (var i = 0; i < r.length; i++) {
    text += r[i].text + " (" + r[i].upvotes + ")<br>";
  }
  $("#exporttabs-1").html(text);

  var csvText = '"id","text","userId","upvotes","color","answered","deleted","sorting"<br>';
  for (var i = 0; i < r.length; i++) {
    csvText += r[i].id + ",\"" + r[i].text.replace(/\"/g, '\\"') + "\"," + r[i].userId + "," + r[i].upvotes + "," + r[i].color + "," + r[i].answered + "," + r[i].deleted + "," + r[i].sorting + "<br>";
  }
  $("#exporttabs-3").html(csvText);
}

// From https://stackoverflow.com/questions/37684/how-to-replace-plain-urls-with-links
// and https://stackoverflow.com/questions/5002111/how-to-strip-html-tags-from-string-in-javascript

function cleanupAndLinkify(text) {
  
    var cleanText = text.replace(/<\/?[^>]+(>|$)/g, "");
  
    var replacedText, replacePattern1, replacePattern2, replacePattern3;

    //URLs starting with http://, https://, or ftp://
    replacePattern1 = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
    replacedText = cleanText.replace(replacePattern1, '<a href="$1" target="_blank">$1</a>');

    //URLs starting with "www." (without // before it, or it'd re-link the ones done above).
    replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
    replacedText = replacedText.replace(replacePattern2, '$1<a href="http://$2" target="_blank">$2</a>');

    //Change email addresses to mailto:: links.
    replacePattern3 = /(([a-zA-Z0-9\-\_\.])+@[a-zA-Z\_]+?(\.[a-zA-Z]{2,6})+)/gim;
    replacedText = replacedText.replace(replacePattern3, '<a href="mailto:$1">$1</a>');

    return replacedText;
}

// on page load
$(function () {
  $("#enter").button().click(studentEnter);

  $("#admin").button().click(function () {
    showWidget(1);
  });
  ;
  $(".help").button().click(function () {
    showWidget(3);
  });
  $(".back").button().click(function () {
    showWidget(0);
  });

  $("#create").button().click(createEvent);

  $("#open").button().click(openEvent);


  $("#sortingSelect").selectmenu({
    change: function () {
      user.sorting = parseInt(this.value);
      if (previousResult.length > 0) {
        var html = generateEventOutput(previousResult);
        $("#feedbackLecturerContent").html(html);
      }
    }
  });

  $("#studentSortingSelect").selectmenu({
    change: function () {
      user.sorting = parseInt(this.value);
      if (previousResult.length > 0) {
        var html = generateEventOutput(previousResult);
        $("#feedbackLecturerContent").html(html);
      }
    }
  });


  $("#controlgroup").controlgroup();
  $("#controlgroup2").controlgroup();
  $("#controlgroup3").controlgroup();
  $("#controlgroup4").controlgroup();

  for (var i = 0; i < 5; i++) {
    $("#colorButtonMenu" + i).button({
      text: false,
      icons: {
        primary: "colorButton" + i + "Icon"   // Custom icon
      }}).click(handleColorButtonClick);
    $("#colorButtonNewQ" + i).button({
      text: false,
      icons: {
        primary: "colorButton" + i + "Icon"   // Custom icon
      }}).click(handleColorButtonClick);
  }


  // related to the new question dialog
  $("#newQuestionDialog").dialog({
    resizable: false,
    height: "auto",
    width: "90%",
    autoOpen: false,
    modal: true,
    buttons: [
      {
        text: "Submit",
        click: function () {
          submitQuestion();
        },
        tabindex: 2
      },
      {
        text: "Cancel",
        click: function () {
          $(this).dialog("close");
        },
        tabindex: 3
      }
    ]
  });

  $("#wipeDialog").dialog({
    resizable: false,
    height: "auto",
    width: "90%",
    modal: true,
    autoOpen: false,
    buttons: {
      "Wipe Data": function () {
        adminCommandOnSelection(7);
        $(this).dialog("close");
      },
      Cancel: function () {
        $(this).dialog("close");
      }
    }
  });

  $("#exportDialog").dialog({
    resizable: false,
    height: "auto",
    width: "90%",
    modal: true,
    autoOpen: false,
    buttons: {
      Cancel: function () {
        $(this).dialog("close");
      }
    }
  });

  $("#newQuestionText").on('input', function () {
    var text = $("#newQuestionText").val();
    var ss = getQuesitonTextScaling(text);
    $("#textLength").html(text.length);
    
    var textWithLinks = cleanupAndLinkify(text);
    
    $("#questionPreviewContent").html("<span class='" + ss + "'>" + textWithLinks + "</span>");
  });


  $("#lecturerNew").button().click(function () {
    $("#newQuestionDialog").dialog("open");
  });
  $("#lecturerDelete").button().click(function () {
    adminCommandOnSelection(5);
  });
  $("#lecturerAnswered").button().click(function () {
    adminCommandOnSelection(6);
  });

  $("#colorButtonMenu0").button().click(function () {
    adminCommandOnSelection(0);
  });
  $("#colorButtonMenu1").button().click(function () {
    adminCommandOnSelection(1);
  });
  $("#colorButtonMenu2").button().click(function () {
    adminCommandOnSelection(2);
  });

  $("#colorButtonMenu3").button().click(function () {
    adminCommandOnSelection(3);
  });
  $("#colorButtonMenu4").button().click(function () {
    adminCommandOnSelection(4);
  });

  $("#studentNew").button().click(function () {
    $("#newQuestionDialog").dialog("open");
  });

  $("#lecturerClose").button().click(function () {
    resetUserData();
    $("#adminPasswordCreate").val("");
    $("#feedbackLecturerContent").html("");
    showWidget(0);
  });

  $("#lecturerWipe").button().click(function () {
    $("#wipeDialog").dialog("open");
  });

  $("#lecturerExport").button().click(function () {
    convertForExport();
    $("#exportDialog").dialog("open");
  });

  $("#exporttabs").tabs();

  $("#eventNumberCreate").val(Math.floor(Math.random() * 9000 + 10000));

  var paramStr = decodeURIComponent(window.location.search).substring(1);
  var paramParts = paramStr.split('&');
  for (var i = 0; i < paramParts.length; i++) {
    var param = paramParts[i].split('=');
    if (param.length === 2 && param[0] === "event") {
      var no = parseInt(param[1]);
      if (!isNaN(no)) {
        $("#eventNumber").val(param[1]);
        studentEnter();
      }
    }
  }
});