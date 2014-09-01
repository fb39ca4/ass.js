function Ass() {
  this.scriptInfo = new Ass.ScriptInfo();
  this.dialogue = [];
  this.styles = {};
}

Ass.fromString = function(input) {
  //input is a string with the contents of an SSA/ASS file
  //check if this is a valid file
  var lines = input.split('\n');
  if (/^\[Script Info]/i.test(lines[0]) == false) {
    return false;
  }
  var section = "scriptinfo";
  //stores the order of field names defined in Format: lines
  var stylesFormat = [];
  var eventsFormat = [];
  //stores styles and events as objects
  var stylesRaw = [];
  var eventsRaw = [];
  var scriptInfoRaw = {};
  
  //iterate through each line
  for (var i = 1; i < lines.length; i++) {
    //if line is a section heading, set the current section appropriately
    if (/^\[V4\+? Styles\+?\]/i.test(lines[i])) {
      section = "styles";
      continue;
    }
    if (/^\[Events]/i.test(lines[i])) {
      section = "events";
      continue;
    }
    if (/^\[.*]/i.test(lines[i])) {
      section = "other";
      continue;
    }
    
    //parse lines differently based on what section we are in
    if (section == "scriptinfo") {
      if (/^;/i.test(lines[i])) {
        continue;
      }
      if (/^!:/i.test(lines[i])) {
        continue;
      }
      if (!/:/i.test(lines[i])) {
        continue;
      }
      var name = lines[i].substring(0, lines[i].indexOf(":"));
      scriptInfoRaw[name] = lines[i].substring(lines[i].indexOf(":") + 1).replace(/^\s*/, "");
      
      continue;
    }
    if (section == "styles") {
      //get formatting for subsequent Style: lines
      if (/^Format:/i.test(lines[i])) {
        stylesFormat = lines[i].replace(/Format:/i, "").replace(/\s/g, "").split(",");
      }
      //for all the comma delimited values in the line, give the style object a new attribute named with the corresponding name from Format:, and push to the style array.
      if (/^Style:/i.test(lines[i])) {
        var tmpStyle = new Object();
        for (var j = 0; j < stylesFormat.length; j++) {
          tmpStyle[stylesFormat[j]] = lines[i].replace(/^Style: */i, "").split(',')[j];
        }
        stylesRaw.push(tmpStyle);
      }
      //if the line starts with anything else, ignore it
      continue;
    }
    if (section == "events") {
      //same idea as styles
      if (/^Format:/i.test(lines[i])) {
        eventsFormat = lines[i].replace(/^Format:/i, "").split(',');
        for (var j = 0; j < eventsFormat.length; j++) {
          eventsFormat[j] = eventsFormat[j].replace(/\s/g, "");
          //eventsFormat[j] = eventsFormat[j][0].toLowerCase() + eventsFormat[j].substring(1);
        }
      }
      if (/^Dialogue:/i.test(lines[i])) {
        var tmpEvent = new Object();
        var tmpLineSplit = lines[i].replace(/^Dialogue: */i, "").split(',');
        for (var j = 0; j < eventsFormat.length; j++) {
          tmpEvent[eventsFormat[j]] = tmpLineSplit[j];
          if (eventsFormat[j] == "Text") {
            //dialog text can be inadvertently split if it contains commas, so here it is rejoined
            tmpEvent[eventsFormat[j]] = tmpLineSplit.splice(j).join(',');
          }
        }
        tmpEvent.LineNumber = i + 1;
        eventsRaw.push(tmpEvent);
      }
      continue;
    }
    if (section == "other") {
      continue;
    }
  }
  ass = new Ass()
  ass.scriptInfo = Ass.ScriptInfo.fromRaw(scriptInfoRaw);
  ass.scriptInfo.raw = scriptInfoRaw;
  for (var i = 0; i < stylesRaw.length; i++) {
    if (stylesRaw[i].Name == undefined) {
      continue;
    }
    ass.styles[stylesRaw[i].Name] = Ass.AssStyle.fromRaw(stylesRaw[i]);
  }
  for (var i = 0; i < eventsRaw.length; i++) {
    ass.dialogue.push(Ass.Dialogue.fromRaw(eventsRaw[i]));
  }
  ass.unsortedDialogue = ass.dialogue.duplicate();
  var dialogueSort = function(a, b) {
    if (a.startTime == b.startTime) return a.lineNumber - b.lineNumber;
    else return a.startTime - b.startTime;
  }
  ass.dialogue.sort(dialogueSort);
  ass.applyStyles();
  console.log(ass);
  return ass;
}
testStyle = {};
Ass.prototype.applyStyles = function() {
  for (var i = 0; i < ass.dialogue.length; i++) {
    var dialogue = this.dialogue[i];
    var originalStyle = this.styles[dialogue.style];
    if (typeof(originalStyle) == "undefined") originalStyle = this.styles["Default"];
    if (dialogue.marginL == 0 && dialogue.marginR == 0 && dialogue.marginV == 0) {
      dialogue.marginL = originalStyle.marginL;
      dialogue.marginR = originalStyle.marginR;
      dialogue.marginV = originalStyle.marginV;
    }
    dialogue.styledText = [];
    
    var div = document.createElement("div");
    div.style.position = "absolute";
    
    var modifiedStyle = Ass.AssStyle.fromParent(originalStyle);
    dialogue.firstStyle = null;
    var drawMode = 0;
    for (var j = 0; j < dialogue.taggedText.length; j++) {
      switch (dialogue.taggedText[j].type) {
        case "text":
          if (drawMode == 0) {
            var span = document.createElement("span");
            modifiedStyle.toCss(span.style);
            span.innerHTML = dialogue.taggedText[j].text;
            div.appendChild(span);
            
            dialogue.styledText.push({text: dialogue.taggedText[j].text, style: modifiedStyle, drawMode: 0});
            if (dialogue.firstStyle == null) dialogue.firstStyle = modifiedStyle;
            modifiedStyle = Ass.AssStyle.fromParent(modifiedStyle);
            modifiedStyle.baseStyle = originalStyle;
          }
          else {
          }
          break;
        case "p":
          drawMode = dialogue.taggedText[j].args[0];
          break;
        case "r":
          if (dialogue.taggedText[j].args.length > 0) originalStyle = dialogue.taggedText[j].args[0];
          modifiedStyle = Ass.AssStyle.fromParent(originalStyle);
          break;
        case "comment":
        case "unknown":
          break;
        default:
          dialogue.taggedText[j].applyTo(modifiedStyle);
          dialogue.taggedText[j].applyToGlobal(dialogue);
          testStyle = modifiedStyle;
          break;
      }
    }
    if (dialogue.alignmentH == null) dialogue.alignmentH = originalStyle.alignmentH;
    if (dialogue.alignmentV == null) dialogue.alignmentV = originalStyle.alignmentV;
    if (dialogue.firstStyle == null) dialogue.firstStyle = modifiedStyle;
    //shaping_div.appendChild(div);
  }
}

Ass.Dialogue = function() {
  this.pos = {mode: "auto"}
  this.fade = {mode: "none"}
  this.clip = {mode: "none"}
  this.org = {mode: "auto"}

}

Ass.Dialogue.prototype.startTime = -9001;
Ass.Dialogue.prototype.endTime = -9000;
Ass.Dialogue.prototype.layer = 0;
Ass.Dialogue.prototype.style = "Default";
Ass.Dialogue.prototype.marginL = 0;
Ass.Dialogue.prototype.marginR = 0;
Ass.Dialogue.prototype.marginV = 0;
Ass.Dialogue.prototype.effect = "";
Ass.Dialogue.prototype.rawText = "default dialogue line";
Ass.Dialogue.prototype.plainText = "default dialogue line";
Ass.Dialogue.prototype.taggedText = ["default dialogue line"];
Ass.Dialogue.prototype.alignmentH = null;
Ass.Dialogue.prototype.alignmentV = null;

Ass.Dialogue.fromRaw = function(raw) {
  var hmsToSeconds = Ass.util.hmsToSeconds;

  var dialogue = new Ass.Dialogue();
  dialogue.raw = raw;
  if (parseInt(raw.Layer) != NaN) dialogue.layer = parseInt(raw.Layer);
  if (hmsToSeconds(raw.Start) != NaN) dialogue.startTime = hmsToSeconds(raw.Start);
  if (hmsToSeconds(raw.End) != NaN) dialogue.endTime = hmsToSeconds(raw.End);
  dialogue.style = raw.Style;
  if (parseFloat(raw.MarginL) != NaN) dialogue.marginL = parseFloat(raw.MarginL);
  if (parseFloat(raw.MarginR) != NaN) dialogue.marginR = parseFloat(raw.MarginR);
  if (parseFloat(raw.MarginV) != NaN) dialogue.marginV = parseFloat(raw.MarginV);
  dialogue.effect = raw.Effect;
  dialogue.rawText = raw.Text;
  dialogue.lineNumber = raw.LineNumber;
  
  dialogue.taggedText = [];
  /*var startIndex = 0;
  var inOverride = false;
  for (var i = 0; i < block.length; i++) {
    if (inOverride == true)
      if (block.charAt(i) == "{")   
  }*/
  var splitText = dialogue.rawText.split(/\{|\}/);
  var inOverride = false;
  for (var i = 0; i < splitText.length; i++) {
    if (inOverride == true) {
      inOverride = false;
      dialogue.taggedText.pushArray(Ass.Dialogue.OverrideTag.parseBlock(splitText[i], dialogue.endTime - dialogue.startTime));
    }
    else {
      inOverride = true;
      var escapedText = splitText[i];
      if (escapedText.length == 0) continue;
      escapedText = escapedText.replace(/\\n/g, "\n");
      escapedText = escapedText.replace(/\\N/g, "<br>");
      escapedText = escapedText.replace(/\\h/g, "&nbsp;");
      dialogue.taggedText.push({type: "text", text: escapedText})
    }
  }

  dialogue.plainText = dialogue.rawText.split(/\{.*?\}/).join("").replace(/(\r\n|\n|\r)/gm," ");
  
  return dialogue;
}

Ass.Dialogue.OverrideTag = function(raw, duration) {  
  if (typeof(duration) == undefined) duration = 1;
  this.raw = raw;
  this.args = [];
  this.rawArgs = [];
  if (raw.charAt(0) != "\\") {
    this.type = "comment";
    return;
  }
  raw = raw.slice(1, raw.length);
  
  var tag = function(tagName, argTypes, zeroLengthAllowed) {
    if (typeof(zeroLengthAllowed) != "boolean") zeroLengthAllowed = true;
    var args = Ass.util.separateArguments(raw.slice(tagName.length, raw.length));
    this.rawArgs = args;
    if (raw.startsWith(tagName) == false) {
      return false;
    }
    else if (args.length == 0) {
      if (zeroLengthAllowed == true) {
        this.type = tagName;
        return true;
      }
      else {
        return false;
      }
    }
    else if (args.length < argTypes.length) {
      return false;
    }
    else {
      this.type = tagName;
      for (var i = 0; i < argTypes.length; i++) {
        switch (argTypes[i]) {
          case "bool":
            if (args[i].charAt(0) == "1") this.args.push(true);
            else if (args[i].charAt(0) == "0") this.args.push(false);
            else this.args.push(undefined);
            break;
          case "int":
            this.args.push(parseInt(args[i]));
            break;
          case "float":
            this.args.push(parseFloat(args[i]));
            break;
          case "string":
            this.args.push(args[i]);
            break;
          case "tags":
            this.args.push(Ass.Dialogue.OverrideTag.parseBlock(args[i], duration));
            break;
          case "milliseconds":
            this.args.push(parseFloat(args[i]) / 1000);
            break;
          default:
            this.args.push(undefined);    
        }
      }
      return true;
    }
  }.bind(this);
  var colorTag = function(tagName) {
    if (raw.startsWith(tagName) == false) return false;
    else {
      this.type = tagName;
      var args = Ass.util.separateArguments(raw.slice(tagName.length, raw.length));
      if (args.length == 1) {
        var color = Ass.AssStyle.Color.fromHex(args[0]);
        this.args.push(color);
      }
      return true;
    }
  }.bind(this);
  var clipTag = function(tagName) {
    if (raw.startsWith(tagName) == false) return false;
    else {
      var args = Ass.util.separateArguments(raw.slice(tagName.length, raw.length));
      if (args.length == 4) {
        this.type = tagName + "_rect";
        this.args.push(parseFloat(args[0]));
        this.args.push(parseFloat(args[1]));
        this.args.push(parseFloat(args[2]));
        this.args.push(parseFloat(args[3]));
      }
      else if (args.length == 1) {
        this.type = tagName + "_vect";
        this.args.push(1);
        this.args.push(args[1]);
      }
      else if (args.length == 2) {
        this.type = tagName + "_vect";
        this.args.push(parseFloat(args[0]));
        this.args.push(args[1]);
      }
      return true;
    }
  }.bind(this);
  var tTag = function(tagName) {
    if (raw.startsWith(tagName) == false) return false;
    else {
      var args = Ass.util.separateArguments(raw.slice(tagName.length, raw.length));
      this.type = tagName;
      if (args.length == 0) return false;
      if (args.length >= 4) {
        this.args.push(parseFloat(args[0]) / 1000);
        this.args.push(parseFloat(args[1]) / 1000);
        this.args.push(parseFloat(args[2]));
        this.args.push(Ass.Dialogue.OverrideTag.parseBlock(args[3], duration));
      }
      else if (args.length == 3) {
        this.args.push(parseFloat(args[0]) / 1000);
        this.args.push(parseFloat(args[1]) / 1000);
        this.args.push(1);
        this.args.push(Ass.Dialogue.OverrideTag.parseBlock(args[2], duration));
      }
      else if (args.length == 2) {
        this.args.push(parseFloat(0));
        this.args.push(parseFloat(duration));
        this.args.push(parseFloat(args[0]));
        this.args.push(Ass.Dialogue.OverrideTag.parseBlock(args[1], duration));
      }
      else if (args.length == 1) {
        this.args.push(0);
        this.args.push(duration);
        this.args.push(1);
        this.args.push(Ass.Dialogue.OverrideTag.parseBlock(args[0], duration));
      }
      return true;
    }
  }.bind(this);
  var moveTag = function(tagName) {
    if (raw.startsWith(tagName) == false) return false;
    else {
      var args = Ass.util.separateArguments(raw.slice(tagName.length, raw.length));
      this.type = tagName;
      if (args.length >= 6) {
        this.args.push(parseFloat(args[0]));
        this.args.push(parseFloat(args[1]));
        this.args.push(parseFloat(args[2]));
        this.args.push(parseFloat(args[3]));
        this.args.push(parseFloat(args[4]) / 1000);
        this.args.push(parseFloat(args[5]) / 1000);
      }
      else if (args.length >= 4) {
        this.args.push(parseFloat(args[0]));
        this.args.push(parseFloat(args[1]));
        this.args.push(parseFloat(args[2]));
        this.args.push(parseFloat(args[3]));
        this.args.push(0);
        this.args.push(duration);
      }
      else return false;
    }
  }.bind(this);
  var fadeTag = function(tagName) {
    if (raw.startsWith(tagName) == false) return false;
    else {
      var args = Ass.util.separateArguments(raw.slice(tagName.length, raw.length));
      this.type = tagName;
      if (args.length >= 7) {
        this.args.push(parseFloat(args[0]));
        this.args.push(parseFloat(args[1]));
        this.args.push(parseFloat(args[2]));
        this.args.push(parseFloat(args[3]) / 1000);
        this.args.push(parseFloat(args[4]) / 1000);
        this.args.push(parseFloat(args[5]) / 1000);
        this.args.push(parseFloat(args[5]) / 1000);
      }
      else if (args.length >= 2) {
        this.args.push(255);
        this.args.push(0);
        this.args.push(255);
        this.args.push(0);
        this.args.push(parseFloat(args[0]) / 1000);
        this.args.push(parseFloat(args[1]) / 1000);
        this.args.push(duration);
      }
      else return false;
    }
  }.bind(this);
  
  if (false) {}
  /*else if (tag("t", ["float", "float", "float", "tags"])){}
  else if (tag("t", ["float", "float", "tags"])){}
  else if (tag("t", ["float", "tags"])){}
  else if (tag("t", ["tags"])){}*/
  else if (tTag("t")){}
  else if (tag("pos", ["float", "float"])){}
  else if (tag("org", ["float", "float"])){}
  else if (tag("move", ["float", "float", "float", "float", "milliseconds", "milliseconds"])){}
  else if (tag("move", ["float", "float", "float", "float"])){}
  //else if (moveTag("move")){}
  else if (tag("fade", ["float", "float", "float", "milliseconds", "milliseconds", "milliseconds", "milliseconds"])){}
  else if (tag("fad", ["milliseconds", "milliseconds"])){}
  //else if (fadeTag("fade")){}
  //else if (fadeTag("fad")){}
  else if (tag("bord", ["float"])){}
  else if (tag("xbord", ["float"])){}
  else if (tag("ybord", ["float"])){}
  else if (tag("shad", ["float"])){}
  else if (tag("xshad", ["float"])){}
  else if (tag("yshad", ["float"])){}
  else if (tag("fn", ["string"])){}
  else if (tag("fsp", ["float"])){}
  else if (tag("fscx", ["float"])){}
  else if (tag("fscy", ["float"])){}
  else if (tag("frx", ["float"])){}
  else if (tag("fry", ["float"])){}
  else if (tag("frz", ["float"])){}
  else if (tag("fr", ["float"])){}
  else if (tag("fs", ["float"])){}
  else if (tag("fe", ["int"])){}
  else if (tag("blur", ["float"])){}
  else if (tag("be", ["bool"])){}
  else if (clipTag("clip")){}
  else if (clipTag("iclip")){}
  else if (colorTag("c")){}
  else if (colorTag("1c")){}
  else if (colorTag("2c")){}
  else if (colorTag("3c")){}
  else if (colorTag("4c")){}
  else if (colorTag("alpha")){}
  else if (colorTag("1a")){}
  else if (colorTag("2a")){}
  else if (colorTag("3a")){}
  else if (colorTag("4a")){}
  else if (tag("an", ["int"])){}
  else if (tag("a", ["int"])){}
  else if (tag("q", ["int"])){}
  else if (tag("b", ["int"])){}
  else if (tag("i", ["bool"])){}
  else if (tag("s", ["bool"])){}
  else if (tag("u", ["bool"])){}
  else if (tag("r", ["string"])){}
  else if (tag("p", ["int"])){}
  else {
    this.type = "unknown";
  }
}

Ass.Dialogue.OverrideTag.parseBlock = function(block, duration) {
  if (typeof(duration) != "number") duration = 1;
  var rawTags = [];
  var parenthesesLevel = 0;
  var startIndex = 0;
  for (var i = 0; i < block.length; i++) {
    if (block.charAt(i) == ")") parenthesesLevel -= 1;
    if (block.charAt(i) == "(") parenthesesLevel += 1;
    if (parenthesesLevel != 0) continue;
    if (block.charAt(i) == "\\") {
      if (i - startIndex > 0) {
        rawTags.push(block.slice(startIndex, i));
        startIndex = i;
      }
    }  
  }
  if (block.length - startIndex > 0) {
    rawTags.push(block.slice(startIndex, block.length));
  }
  var tags = [];
  for (var i = 0; i < rawTags.length; i++) {
    tags.push(new Ass.Dialogue.OverrideTag(rawTags[i], duration));
  }
  return tags;
}

Ass.Dialogue.OverrideTag.prototype.applyTo = function(style) {
  var interp = function(value) {return new InterpolatingBase(value)}; 
  var args = this.args;
  switch (this.type) {
    case "b":
      if (args.length == 1) {
        if (args[0] == 0) style.fontWeight = 400;
        else if (args[0] == 1) style.fontWeight = 700;
        else style.fontWeight = args[0];
      }
      else style.fontWeight = style.baseStyle.fontWeight;
      break;
    case "i":
      if (args.length == 1) style.italic = args[0];
      else style.italic = style.baseStyle.italic;
      break;
    case "s":
      if (args.length == 1) style.strikeout = args[0];
      else style.strikeout = style.baseStyle.strikeout;
      break;
    case "u":
      if (args.length == 1) style.underline = args[0];
      else style.underline = style.baseStyle.underline;
      break;
    case "fn":
      if (args.length == 1) style.fontName = args[0];
      else style.fontName = style.baseStyle.fontName;
      break;
    case "fs":
      if (args.length == 1) style.fontSize = interp(args[0]);
      else style.fontSize = style.baseStyle.fontSize;
      break;
    case "fsp":
      if (args.length == 1) style.spacing = interp(args[0]);
      else style.spacing = style.baseStyle.spacing;
      break;
    case "fscx":
      if (args.length == 1) style.scaleX = interp(args[0] / 100.0);
      else style.scaleX = style.baseStyle.scaleX;
      break;
    case "fscy":
      if (args.length == 1) style.scaleY = interp(args[0] / 100.0);
      else style.scaleY = style.baseStyle.scaleY;
      break;
    case "frx":
      if (args.length == 1) style.rotX = interp(args[0]);
      else style.rotX = style.baseStyle.rotX;
      break;
    case "fry":
      if (args.length == 1) style.rotY = interp(args[0]);
      else style.rotY = style.baseStyle.rotY;
      break;
    case "fr":
    case "frz":
      if (args.length == 1) style.rotZ = interp(args[0]);
      else style.rotZ = style.baseStyle.rotZ;
      break;
    case "fax":
      if (args.length == 1) style.shearX = interp(args[0]);
      else style.shearX = style.baseStyle.shearX;
      break;
    case "fay":
      if (args.length == 1) style.shearY = interp(args[0]);
      else style.shearY = style.baseStyle.shearY;
      break;
    case "blur":
      if (args.length == 1) style.blur = interp(args[0]);
      else style.blur = style.baseStyle.blur;
      break;
    case "bord":
      if (args.length == 1) style.outlineX = style.outlineY = interp(args[0]);
      else {
        style.outlineX = style.baseStyle.outlineX;
        style.outlineY = style.baseStyle.outlineY;
      }
      break;
    case "xbord":
      if (args.length == 1) style.outlineX = interp(args[0]);
      else style.outlineX = style.baseStyle.outlineX;
      break;
    case "ybord":
      if (args.length == 1) style.outlineY = interp(args[0]);
      else style.outlineY = style.baseStyle.outlineY;
      break;
    case "shad":
      if (args.length == 1) style.shadowX = style.shadowY = interp(args[0]);
      else {
        style.shadowX = style.baseStyle.shadowX;
        style.shadowY = style.baseStyle.shadowY;
      }
      break;
    case "xshad":
      if (args.length == 1) style.shadowX = interp(args[0]);
      else style.shadowX = style.baseStyle.shadowX;
      break;
    case "yshad":
      if (args.length == 1) style.shadowY = interp(args[0]);
      else style.shadowY = style.baseStyle.shadowY;
      break;
    case "c":
    case "1c":
      if (args.length == 1) {
        style.fillColorR = interp(args[0].r);
        style.fillColorG = interp(args[0].g);
        style.fillColorB = interp(args[0].b);
      }
      else {
        style.fillColorR = style.baseStyle.fillColorR;
        style.fillColorG = style.baseStyle.fillColorG;
        style.fillColorB = style.baseStyle.fillColorB;
      }
      break;
    case "2c":
      if (args.length == 1) {
        style.karaokeColorR = interp(args[0].r);
        style.karaokeColorG = interp(args[0].g);
        style.karaokeColorB = interp(args[0].b);
      }
      else {
        style.karaokeColorR = style.baseStyle.karaokeColorR;
        style.karaokeColorG = style.baseStyle.karaokeColorG;
        style.karaokeColorB = style.baseStyle.karaokeColorB;
      }
      break;
    case "3c":
      if (args.length == 1) {
        style.outlineColorR = interp(args[0].r);
        style.outlineColorG = interp(args[0].g);
        style.outlineColorB = interp(args[0].b);
      }
      else {
        style.outlineColorR = style.baseStyle.outlineColorR;
        style.outlineColorG = style.baseStyle.outlineColorG;
        style.outlineColorB = style.baseStyle.outlineColorB;
      }
      break;
    case "4c":
      if (args.length == 1) {
        style.shadowColorR = interp(args[0].r);
        style.shadowColorG = interp(args[0].g);
        style.shadowColorB = interp(args[0].b);
      }
      else {
        style.shadowColorR = style.baseStyle.shadowColorR;
        style.shadowColorG = style.baseStyle.shadowColorG;
        style.shadowColorB = style.baseStyle.shadowColorB;
      }
      break;
    case "t":
      for (var i = 0; i < args[3].length; i++) {
        args[3][i].applyToAnimated(style, args[0], args[1], args[2]);
      }
    default:
      break;
  }
}

Ass.Dialogue.OverrideTag.prototype.applyToAnimated = function(style, startTime, endTime, power) {
  if (typeof(power) != "number") power = 1;
  var interp = function(originalValue, newValue) {return new Interpolating(originalValue, newValue, startTime, endTime, power)}; 
  var args = this.args;
  switch (this.type) {
    case "fs":
      if (args.length == 1) style.fontSize = interp(style.fontSize, args[0]);
      else style.fontSize = interp(style.fontSize, style.baseStyle.fontSize);
      break;
    case "fsp":
      if (args.length == 1) style.spacing = interp(style.spacing, args[0]);
      else style.spacing = interp(style.spacing, style.baseStyle.spacing);
      break;
    case "fscx":
      if (args.length == 1) style.scaleX = interp(style.scaleX, args[0] / 100.0);
      else style.scaleX = interp(style.scaleX, style.baseStyle.scaleX);
      break;
    case "fscy":
      if (args.length == 1) style.scaleY = interp(style.scaleY, args[0] / 100.0);
      else style.scaleY = interp(style.scaleY, style.baseStyle.scaleY);
      break;
    case "frx":
      if (args.length == 1) style.rotX = interp(style.rotX, args[0]);
      else style.rotX = interp(style.rotX, style.baseStyle.rotX);
      break;
    case "fry":
      if (args.length == 1) style.rotY = interp(style.rotY, args[0]);
      else style.rotY = interp(style.rotY, style.baseStyle.rotY);
      break;
    case "fr":
    case "frz":
      if (args.length == 1) style.rotZ = interp(style.rotZ, args[0]);
      else style.rotZ = interp(style.rotZ, style.baseStyle.rotZ);
      break;
    case "fax":
      if (args.length == 1) style.shearX = interp(style.shearX, args[0]);
      else style.shearX = interp(style.shearX, style.baseStyle.shearX);
      break;
    case "fay":
      if (args.length == 1) style.shearY = interp(style.shearY, args[0]);
      else style.shearY = interp(style.shearY, style.baseStyle.shearY);
      break;
    case "blur":
      if (args.length == 1) style.blur = interp(style.blur, args[0]);
      else style.blur = interp(style.blur, style.baseStyle.blur);
      break;
    case "bord":
      if (args.length == 1) {
        style.outlineX = interp(style.outlineX, args[0]);
        style.outlineY = interp(style.outlineY, args[0]);
      }
      else {
        style.outlineX = interp(style.outlineX, style.baseStyle.outlineX);
        style.outlineY = interp(style.outlineY, style.baseStyle.outlineY);
      }
      break;
    case "xbord":
      if (args.length == 1) style.outlineX = interp(style.outlineX, args[0]);
      else style.outlineX = interp(style.outlineX, style.baseStyle.outlineX);
      break;
    case "ybord":
      if (args.length == 1) style.outlineY = interp(style.outlineY, args[0]);
      else style.outlineY = interp(style.outlineY, style.baseStyle.outlineY);
      break;
    case "shad":
      if (args.length == 1) {
        style.shadowX = interp(style.shadowX, args[0]);
        style.shadowY = interp(style.shadowY, args[0]);
      }
      else {
        style.shadowX = interp(style.shadowX, style.baseStyle.shadowX);
        style.shadowY = interp(style.shadowY, style.baseStyle.shadowY);
      }
      break;
    case "xshad":
      if (args.length == 1) style.shadowX = interp(style.shadowX, args[0]);
      else style.shadowX = interp(style.shadowX, style.baseStyle.shadowX);
      break;
    case "yshad":
      if (args.length == 1) style.shadowY = interp(style.shadowY, args[0]);
      else style.shadowY = interp(style.shadowY, style.baseStyle.shadowY);
      break;
    case "c":
    case "1c":
      if (args.length == 1) {
        style.fillColorR = interp(style.fillColorR, args[0].r);
        style.fillColorG = interp(style.fillColorG, args[0].g);
        style.fillColorB = interp(style.fillColorB, args[0].b);
      }
      else {
        style.fillColorR = interp(style.fillColorR, style.baseStyle.fillColorR);
        style.fillColorG = interp(style.fillColorG, style.baseStyle.fillColorG);
        style.fillColorB = interp(style.fillColorB, style.baseStyle.fillColorB);
      }
      break;
    case "2c":
      if (args.length == 1) {
        style.karaokeColorR = interp(style.karaokeColorR, args[0].r);
        style.karaokeColorG = interp(style.karaokeColorG, args[0].g);
        style.karaokeColorB = interp(style.karaokeColorB, args[0].b);
      }
      else {
        style.karaokeColorR = interp(style.karaokeColorR, style.baseStyle.karaokeColorR);
        style.karaokeColorG = interp(style.karaokeColorG, style.baseStyle.karaokeColorG);
        style.karaokeColorB = interp(style.karaokeColorB, style.baseStyle.karaokeColorB);
      }
      break;
    case "3c":
      if (args.length == 1) {
        style.outlineColorR = interp(style.outlineColorR, args[0].r);
        style.outlineColorG = interp(style.outlineColorG, args[0].g);
        style.outlineColorB = interp(style.outlineColorB, args[0].b);
      }
      else {
        style.outlineColorR = interp(style.outlineColorR, style.baseStyle.outlineColorR);
        style.outlineColorG = interp(style.outlineColorG, style.baseStyle.outlineColorG);
        style.outlineColorB = interp(style.outlineColorB, style.baseStyle.outlineColorB);
      }
      break;
    case "4c":
      if (args.length == 1) {
        style.shadowColorR = interp(style.shadowColorR, args[0].r);
        style.shadowColorG = interp(style.shadowColorG, args[0].g);
        style.shadowColorB = interp(style.shadowColorB, args[0].b);
      }
      else {
        style.shadowColorR = interp(style.shadowColorR, style.baseStyle.shadowColorR);
        style.shadowColorG = interp(style.shadowColorG, style.baseStyle.shadowColorG);
        style.shadowColorB = interp(style.shadowColorB, style.baseStyle.shadowColorB);
      }
      break;
    case "alpha":
      if (args.length == 1) {
        style.fillColorA = interp(style.fillColorA, args[0].r);
        style.shadowColorA = interp(style.shadowColorA, args[0].r);
        style.outlineColorA = interp(style.outlineColorA, args[0].r);
        style.shadowColorA = interp(style.shadowColorA, args[0].r);
      }
      else {
        style.fillColorA = interp(style.fillColorA, style.baseStyle.fillColorA);
        style.karaokeColorA = interp(style.karaokeColorA, style.baseStyle.karaokeColorA);
        style.outlineColorA = interp(style.outlineColorA, style.baseStyle.outlineColorA);
        style.shadowColorA = interp(style.shadowColorA, style.baseStyle.shadowColorA);
      }
      break;
    case "1a":
      if (args.length == 1) style.fillColorA = interp(style.fillColorA, args[0].r);
      else style.fillColorA = interp(style.fillColorA, style.baseStyle.fillColorA);
      break;
    case "2a":
      if (args.length == 1) style.karaokeColorA = interp(style.karaokeColorA, args[0].r);
      else style.karaokeColorA = interp(style.karaokeColorA, style.baseStyle.karaokeColorA);
      break;
    case "3a":
      if (args.length == 1) style.outlineColorA = interp(style.outlineColorA, args[0].r);
      else style.outlineColorA = interp(style.outlineColorA, style.baseStyle.outlineColorA);
      break;
    case "4a":
      if (args.length == 1) style.shadowColorA = interp(style.shadowColorA, args[0].r);
      else style.shadowColorA = interp(style.shadowColorA, style.baseStyle.shadowColorA);
      break;
    default:
      break;
  }
}

Ass.Dialogue.OverrideTag.prototype.applyToGlobal = function(dialogue) {
  var args = this.args;
  switch (this.type) {
    case "pos":
      if (dialogue.pos.mode == "auto") {
        dialogue.pos.mode = "pos";
        dialogue.pos.x = args[0];
        dialogue.pos.y = args[1];
      }
      break;
    case "move":
      if (dialogue.pos.mode == "auto") {
        dialogue.pos.mode = "move";
        dialogue.pos.x1 = args[0];
        dialogue.pos.y1 = args[1];
        dialogue.pos.x2 = args[2];
        dialogue.pos.y2 = args[3];
        dialogue.pos.t1 = args[4];
        dialogue.pos.t2 = args[5];
      }
      break;
    case "fad":
      if (dialogue.fade.mode == "none") {
        dialogue.fade.mode = "simple";
        dialogue.fade.t1 = args[0];
        dialogue.fade.t2 = args[1];
      }
      break;
    case "fade":
      if (dialogue.fade.mode == "none") {
        dialogue.fade.mode = "complex";
        dialogue.fade.a1 = args[0];
        dialogue.fade.a2 = args[1];
        dialogue.fade.a3 = args[2];
        dialogue.fade.t1 = args[3];
        dialogue.fade.t2 = args[4];
        dialogue.fade.t3 = args[5];
        dialogue.fade.t4 = args[6];
      }
      break;
    case "an":
      if (parseInt(args[0]) > 0 && parseInt(args[0]) <= 9) {
        var alignmentNum = parseInt(args[0]);
        if (dialogue.alignmentH == null) dialogue.alignmentH = ["left", "center", "right"][(alignmentNum - 1) % 3];
        if (dialogue.alignmentV == null) dialogue.alignmentV = ["bottom", "center", "top"][Math.floor((alignmentNum - 1) / 3)];
      }
      break;
    case "org":
      if (dialogue.org.mode == "auto") {
        dialogue.org.mode = "fixed";
        dialogue.org.x = args[0];
        dialogue.org.y = args[1];
      }
    default:
      break;
  }
}

Ass.ScriptInfo = function() {
  this.playResX = 1280;
  this.playResY = 720;
  this.scaledBorderAndShadow = false;
  this.wrapStyle = 0;
  this.timingOffset = 0;
}

Ass.ScriptInfo.fromRaw = function(raw) {
  var si = new Ass.ScriptInfo();
  if (parseFloat(raw.PlayResX) != NaN) si.playResX = parseFloat(raw.PlayResX);
  if (parseFloat(raw.PlayResY) != NaN) si.playResY = parseFloat(raw.PlayResY);
  if (parseInt(raw.WrapStyle) >= 0 && parseInt(raw.WrapStyle) < 4) si.wrapStyle = parseInt(raw.WrapStyle);
  if (parseFloat(raw.TimingOffset) != NaN) si.timingOffset = parseFloat(raw.TimingOffset);
  si.scriptType = raw.ScriptType;
  return si;
}

Ass.AssStyle = function(parent) {
  if (typeof(parent) == "undefined") {
    parent = Ass.AssStyle.defaultStyle;
  }  
  return Object.create(parent);
}

Ass.AssStyle.fromParent = function(parent) {
  if (typeof(parent) == "undefined") {
    parent = Ass.AssStyle.defaultStyle;
  }  
  var style = Object.create(parent);
  style.baseStyle = parent;
  return style;
}

Ass.AssStyle.prototype.toCss = function(css, time) {
  if (typeof(time) != "number") time = 0;
  
  var rgba = function(r, g, b, a) {
    var colorString = "rgba(" + Math.round(r).toString();
    colorString += "," + Math.round(g).toString();
    colorString += "," + Math.round(b).toString();
    colorString += "," + (1 - a / 255.0).toString();
    return colorString + ")";
  }
  var px = function(num) { return num.toString() + "px"; };
  
  css.fontWeight = this.fontWeight.toString();
  css.fontStyle = this.italic ? "italic" : "normal";
  css.textDecoration = (this.strikeout ? "line-through" : "") + " " + (this.underline ? "underline" : "");
  css.fontFamily = this.fontName;
  css.fontSize = px(this.fontSize.get(time));
  css.letterSpacing = px(this.spacing.get(time));
  css.color = rgba(this.fillColorR.get(time), this.fillColorG.get(time), this.fillColorB.get(time), this.fillColorA.get(time));
}

Ass.AssStyle.Color = function(r, g, b, a) {
  if (typeof(r) != "number") r = 0;
  if (typeof(g) != "number") b = 0;
  if (typeof(b) != "number") g = 0;
  if (typeof(a) != "number") a = 0;
  this.r = r;
  this.g = g;
  this.b = b;
  this.a = a;
}

Ass.AssStyle.Color.fromHex = function(str) {
  if (typeof(str) != "string") return undefined;
  str = str.replace(/^\&H/i, "0x");
  num = parseInt(str);
  if (isNaN(num)) return undefined;
  color = new Ass.AssStyle.Color();
  color.r = num & 0xFF;
  color.g = num >> 8 & 0xFF;
  color.b = num >> 16 & 0xFF;
  color.a = num >> 24 & 0xFF;
  return color;
}

Ass.AssStyle.Color.prototype.toRgbaString = function() {
  colorString = "rgba(" + this.r.toString();
  colorString += "," + this.g.toString();
  colorString += "," + this.b.toString();
  colorString += "," + (1 - this.a / 255.0).toString();
  return colorString + ")";
}

Ass.AssStyle.defaultStyle = {
  name: "Default",
  baseStyle: null,
  
  fontName: "Arial",
  fontSize: new InterpolatingBase(24),
  fontWeight: 400,
  italic: false,
  underline: false,
  strikethrough: false,
  spacing: new InterpolatingBase(0),
  wrapMode: 1,
  
  fillColorR: new InterpolatingBase(255),
  fillColorG: new InterpolatingBase(255),
  fillColorB: new InterpolatingBase(255),
  fillColorA: new InterpolatingBase(0),
  
  karaokeColorR: new InterpolatingBase(255),
  karaokeColorG: new InterpolatingBase(255),
  karaokeColorB: new InterpolatingBase(255),
  karaokeColorA: new InterpolatingBase(0),
  
  outlineColorR: new InterpolatingBase(0),
  outlineColorG: new InterpolatingBase(0),
  outlineColorB: new InterpolatingBase(0),
  outlineColorA: new InterpolatingBase(0),
  
  shadowColorR: new InterpolatingBase(127),
  shadowColorG: new InterpolatingBase(127),
  shadowColorB: new InterpolatingBase(127),
  shadowColorA: new InterpolatingBase(0),

  borderStyle: 1,
  outlineX: new InterpolatingBase(4),
  outlineY: new InterpolatingBase(4),
  shadowX: new InterpolatingBase(4),
  shadowY: new InterpolatingBase(4),
  blur: new InterpolatingBase(0),
  
  alignmentV: "bottom",
  alignmentH: "center",
  marginL: 0,
  marginR: 0,
  marginV: 0,
  
  rotX: new InterpolatingBase(0),
  rotY: new InterpolatingBase(0),
  rotZ: new InterpolatingBase(0),
  scaleX: new InterpolatingBase(1),
  scaleY: new InterpolatingBase(1),
  shearX: new InterpolatingBase(1),
  shearY: new InterpolatingBase(1),
  
  toCss: Ass.AssStyle.prototype.toCss
}

Ass.AssStyle.fromRaw = function(raw) {
  var style = Ass.AssStyle.fromParent()
  var hexColorToRgba = Ass.util.hexColorToRgba;
 
  if (raw.Name == undefined) return;
  
  style.name = raw.Name;
  if (raw.Fontname != undefined) style.fontName = raw.Fontname;
  if (parseFloat(raw.Fontsize) != NaN) style.fontSize = new InterpolatingBase(parseFloat(raw.Fontsize));
  if (Ass.AssStyle.Color.fromHex(raw.PrimaryColour) != undefined) {
    var color = Ass.AssStyle.Color.fromHex(raw.PrimaryColour);
    style.fillColorR = new InterpolatingBase(color.r);
    style.fillColorG = new InterpolatingBase(color.g);
    style.fillColorB = new InterpolatingBase(color.b);
    style.fillColorA = new InterpolatingBase(color.a);
  }
  if (Ass.AssStyle.Color.fromHex(raw.SecondaryColour) != undefined) {
    var color = Ass.AssStyle.Color.fromHex(raw.SecondaryColour);
    style.karaokeColorR = new InterpolatingBase(color.r);
    style.karaokeColorG = new InterpolatingBase(color.g);
    style.karaokeColorB = new InterpolatingBase(color.b);
    style.karaokeColorA = new InterpolatingBase(color.a);
  }
  if (Ass.AssStyle.Color.fromHex(raw.TertiaryColour) != undefined) {
    var color = Ass.AssStyle.Color.fromHex(raw.TertiaryColour);
    style.outlineColorR = new InterpolatingBase(color.r);
    style.outlineColorG = new InterpolatingBase(color.g);
    style.outlineColorB = new InterpolatingBase(color.b);
    style.outlineColorA = new InterpolatingBase(color.a);
  }
  if (Ass.AssStyle.Color.fromHex(raw.OutlineColour) != undefined) {
    var color = Ass.AssStyle.Color.fromHex(raw.OutlineColour);
    style.outlineColorR = new InterpolatingBase(color.r);
    style.outlineColorG = new InterpolatingBase(color.g);
    style.outlineColorB = new InterpolatingBase(color.b);
    style.outlineColorA = new InterpolatingBase(color.a);
  }
  if (Ass.AssStyle.Color.fromHex(raw.BackColour) != undefined) {
    var color = Ass.AssStyle.Color.fromHex(raw.BackColour);
    style.shadowColorR = new InterpolatingBase(color.r);
    style.shadowColorG = new InterpolatingBase(color.g);
    style.shadowColorB = new InterpolatingBase(color.b);
    style.shadowColorA = new InterpolatingBase(color.a);
  }
  if (parseFloat(raw.Bold) == -1) style.fontWeight = 700;
  if (parseFloat(raw.Italic) == -1) style.italic = true;
  if (parseFloat(raw.Underline) == -1) style.underline = true;
  if (parseFloat(raw.Strikeout) == -1) style.strikethrough = true;
  if (parseFloat(raw.ScaleX) != NaN) style.scaleX = new InterpolatingBase(parseFloat(raw.ScaleX) / 100.0);
  if (parseFloat(raw.ScaleY) != NaN) style.scaleY = new InterpolatingBase(parseFloat(raw.ScaleY) / 100.0);
  if (parseFloat(raw.Spacing) != NaN) style.spacing = new InterpolatingBase(parseFloat(raw.Spacing));
  if (parseFloat(raw.Angle) != NaN) style.rotZ = new InterpolatingBase(parseFloat(raw.Angle));
  if (parseInt(raw.BorderStyle) == 1 || parseInt(raw.BorderStyle) == 3) style.borderStyle = parseInt(raw.BorderStyle);
  if (parseFloat(raw.Outline) != NaN) style.outlineX = style.outlineY = new InterpolatingBase(parseFloat(raw.Outline));
  if (parseFloat(raw.Shadow) != NaN) style.shadowX = style.shadowY = new InterpolatingBase(parseFloat(raw.Shadow));
  if (parseFloat(raw.MarginL) != NaN) style.marginL = parseFloat(raw.MarginL);
  if (parseFloat(raw.MarginR) != NaN) style.marginR = parseFloat(raw.MarginR);
  if (parseFloat(raw.MarginV) != NaN) style.marginV= parseFloat(raw.MarginV);
  if (parseInt(raw.Alignment) > 0 && parseInt(raw.Alignment) <= 9) {
    var alignment = parseInt(raw.Alignment);
    style.alignmentH = ["left", "center", "right"][(alignment - 1) % 3];
    style.alignmentV = ["bottom", "center", "top"][Math.floor((alignment - 1) / 3)];
  }
  
  return style;
}

CompileShadows = function() {
  var shadows = [];
  var formatShadow = function(x, y, blur, color, unit) {
    if (typeof(unit) != "string") unit = "px";
    return x.toString() + unit + " " + y.toString() + unit + " " + blur.toString() + unit + " " + color;
  } 
  var circleFill = function(r) {
    var points = [];
    var s = Math.ceil(r);
    for (var x = -s; x <= s; x++) for (var y = -s; y <= s; y++) {
      if (x * x + y * y <= r * r) points.push(point(x, y));
    }
    return points;
    function point(xp, yp) {
      var p = {};
      p.x = xp;
      p.y = yp;
      return p;
    }
  }
  
  function circleOutline(r) {
    var points = [];
    var error = -r;
    var x = r;
    var y = 0;
    while (x >= y) {
      plot8(x, y)
      error += y;
      y++;
      error += y;
      if (error >= 0) {
        error -= x;
        x--;
        error -= x;
      }
    }
    return points;
    function plot8(x8, y8) {
      plot4(x8, y8);
      if (x != y) plot4(y8, x8);
    }
    function plot4(x4, y4) {
      points.push(point(x4, y4));
      if (x != 0) points.push(point(-x4, y4));
      if (y != 0) points.push(point(x4, -y4));
      if (x != 0 && y != 0) points.push(point(-x4, -y4));
    }
    function point(xp, yp) {
      var p = {};
      p.x = xp;
      p.y = yp;
      return p;
    }
  }

  if ((this.outlineX == 0 && this.outlineY == 0)) {
    shadows.push(formatShadow(0, 0, this.blur, this.fill.toRgbString()));
    shadows.push(formatShadow(this.shadowX, this.shadowY, this.blur, this.shadow.toRgbString()));
  }
  else {
    shadows.push(formatShadow(0, 0, 0, this.fill.toRgbString()));
    var outline = [];
    var shadow = [];
    if (this.blur == 0) {
      var points = circleOutline(this.outlineX);
      for (var i = 0; i < points.length; i++) {
        outline.push(formatShadow(points[i].x, points[i].y, this.blur, this.outline.toRgbString()));
        shadow.push(formatShadow(points[i].x + this.shadowX, points[i].y + this.shadowY, this.blur, this.shadow.toRgbString()));
      }
    }
    else {
      /*for (var i = 0; i < this.outlineX; i++) {
        outline.push(formatShadow(0, 0, this.blur, this.outline.toRgbString()));
        shadow.push(formatShadow(this.shadowX, this.shadowY, this.blur, this.shadow.toRgbString()));
      }*/
      var points = circleOutline(this.outlineX);
      for (var i = 0; i < points.length; i++) {
        outline.push(formatShadow(points[i].x, points[i].y, this.blur, this.outline.toRgbString()));
        shadow.push(formatShadow(points[i].x + this.shadowX, points[i].y + this.shadowY, this.blur, this.shadow.toRgbString()));
      }
    }
    shadows.pushArray(outline);
    shadows.pushArray(shadow);
  }
  
  return shadows.join(",");
}

Ass.util = {}

Ass.util.hmsToSeconds = function(timeString) {
  var sp = timeString.split(':');
  var sec = 3600 * parseFloat(sp[0]);
  sec += 60 * parseFloat(sp[1]);
  sec += parseFloat(sp[2]);
  return sec;
}

Ass.util.hexColorToRgba = function(inputString) {
  if (typeof inputString === 'undefined') return "fail";
  var colorString = inputString.replace(/^\&H/i, "0x");
  var color = parseInt(colorString);
  if (isNaN(color)) return "fail";
  colorString = "rgba(" + String(color & 0xFF);
  colorString += "," + String(color >> 8 & 0xFF);
  colorString += "," + String(color >> 16 & 0xFF);
  colorString += "," + String(1 - (color >> 24 & 0xFF) / 255);
  colorString += ")";
  return colorString;
}

Ass.util.separateArguments = function(block) {
  if (block.length == 0) return [];
  args = [];
  if (block.startsWith("(")) {
    var parenthesesLevel = 0;
    var startIndex = 1;
    for (var i = 0; i < block.length; i++) {
      if (block.charAt(i) == ")") {
        parenthesesLevel -= 1;
        if (parenthesesLevel < 1) {
          break;
        }
      }
      else if (block.charAt(i) == "(") parenthesesLevel += 1;
      else if (parenthesesLevel > 1) continue;
      else if (block.charAt(i) == ",") {
        if (i - startIndex > 0) {
          args.push(block.slice(startIndex, i));
          startIndex = i + 1;
        }
      }  
    }
    args.push(block.slice(startIndex, i));
  }
  else {
    args.push(block);
  }
  return args;
}

Ass.util.randomString = function(length) {
  var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var result = '';
  for (var i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
  return result;
}

/*if (!String.prototype.startsWith) {
  Object.defineProperty(String.prototype, 'startsWith', {
    enumerable: false,
    configurable: false,
    writable: false,
    value: function (searchString, position) {
      position = position || 0;
      return this.lastIndexOf(searchString, position) === position;
    }
  });
}*/

if (!String.prototype.startsWith) {
  String.prototype.startsWith = function (searchString, position) {
      position = position || 0;
      return this.lastIndexOf(searchString, position) === position;
  };
}

Array.prototype.pushArray = function(arr) {
  for (var i = 0; i < arr.length; i++) {
    this.push(arr[i]);
  }
}

Array.prototype.duplicate = function() {
  var i = this.length
  var newArray = []
  while (i--) newArray[i] = this[i];
  return newArray;
}
