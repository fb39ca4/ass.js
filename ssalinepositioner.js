AssRenderer.CollisionResolver = function(width, height) {
  this.active = []
  this.inactive = []
  this.resH = width
  this.resV = height
}

AssRenderer.CollisionResolver.prototype.setResolution = function(width, height) {
  this.resH = width;
  this.resV = height;
}

AssRenderer.CollisionResolver.prototype.addLine = function(id, start, end, width, height, marginL, marginR, marginV, alignmentH, alignmentV) {
  var line = {};
  line.id = id;
  line.start = start;
  line.end = end;
  line.width = width;
  line.height = height;
  
  switch (alignmentV) {
    case "top": 
      line.posY = marginV;
      break;
    case "center":
      line.posY = (resV / 2) - (line.height / 2);
      break;
    case "bottom":
      line.posY = resV - marginV - line.height
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
      line.posX = resH - marginR - line.width
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
  
  for (var i = 0; i < this.active.length; i++) {
    if ( this.rectIntersect(line.posX, line.posY, line.width, line.height, this.active[i].posX, this.active[i].posY, this.active[i].width, this.active[i].height) ) {
      if (alignmentV == "bottom") {
        line.posY = this.activeY.posY - line.height;
      }
      else {
        line.posY = this.active[i].posY + this.active[i].height
      }
    }
  }
   
}

AssRenderer.CollisionResolver.prototype.rectIntersect = function(xa, ya, wa, ha, xb, yb, wb, hb) {
  xa1 = xa;
  xa2 = xa + wa;
  ya1 = ya;
  ya2 = ya + ha;
  xb1 = xb;
  xb2 = xb + wb;
  yb1 = yb;
  yb2 = yb + hb;
  
  c1 = xa1 < xb2;
  c2 = xa2 > xb1;
  c3 = ya1 < ya2;
  c4 = ya2 > yb1;
  
  return c1 && c2 && c3 && c4;
}

AssRenderer.CollisionResolver.prototype.results = function() {
  for (var i = 0; i < this.active.length; i++) {
    this.inactive.push(this.active.splice(i, 1)[0])
    i--;
  }
  return this.inactive; 
}

Ass.util.optimizeWidth = function(e, numIterations) {
  if(typeof(numIterations)!='number') numIterations = 16;
  var setWidth = function(w) {e.style.maxWidth = (w + 1).toString() + "px";}
  
  var max = e.offsetHeight;
  var currentWidth = e.offsetWidth;
  setWidth(0);
  if (e.offsetHeight <= max) {
    setWidth(currentWidth);
    return;
  }
  else setWidth(currentWidth);
 
  var stepSize = Math.ceil(currentWidth / 2);

  for (var i = 0; i < numIterations; i++) {
    setWidth(currentWidth - stepSize);
    console.log(i, e.offsetHeight, currentWidth, stepSize);
    if (e.offsetHeight > max) {
      setWidth(currentWidth);
    }
    else {
      currentWidth = currentWidth - stepSize;
    }
    if (stepSize < 2) {
      break;
    }
    stepSize = Math.ceil(stepSize / 2);
  }
  setWidth(currentWidth);
  return currentWidth;
}