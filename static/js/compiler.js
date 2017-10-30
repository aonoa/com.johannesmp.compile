var url = "http://coliru.stacked-crooked.com/compile";

var defaultEditorFile = `
      <input class="filename">
      <button class="removefile">Remove</button>
      <pre class="full filecontent ace"></pre>
    `

// Dom Elements
var editor =
{
  args    : $("#args"),
  files   : $("#files"),
  addfile : $("#addfile"),
  compile : $("#compile"),
  output  : $("#output")
};

var aceEditors = {};

var editorCount = 0;

// Data
var data =
{
  args : "g++ -std=c++14 -O2 -Wall -pedantic -pthread ${cppFiles} && ./a.out",

  // reads in data from editor
  read : function() {
    this.args  = editor.args.val();
    this.files = {};

    var that = this;

    var fileElements = $(editor.files.find(".file"));
    fileElements.each(function() {
        var element = $(this);
        var filename = $(element.find("input.filename")[0]).val();
        var contentElement = $(element.find('.filecontent')[0]);
        var elementID = contentElement.attr('id');

        var fileContent = aceEditors[elementID].getValue();

        console.log(elementID);

        that.files[filename] = fileContent;
      });

    return this;
  },

  // writes data to editor
  write : function() {
    editor.args.val(this.args);
    editor.files.html("");
    for(var filename in this.files)
    {
      console.log("creating file: " + filename);
      var content = this.files[filename];
      addEditorFile(filename, content);
    }
  }
}


$(document).ready(function() {
  editor.compile.click(function(e) {
    e.preventDefault();
    ShowOutput("Waiting for server...");
    Compile();
  });

  editor.addfile.click(function(e) {
    e.preventDefault();
    addEditorFile("filename", "", true);
  })
});

function escapeHTML(input)
{
  return $("<div>").text(input).html()
}

function addEditorFile(filename, filecontent, select) {
  ++editorCount;

  // escape for ace
  var content = escapeHTML(filecontent);

  var element = $(`<div class="file"></div>`)
  element.html(defaultEditorFile);
  editor.files.append(element);
  console.log(element);

  var nameElement = $(element.find(".filename")[0]);
  nameElement.val(filename);

  var contentElement = $(element.find(".filecontent")[0])
  contentElement.html(content);

  var contentID = `editor_${editorCount}`
  contentElement.attr('id', contentID);
  console.log(contentElement);

  // Set up ace editor
  aceEditors[contentID] = ace.edit(contentID);
  aceEditors[contentID].setOptions({ maxLines: Infinity });
  aceEditors[contentID].$blockScrolling = Infinity;
  aceEditors[contentID].setTheme("ace/theme/tomorrow_night");
  aceEditors[contentID].getSession().setMode('ace/mode/c_cpp');

  var deleteButton = $(element.find(".removefile")[0]);

  deleteButton.click(function(e) {
    e.preventDefault();
    // remove the ace editor backend
    aceEditors[contentID].remove();
    // remove the mapping
    delete aceEditors[contentID];
    // remove the dom element
    element.remove();
    --editorCount;
  });

  if(select)
    $(nameElement).focus().select();
}

function Compile() {
  console.log("Attempting to Compile");

  var payload = BuildCommand(data.read());
  console.log(payload);

  $.post({
      url: url,
      crossDomain: true,
      data: JSON.stringify(payload),
  })
  .done(ShowSuccess)
  .fail(ShowError);
}

// Construct the command to be executed on the server
function BuildCommand(input) {
  var fileEcho = "";
  var cppFiles = "";

  for(var filename in input.files) {
    var content = input.files[filename].replace(/"/g,`\\"`);
    fileEcho += `echo "${content}">>${filename}&&`;
    if(filename.endsWith(".cpp"))
      cppFiles += `${filename} `;
  };

  compileArgs = input.args.replace("${cppFiles}", cppFiles);

  return { "cmd" : `${fileEcho} ${compileArgs}` };
}

function ShowOutput(output) {
  editor.output.html(output);
}

function ShowSuccess(reply) {
  console.log("OUTPUT: " + reply);
  ShowOutput(reply);
}

function ShowError(err) {
  console.error(err);
  ShowOutput(err);
}
