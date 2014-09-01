AssRenderer = function() {
  this.assData = new Ass();
  this.events = [];
  
  this.resetCount = 0;
  this.seekQueued = false;
  
  this.css = {}
  this.css.identifier = "ass-js_" + Ass.util.randomString(8);
  var styleElement = document.createElement("style");
  styleElement.type = "text/css";
  styleElement.title = this.css.identifier;
  document.head.appendChild(styleElement);
  for (var i = 0; i < document.styleSheets.length; i++) {
    this.css.styleSheet = document.styleSheets[i];
    if (this.css.styleSheet.title == this.css.identifier) {
      this.css.styleSheetNumber = i;
      break;
    }
  }
  var percentages = [0, 100];
  var keyFrames = this.createKeyFramesRule(this.css.identifier + "_timing", percentages);
  keyFrames[0].visibility = "visible";
  keyFrames[1].visibility = "visible";
}

AssRenderer.prototype.setupCss = function() {
  if (this.css) {
    this.css.styleSheet.parentNode.removeChild(this.css.styleSheet);
  }
  this.css = {}
  this.css.identifier = "ass-js_" + Ass.util.randomString(8);
  var styleElement = document.createElement("style");
  styleElement.type = "text/css";
  styleElement.title = this.css.identifier;
  document.head.appendChild(styleElement);
  for (var i = 0; i < document.styleSheets.length; i++) {
    this.css.styleSheet = document.styleSheets[i];
    if (this.css.styleSheet.title == this.css.identifier) {
      this.css.styleSheetNumber = i;
      break;
    }
  }
  var percentages = [0, 100];
  var keyFrames = this.createKeyFramesRule(this.css.identifier + "_timing", percentages);
  keyFrames[0].visibility = "visible";
  keyFrames[1].visibility = "visible";
}

var testDiv;
AssRenderer.prototype.generateHTML = function() {
  this.setupCss;
  this.events = [];
  for (var i = 0; i < this.assData.dialogue.length; i++) {
    var event = {};
    event.ass = this.assData.dialogue[i];
    event.startTime = event.ass.startTime + this.assData.scriptInfo.timingOffset;
    event.endTime = event.ass.endTime + this.assData.scriptInfo.timingOffset;
    event.duration = event.endTime - event.startTime;
    if (event.duration != 0) this.events.push(event);
  }
  var sortFunction = function(a, b) {
    if (a.startTime == b.startTime) return a.ass.lineNumber - b.ass.lineNumber;
    else return a.startTime - b.startTime;
  };
  this.events.sort(sortFunction);
  
  
  testDiv = document.createElement("div");
  testDiv.style.width = this.assData.scriptInfo.playResX.toString() + "px";
  testDiv.style.height = this.assData.scriptInfo.playResY.toString() + "px";
  testDiv.style.zIndex = "20000";
  testDiv.style.position = "fixed";
  testDiv.style.top = "0px";
  testDiv.style.left = "0px";
  testDiv.style.borderStyle = "solid";
  testDiv.style.borderWidth = "1px";
  testDiv.style.borderColor = "lime";
  testDiv.style.animationPlayState = "paused";
  testDiv.style.animationDuration = "2s";
  testDiv.style.animationFillMode = "";
  testDiv.style.animationTimingFunction = "linear";
  testDiv.style.animationDelay = "0s";
  testDiv.style.pointerEvents = "none";
  testDiv.style.visibility = "hidden";
  
  document.body.appendChild(testDiv);
  
  for (var i = 0; i < this.events.length; i++) {
    var event = this.events[i];
    
    event.animationIdentifier = this.css.identifier + "_line" + event.ass.lineNumber.toString();
    var textDiv = document.createElement("div");
    event.html = textDiv;
    for (var j = 0; j < event.ass.styledText.length; j++) {
      var textSegment = event.ass.styledText[j];
      var span = document.createElement("span");
      span.innerHTML = textSegment.text;
      //textSegment.style.toCss(span.style);
      textDiv.appendChild(span);
      AssRenderer.setAnimationInherit(span);
      this.generateSpanCSS(textSegment.style, span, this.css.styleSheet, event.duration, event.animationIdentifier + "_span" + j.toString());      
    }
    AssRenderer.setAnimationInherit(textDiv);
    textDiv.style.textAlign = event.ass.alignmentH;
    textDiv.style.position = "absolute";
    textDiv.style.maxWidth = (this.assData.scriptInfo.playResX - event.ass.marginL - event.ass.marginR).toString() + "px";
    
    testDiv.appendChild(textDiv);
    AssRenderer.optimizeWidth(textDiv);
    event.width = textDiv.offsetWidth;
    event.height = textDiv.offsetHeight;
    testDiv.removeChild(textDiv);
    
  }
  
  var collisionSolvers = [];
  this.collisionSolvers = collisionSolvers;
  var activeLayers = [];
  for (var i = 0; i < this.events.length; i++) {
    var event = this.events[i];
    if (event.ass.pos.mode != "auto") continue;
    if (typeof(collisionSolvers[event.ass.layer]) == "undefined") {
      collisionSolvers[event.ass.layer] = new AssRenderer.CollisionSolver(this.assData.scriptInfo.playResX, this.assData.scriptInfo.playResY);
      activeLayers.push(event.ass.layer);
    }
    collisionSolvers[event.ass.layer].addLine(i, event.startTime, event.endTime, event.width, event.height, event.ass.marginL, event.ass.marginR, event.ass.marginV, event.ass.alignmentH, event.ass.alignmentV, event.ass.lineNumber);
  }
  
  for (var i = 0; i < activeLayers.length; i++) {
    var collisionSolver = collisionSolvers[activeLayers[i]];
    var results = collisionSolver.results();
    for (var j = 0; j < results.length; j++) {
      var event = this.events[results[j].id];
      event.posX = results[j].posX;
      event.posY = results[j].posY;
      //event.html.style.left = event.posX.toString() + "px";
      //event.html.style.top = event.posY.toString() + "px";
    }
  }
  
  for (var i = 0; i < this.events.length; i++) {
    var event = this.events[i];
    
    if (event.ass.fade.mode != "none") {
      var fadeDiv = event.html;
      var newDiv = document.createElement("div");
      AssRenderer.setAnimationInherit(fadeDiv);
      AssRenderer.setAnimationInherit(newDiv);
      newDiv.appendChild(fadeDiv);
      event.html = newDiv;
      
      if (event.ass.fade.mode == "simple") {
        var percentages = [0, null, null, 100];
        percentages[1] = 100 * event.ass.fade.t1 / event.duration;
        percentages[2] = 100 * (event.duration - event.ass.fade.t2) / event.duration;
        var keyFrames = this.createKeyFramesRule(event.animationIdentifier + "_fade", percentages);
        keyFrames[0].opacity = (event.ass.fade.t1 != 0) ? "0" : "1";
        keyFrames[1].opacity = "1";
        keyFrames[2].opacity = "1";
        keyFrames[3].opacity = (event.ass.fade.t2 != 0) ? "0" : "1";
        AssRenderer.setAnimationName(fadeDiv, event.animationIdentifier + "_fade");
        fadeDiv.style.opacity = "0";
      }
      else if (event.ass.fade.mode == "complex") {
        var assToCssOpacity = function(a) { return (1.0 - (a / 255)).toString(); };
        var percentages = [0, null, null, null, null, 100];
        percentages[1] = 100 * event.ass.fade.t1 / event.duration;
        percentages[2] = 100 * event.ass.fade.t2 / event.duration;
        percentages[3] = 100 * event.ass.fade.t3 / event.duration;
        percentages[4] = 100 * event.ass.fade.t4 / event.duration;
        var keyFrames = this.createKeyFramesRule(event.animationIdentifier + "_fade", percentages);
        keyFrames[0].opacity = assToCssOpacity(event.ass.fade.a1);
        keyFrames[1].opacity = assToCssOpacity(event.ass.fade.a1);
        keyFrames[2].opacity = assToCssOpacity(event.ass.fade.a2);
        keyFrames[3].opacity = assToCssOpacity(event.ass.fade.a2);
        keyFrames[4].opacity = assToCssOpacity(event.ass.fade.a3);
        keyFrames[5].opacity = assToCssOpacity(event.ass.fade.a3);
        AssRenderer.setAnimationName(fadeDiv, event.animationIdentifier + "_fade");
        fadeDiv.style.opacity = "0";
      }
      /*else {
        var percentages = [0, 100];
        var keyFrames = this.createKeyFramesRule(event.animationIdentifier + "_fade", percentages);
        keyFrames[0].opacity = "1";
        keyFrames[1].opacity = "1";
        fadeDiv.style.animationName = event.animationIdentifier + "_fade";
      }*/
    }
    
    var innerDiv = event.html;
    var outerDiv = document.createElement("div");
    outerDiv.appendChild(innerDiv);
    outerDiv.style.position = "absolute";
    AssRenderer.setAnimationInherit(outerDiv);
    AssRenderer.setAnimationInherit(innerDiv);
    event.html = outerDiv;
    
    var rotateDiv;
    var posDiv;
    if (event.ass.org.mode == "auto") {
      rotateDiv = innerDiv;
      posDiv = outerDiv;
      rotateDiv.style.transformOrigin = event.ass.alignmentV + " " + event.ass.alignmentH;
    }
    else {
      rotateDiv = outerDiv;
      posDiv = innerDiv;
      rotateDiv.style.transformOrigin = event.ass.org.x.toString() + "px " + event.ass.org.y.toString() + "px";
    }
    if (event.ass.pos.mode == "auto") {
      posDiv.style.position = "absolute";
      posDiv.style.left = event.posX.toString() + "px";
      posDiv.style.top = event.posY.toString() + "px";
    }
    else if (event.ass.pos.mode == "pos") {
      var alignToPercent = {left:0.0, center:0.5, right:1.0, top:0.0, middle:0.5, bottom:1.0}
      var offsetX = event.width * alignToPercent[event.ass.alignmentH];
      var offsetY = event.height * alignToPercent[event.ass.alignmentV];
      
      posDiv.style.position = "absolute";
      posDiv.style.left = (event.ass.pos.x - offsetX).toString() + "px";
      posDiv.style.top = (event.ass.pos.y - offsetY).toString() + "px";
    }
    else if (event.ass.pos.mode == "move") {
      var alignToPercent = {left:0.0, center:0.5, right:1.0, top:0.0, middle:0.5, bottom:1.0}
      var offsetX = event.width * alignToPercent[event.ass.alignmentH];
      var offsetY = event.height * alignToPercent[event.ass.alignmentV];
      var percentages = [0];
      var t1 = false;
      var t2 = false;
      if ((typeof(event.ass.pos.t1) == "number")) {
        if (event.ass.pos.t1 > 0 && event.ass.pos.t1 < event.duration) {
          percentages.push(100 * event.ass.pos.t1 / event.duration);
          t1 = true;
        }
      }
      if ((typeof(event.ass.pos.t2) == "number")) {
        if (event.ass.pos.t2 > 0 && event.ass.pos.t2 < event.duration) {
          percentages.push(100 * event.ass.pos.t2 / event.duration);
          t2 = true;
        }
      }
      percentages.push(100);
      var keyFrames = this.createKeyFramesRule(event.animationIdentifier + "_move", percentages);
      
      keyFrames[0].marginLeft =  (event.ass.pos.x1 - offsetX).toString() + "px";
      keyFrames[0].marginTop = (event.ass.pos.y1 - offsetY).toString() + "px";
      keyFrames[keyFrames.length - 1].marginLeft = (event.ass.pos.x2 - offsetX).toString() + "px";
      keyFrames[keyFrames.length - 1].marginTop = (event.ass.pos.y2 - offsetY).toString() + "px";
      /*keyFrames[0].transform = "translate(" + (event.ass.pos.x1 - offsetX).toString() + "px, " + (event.ass.pos.y1 - offsetY).toString() + "px)";
      keyFrames[keyFrames.length - 1].transform = "translate(" + (event.ass.pos.x2 - offsetX).toString() + "px, " + (event.ass.pos.y2 - offsetY).toString() + "px)";*/
      
      if (t1) {
        keyFrames[1].marginLeft = keyFrames[0].marginLeft;
        keyFrames[1].marginTop = keyFrames[0].marginTop;
        /*keyFrames[1].translate = keyFrames[0].translate;*/
      }
      if (t2) {
        keyFrames[keyFrames.length - 2].marginLeft = keyFrames[keyFrames.length - 1].marginLeft;
        keyFrames[keyFrames.length - 2].marginTop = keyFrames[keyFrames.length - 1].marginTop;
        /*keyFrames[keyFrames.length - 2].translate = keyFrames[keyFrames.length - 1].translate;*/
      }
      posDiv.style.position = "absolute";
      AssRenderer.setAnimationName(posDiv, event.animationIdentifier + "_move");
    }
    this.generateTransformCSS(event.ass, rotateDiv, event.duration, event.animationIdentifier + "_transform");
    rotateDiv.style.width = event.width.toString() + "px";
    rotateDiv.style.height = event.height.toString() + "px";
    
    
    var timingDiv = document.createElement("div");
    AssRenderer.setAnimationInherit(timingDiv);
    timingDiv.appendChild(event.html);
    AssRenderer.setAnimationName(timingDiv, this.css.identifier + "_timing");
    AssRenderer.setAnimationDuration(timingDiv, event.duration);
    timingDiv.style.visibility = "hidden";
    timingDiv.style.pointerEvents = "auto";
    event.html = timingDiv;
    
    //event.html.addEventListener("animationend", function(){console.log(event.animationIdentifier)}, false);
    //testDiv.appendChild(event.html);
  }
  testDiv.parentNode.removeChild(testDiv);
}

AssRenderer.prototype.generateSpanCSS = function(assStyle, span, cssSheet, duration, keyFramesIdentifier) {
  var inlineStyle = span.style;
  var usingKeyFrames = false;
  var keyFrames = []
  var numKeyFrames = 10;
  var setupKeyFrames = function() {
    if (usingKeyFrames == true) return;
    usingKeyFrames = true;
    var percentages = [];
    for (var i = 0; i <= numKeyFrames; i++) {
      percentages.push(100 * i / numKeyFrames);
    }
    keyFrames = this.createKeyFramesRule(keyFramesIdentifier, percentages);
  }.bind(this);
  setupKeyFrames();
  //console.log(keyFrames);
  
  var rgba = function(r, g, b, a) {
    var colorString = "rgba(" + Math.round(r).toString();
    colorString += "," + Math.round(g).toString();
    colorString += "," + Math.round(b).toString();
    colorString += "," + (1 - a / 255.0).toString();
    return colorString + ")";
  }
  var px = function(num) { return num.toString() + "px"; };
  var s = function(num) { return num.toString() + "s"; };
  
  
  for (var i = 0; i <= numKeyFrames; i++) {
    var currentTime = duration * i / numKeyFrames;
    var t = currentTime;
    
    var cssStyle = keyFrames[i];
    cssStyle.fontSize = px(assStyle.fontSize.get(t) * 0.8);
    cssStyle.letterSpacing = px(assStyle.spacing.get(t));
    cssStyle.color = rgba(assStyle.fillColorR.get(t), assStyle.fillColorG.get(t), assStyle.fillColorB.get(t), assStyle.fillColorA.get(t));
    cssStyle.textShadow = AssRenderer.textShadows(assStyle, t);
    
  }
  inlineStyle.fontWeight = assStyle.fontWeight.toString();
  inlineStyle.fontStyle = assStyle.italic ? "italic" : "normal";
  inlineStyle.textDecoration = (assStyle.strikeout ? "line-through" : "") + " " + (assStyle.underline ? "underline" : "");
  inlineStyle.fontFamily = assStyle.fontName + ",Arial, sans-serif";
  
  AssRenderer.setAnimationInherit(span);
  AssRenderer.setAnimationName(span, keyFramesIdentifier);
}

AssRenderer.prototype.generateTransformCSS = function(dialogue, div, duration, keyFramesIdentifier) {
  var assStyle = dialogue.firstStyle;
  var inlineStyle = div.style;
  
  var usingKeyFrames = false;
  var keyFrames = []
  var numKeyFrames = 10;
  var setupKeyFrames = function() {
    if (usingKeyFrames == true) return;
    usingKeyFrames = true;
    var percentages = [];
    for (var i = 0; i <= numKeyFrames; i++) {
      percentages.push(100 * i / numKeyFrames);
    }
    keyFrames = this.createKeyFramesRule(keyFramesIdentifier, percentages);
  }.bind(this);
  setupKeyFrames();
  //console.log(keyFrames);
  
  var px = function(num) { return num.toString() + "px"; };
  var s = function(num) { return num.toString() + "s"; };
  var deg = function(num) { return num.toString() + "deg"; };
  
  for (var i = 0; i <= numKeyFrames; i++) {
    var currentTime = duration * i / numKeyFrames;
    var t = currentTime;
    
    var cssStyle = keyFrames[i];
    var transform = "perspective(500px) " + "rotateY(" + assStyle.rotY.get(t) + "deg) rotateX(" + assStyle.rotX.get(t) + "deg) rotateZ(" + (-assStyle.rotZ.get(t)) + "deg)"
    cssStyle.transform = transform;
    
  }
  AssRenderer.setAnimationName(div, keyFramesIdentifier);
}

if (navigator.userAgent.indexOf("Trident") != -1) {
  AssRenderer.textShadows = function(style, t) {
    var rgba = function(r, g, b, a) {
      var colorString = "rgba(" + Math.round(r).toString();
      colorString += "," + Math.round(g).toString();
      colorString += "," + Math.round(b).toString();
      colorString += "," + (1 - a / 255.0).toString();
      return colorString + ")";
    }
    var formatShadow = function(x, y, blur, spread, color, unit) {
      if (typeof(unit) != "string") unit = "px";
      return x.toString().substring(0,5) + unit + " " + y.toString().substring(0,5) + unit + " " + blur.toString() + unit + " " + (spread * 2).toString() + unit + " " + color;
    } 
    var fillColor = rgba(style.fillColorR.get(t), style.fillColorG.get(t), style.fillColorB.get(t), style.fillColorA.get(t));
    var outlineColor = rgba(style.outlineColorR.get(t), style.outlineColorG.get(t), style.outlineColorB.get(t), style.outlineColorA.get(t));
    var shadowColor = rgba(style.shadowColorR.get(t), style.shadowColorG.get(t), style.shadowColorB.get(t), style.shadowColorA.get(t));
    var bord = (style.outlineX.get(t) + style.outlineY.get(t)) / 2;
    var blur = style.blur.get(t) * 2;
    var shadX = style.shadowX.get(t);
    var shadY = style.shadowY.get(t);
    var shadows = [];
    if (bord <= 0) {
      //shadows.push(formatShadow(0, 0, blur, 0, fillColor, px));
      shadows.push(formatShadow(0, 0, 0, 0, rgba(0,0,0,255), "px"));
      shadows.push(formatShadow(shadX, shadY, blur, 0, shadowColor, "px"));
    }
    else {
      //shadows.push(formatShadow(0, 0, 0, 0, fillColor, px));
      shadows.push(formatShadow(0, 0, blur, bord, outlineColor, "px"));
      shadows.push(formatShadow(shadX, shadY, blur, bord, shadowColor, "px"));    
    }
    return shadows.join(",");
  }
}

else {
  AssRenderer.textShadows = function(style, t) {
    var rgba = function(r, g, b, a) {
      var colorString = "rgba(" + Math.round(r).toString();
      colorString += "," + Math.round(g).toString();
      colorString += "," + Math.round(b).toString();
      colorString += "," + (1 - a / 255.0).toString();
      return colorString + ")";
    }
    var formatShadow = function(x, y, blur, color, unit) {
      if (typeof(unit) != "string") unit = "px";
      return x.toString() + unit + " " + y.toString() + unit + " " + blur.toString() + unit + " " + color;
    } 
    var fillColor = rgba(style.fillColorR.get(t), style.fillColorG.get(t), style.fillColorB.get(t), style.fillColorA.get(t));
    var outlineColor = rgba(style.outlineColorR.get(t), style.outlineColorG.get(t), style.outlineColorB.get(t), style.outlineColorA.get(t));
    var shadowColor = rgba(style.shadowColorR.get(t), style.shadowColorG.get(t), style.shadowColorB.get(t), style.shadowColorA.get(t));
    var bord = (style.outlineX.get(t) + style.outlineY.get(t)) / 2;
    var bordX = style.outlineX.get(t);
    var bordY = style.outlineY.get(t);
    var blur = style.blur.get(t) * 2;
    var shadX = style.shadowX.get(t);
    var shadY = style.shadowY.get(t);
    var shadows = [];
    if (bord <= 0) {
      //shadows.push(formatShadow(0, 0, blur, 0, fillColor, px));
      shadows.push(formatShadow(shadX, shadY, blur, 0, shadowColor, "px"));
    }
    else {
      //shadows.push(formatShadow(0, 0, 0, 0, fillColor, px));
      var o = AssRenderer.textShadows.outlineOffsets;
      for (var i = 0; i < o.length; i++) shadows.push(formatShadow(o[i].x * bordX, o[i].y * bordY, blur, outlineColor, "px"));
      for (var i = 0; i < o.length; i++) shadows.push(formatShadow(shadX + o[i].x * bordX, shadY + o[i].y * bordY, blur, shadowColor, "px"));    
    }
    return shadows.join(",");
  }
  AssRenderer.textShadows.generateOutlineOffsets = function() {
    AssRenderer.textShadows.outlineOffsets = [];
    for (var i = 0; i < Math.PI * 2; i += Math.PI / 6) {
      AssRenderer.textShadows.outlineOffsets.push({x: Math.round(Math.cos(i) * 1000) / 1000, y: Math.round(Math.sin(i) * 1000) / 1000});
    }
  }
  AssRenderer.textShadows.generateOutlineOffsets();
}

AssRenderer.optimizeWidth = function(e, numIterations) {
  var setWidth = function(w) {e.style.width = (w + 1).toString() + "px";}
  e.style.height = "";
  e.style.width = "";
  var max = e.offsetHeight;
  var currentWidth = e.offsetWidth;
  setWidth(0);
  if (e.offsetHeight <= max) {
    setWidth(currentWidth);
    return;
  }
  else setWidth(currentWidth);
 
  var stepSize = Math.ceil(currentWidth / 2);
  
  if (typeof(numIterations) != 'number') numIterations = 16;
  for (var i = 0; i < numIterations; i++) {
    setWidth(currentWidth - stepSize);
    if (e.offsetHeight > max) {
      setWidth(currentWidth);
    }
    else {
      currentWidth = currentWidth - stepSize;
    }
    if (stepSize < 2) {
      
    //console.log(i, e.offsetWidth, e.offsetHeight, currentWidth, stepSize);
      break;
    }
    stepSize = Math.ceil(stepSize / 2);
    
    //console.log(i, e.offsetWidth, e.offsetHeight, currentWidth, stepSize);
  }
  setWidth(currentWidth);
  e.style.width = e.style.width;
  //e.style.height = max.toString() + "px";
  return currentWidth;
}

AssRenderer.CollisionSolver = function(width, height) {
  this.active = []
  this.inactive = []
  this.resH = width
  this.resV = height
}

AssRenderer.CollisionSolver.prototype.addLine = function(id, start, end, width, height, marginL, marginR, marginV, alignmentH, alignmentV, lineNumber) {
  var line = {};
  line.id = id;
  line.start = start;
  line.end = end;
  line.width = width;
  line.height = height;
  line.marginL = marginL;
  line.marginR = marginR;
  line.marginV = marginV;
  line.alignmentH = alignmentH;
  line.alignmentV = alignmentV;
  
  var resH = this.resH;
  var resV = this.resV;
  
  switch (alignmentV) {
    case "top": 
      line.posY = marginV;
      break;
    case "center":
      line.posY = (resV / 2) - (line.height / 2);
      break;
    case "bottom":
      line.posY = resV - marginV - line.height;
      break;
    default:
      line.posY = 0;
      break;
  }
      
  switch (alignmentH) {
    case "left": 
      line.posX = marginL;
      break;
    case "center":
      line.posX = (resH / 2) - (line.width / 2);
      break;
    case "right":
      line.posX = resH - marginR - line.width;
      break;
    default:
      line.posX = 0;
      break;
  }
  
  for (var i = 0; i < this.active.length; i++) {
    if (line.start >= this.active[i].end) {
      this.inactive.push(this.active.splice(i, 1)[0])
      i--;
    }
  }
  
  var testPositions = [line.posY];
  for (var i = 0; i < this.active.length; i++) {
    if (alignmentV == "bottom") {
      var pos = this.active[i].posY - line.height;
      if (pos < line.posY) testPositions.push(pos);
    }
    else {
      var pos = this.active[i].posY + this.active[i].height;
      if (pos > line.posY) testPositions.push(pos);
    }
  }
  if (alignmentV == "bottom") testPositions.sort(function(a, b) {return b - a});
  else  testPositions.sort(function(a, b) {return a - b});
  for (var i = 0; i < testPositions.length; i++) {
    line.posY = testPositions[i];
    var collision = false;
    for (var j = 0; j < this.active.length; j++) {
      if ( this.rectIntersect(line.posX, line.posY, line.width, line.height, this.active[j].posX, this.active[j].posY, this.active[j].width, this.active[j].height) ) {
        collision = true;
        break;
      }
    }
    if (collision == false) break;
  }

  
  this.active.push(line);
   
}

/*AssRenderer.prototype.createKeyFramesRule = function(name, percentages) {
  var cssRuleIndex = this.css.styleSheet.cssRules.length;
  this.css.styleSheet.insertRule("@keyframes " + name + " {}", cssRuleIndex);
  keyFrames = [];
  var keyFramesRule = this.css.styleSheet.cssRules[cssRuleIndex];
  for (var i = 0; i < percentages.length; i++) {
    keyFramesRule.appendRule((Math.round(percentages[i])).toString() + "% {}");
    keyFrames.push(keyFramesRule.cssRules[i].style);
  }
  return keyFrames;
}*/

AssRenderer.prototype.createKeyFramesRule = function(name, percentages) {  
  var cssRuleIndex = this.css.styleSheet.cssRules.length;
  var keyFramesText = [];
  for (var i = 0; i < percentages.length; i++) {
    keyFramesText.push((Math.round(percentages[i])).toString() + "% {}");
  }
  var keyFramesSelector = (navigator.userAgent.toLowerCase().indexOf("webkit") != -1) ? "@-webkit-keyframes " : "@keyframes ";
  this.css.styleSheet.insertRule(keyFramesSelector + name + " { " + keyFramesText.join(" ") + " }", cssRuleIndex);
  var keyFramesRule = this.css.styleSheet.cssRules[cssRuleIndex];
  var keyFrames = [];
  for (var i = 0; i < percentages.length; i++) {
    keyFrames.push(keyFramesRule.cssRules[i].style);
  }
  
  return keyFrames;
}

AssRenderer.CollisionSolver.prototype.rectIntersect = function(xa, ya, wa, ha, xb, yb, wb, hb) {
  var xa1 = xa;
  var xa2 = xa + wa;
  var ya1 = ya;
  var ya2 = ya + ha;
  var xb1 = xb;
  var xb2 = xb + wb;
  var yb1 = yb;
  var yb2 = yb + hb;
  
  var c1 = xa1 < xb2;
  var c2 = xa2 > xb1;
  var c3 = ya1 < yb2;
  var c4 = ya2 > yb1;
  
  var intersect = c1 && c2 && c3 && c4;
  
  return intersect;
}

AssRenderer.CollisionSolver.prototype.results = function() {
  for (var i = 0; i < this.active.length; i++) {
    this.inactive.push(this.active.splice(i, 1)[0])
    i--;
  }
  return this.inactive; 
}

AssRenderer.setAnimationInherit = function(element) {
  var i = "inherit";
  element.style.animationDuration = i;
  element.style.animationTimingFunction="inherit";
  element.style.animationFillMode="inherit";
  element.style.animationDelay="inherit";
  element.style.animationPlayState="inherit";
  
  element.style.webkitAnimationDuration = i;
  element.style.webkitAnimationTimingFunction="inherit";
  element.style.webkitAnimationFillMode="inherit";
  element.style.webkitAnimationDelay="inherit";
  element.style.webkitAnimationPlayState="inherit";
}

AssRenderer.setAnimationName = function(element, name) {
  element.style.animationName = name;
  element.style.webkitAnimationName = name;
}

AssRenderer.setAnimationDuration = function(element, duration) {
  var s = duration.toString() + "s";
  element.style.animationDuration = s;
  element.style.webkitAnimationDuration = s;
}

AssRenderer.prototype.setVideoElement = function(element) {
  this.videoElement = element;
  this.videoElement.addEventListener("playing", function(){console.log("playing"); this.play();}.bind(this), false);
  this.videoElement.addEventListener("seeked", function(){console.log("seeked"); if (this.videoElement.paused == true) this.seek()}.bind(this), false);
  this.videoElement.addEventListener("onload", function(){console.log("onload"); this.seek()}.bind(this), false);
  //this.video.addEventListener("seeked", function(){this.resetCache(this.video.currentTime);}.bind(this), false);
  //this.video.addEventListener("onload", function(){this.resetCache(this.video.currentTime);}.bind(this), false);
  this.videoElement.addEventListener("pause", function(){console.log("pause"); this.pause()}.bind(this), false);
  if (this.videoElement.paused == false) this.seek();
}

AssRenderer.prototype.setSubtitleDiv = function(element) {
  this.subtitleDiv = element;
  element.style.position = "absolute";
  element.style.width = this.assData.scriptInfo.playResX.toString() + "px";
  element.style.height = this.assData.scriptInfo.playResY.toString() + "px";
  element.style.left = "50%";
  element.style.top = "50%";
  //element.style.border = "1px solid red";
  //element.style.backgroundColor = "rgba(255,255,255,0.5)";
  element.style.animationTimingFunction = "linear";
  element.style.webkitAnimationTimingFunction = "linear";
  element.style.pointerEvents = "none";
  element.parentNode.style.overflow = "hidden";
  this.scaleSubtitleDiv();
}

AssRenderer.prototype.scaleSubtitleDiv = function() {
  var computedStyle = window.getComputedStyle(this.subtitleDiv.parentNode);
  var scaleX = parseFloat(computedStyle.width) / this.assData.scriptInfo.playResX;
  var scaleY = parseFloat(computedStyle.height) / this.assData.scriptInfo.playResY;
  var scale = Math.min(scaleX, scaleY);
  var transform = "translate(-50%, -50%) scale(" + scale.toString() + ", " + scale.toString() + ")";
  this.subtitleDiv.style.transform = transform;
}

AssRenderer.prototype.seek = function() {
  this.resetCount++;
  this.seekQueued = false;
  while (this.subtitleDiv.firstChild) this.subtitleDiv.removeChild(this.subtitleDiv.firstChild);
  
  var i;
  for (i = 0; i < this.events.length; i++) {
    if (this.events[i].startTime < this.videoElement.currentTime && this.events[i].endTime > this.videoElement.currentTime) {
      this.displayEvent(i, this.resetCount);
      break;
    }
    else if (this.events[i].endTime > this.videoElement.currentTime) {
      setTimeout(function() {
        this.displayEvent(i, this.resetCount);
      }.bind(this), 1000 * Math.max(0, this.events[i].startTime - this.videoElement.currentTime), false);
      break;
    }
  }
}

AssRenderer.prototype.scheduleSeekOld = function() {
  if (this.seekQueued == true) return;
  this.seekQueued = true;
  setTimeout(function(){this.seek()}.bind(this), 0, false);
}

AssRenderer.prototype.pause = function() {
  this.subtitleDiv.style.animationPlayState = "paused";
  this.subtitleDiv.style.webkitAnimationPlayState = "paused";
  this.resetCount++;
}

AssRenderer.prototype.play = function() {
  this.subtitleDiv.style.animationPlayState = "running";
  this.subtitleDiv.style.webkitAnimationPlayState = "running";
  this.seek();
}

AssRenderer.prototype.displayEvent = function(i, resetCount) {
  function secondsToHMS(time) {
    var hours = Math.floor(time / 3600);
    time -= hours * 3600;
    var minutes = Math.floor(time / 60);
    time -= minutes * 60;
    var seconds = Math.floor(time);
    time -= seconds;
    var hundredths = Math.floor(time * 100);
    return String(hours) + ':' + ('00' + String(minutes)).slice(-2) + ':' + ('00' + String(seconds)).slice(-2) + "." + ('00' + String(hundredths)).slice(-2)
  }
  
  if (resetCount != this.resetCount) return;
  
  var event = this.events[i];
  if (event.html.parentNode) event.html.parentNode.removeChild(event.html);
  AssRenderer.setAnimationDuration(event.html, event.duration);
  var animationDelay = (event.startTime - this.videoElement.currentTime).toString() + "s";
  event.html.style.animationDelay = animationDelay;
  event.html.style.webkitAnimationDelay = animationDelay;
  this.subtitleDiv.appendChild(event.html);
  setTimeout(function() {this.removeEvent(i, resetCount)}.bind(this), 1000 * Math.max(0, event.duration), false);
  
  console.log("Line " + event.ass.lineNumber.toString() + ": " + secondsToHMS(event.startTime) + " at " + secondsToHMS(this.videoElement.currentTime) + ' ("' + event.ass.plainText + '")');
  
  if (i + 1 >= this.events.length) return;
  if (this.events[i + 1].startTime > this.videoElement.currentTime) {
    if (this.videoElement.paused == true) return;
    setTimeout(function() {
      this.displayEvent(i + 1, resetCount);
    }.bind(this), 1000 * Math.max(0, this.events[i + 1].startTime - this.videoElement.currentTime), false);
  }
  else this.displayEvent(i + 1, resetCount);
  
}

AssRenderer.prototype.removeEvent = function(i, resetCount) {
  if (resetCount != this.resetCount) return;
  
  var event = this.events[i];
  if (event.html.parentNode) event.html.parentNode.removeChild(event.html);
}

AssRenderer.prototype.searchRule = function(name) {
  for (var i = 0; i < this.css.styleSheet.cssRules.length; i++) {
    if (this.css.styleSheet.cssRules[i].name.indexOf(name) != -1) console.log(this.css.styleSheet.cssRules[i]);
  }
}

AssRenderer.prototype.getLine = function(number) {
  for (var i = 0; i < this.events.length; i++) {
    if (this.events[i].ass.lineNumber == number) return this.events[i];
  }
}

AssRenderer.generateSvg = function(points) {
  
}
