navigator.getUserMedia  = navigator.getUserMedia ||
                          navigator.webkitGetUserMedia ||
                          navigator.mozGetUserMedia ||
                          navigator.msGetUserMedia;

function log(msg) { console.log(msg) }

var preview, overlay, g;
function init() {
  preview = document.getElementById("preview");
  overlay = document.getElementById("overlay");
  g = overlay.getContext("2d");

  getRearCameraId(startCameraPreview, log);
}

function getRearCameraId(success, fail) {
  MediaStreamTrack.getSources(function(sourceinfos) {
    for (var i = 0; i < sourceinfos.length; i++) {
      var sourceinfo = sourceinfos[i];
      if (sourceinfo.kind === 'video' && sourceinfo.facing === 'environment') {
        success(sourceinfo.id);
        return;
      }
    }
    fail("couldn't find a rear camera");
    alert("couldn't find a rear camera. use a smartphone!");
  });
}

function startCameraPreview(videoSourceId) {
  var constraints = {
    video: {
      mandatory: {
//        minWidth: 1280,
//        minHeight: 720,
      },
      optional: [{sourceId: videoSourceId}]
    }
  };

  navigator.getUserMedia(
      constraints,
      function(stream) {
        preview.src = window.URL.createObjectURL(stream);

        preview.onloadedmetadata = function() {
          // Stretch video to fill height of window
          // huge performance hit.
          // preview.height = window.innerHeight;

          w = preview.videoWidth;
          h = preview.videoHeight;

          // Set canvas to the same size as the preview
          overlay.width = w;
          overlay.height = h;

          bwBuffer = new Uint8Array(w * h);

          firstBlackPixelIndexInRows = new Uint32Array(h);
          contourDiffsInRows = new Uint32Array(w * h);
          numberOfContourDiffsInRows = new Uint32Array(h);

          firstBlackPixelIndexInColumns = new Uint32Array(w);
          contourDiffsInColumns = new Uint32Array(h * w);
          numberOfContourDiffsInColumns = new Uint32Array(w);

          window.requestAnimationFrame(render);
        };
      },
      function(err) {
        console.log(err);
      });
}

var histogram = new Uint8Array(256);
function clearArray(arr, val) {
  for (var i = 0; i < arr.length; i++) {
    arr[i] = val;
  }
};

var lastTimes = [];
var w, h,
    bwBuffer,
    firstBlackPixelIndexInRows, contourDiffsInRows, numberOfContourDiffsInRows,
    firstBlackPixelIndexInColumns, contourDiffsInColumns, numberOfContourDiffsInColumns;
function render(time) {

  var qrtags = [];

  g.clearRect(0, 0, w, h);
  g.drawImage(preview, 0, 0, w, h);

  var imageData = g.getImageData(0, 0, w, h);
  var pixelBuffer = new Uint8Array(imageData.data.buffer);

  clearArray(histogram, 0);
  // first pass: a luminance histogram
  for (var i = 0; i < pixelBuffer.length; i += 4) {
    var red = pixelBuffer[i],
        green = pixelBuffer[i + 1],
        blue = pixelBuffer[i + 2];

    var luminance = Math.round(0.3*red + 0.59*green + 0.11*blue);
    histogram[luminance]++;
  }

  var threshold = otsu(histogram, pixelBuffer.length / 4) / 2;

  //console.time("binarize");
  clearArray(bwBuffer, 0);
  clearArray(firstBlackPixelIndexInRows, 0);
  clearArray(contourDiffsInRows, 0);
  clearArray(numberOfContourDiffsInRows, 0);
  // second pass: find if each pixel's luminance passes the otsu threshold
  // also detect contours and save the diffs between them
  for (var y = 0; y < h; y++) {

    var lastContour = -1;
    var lastContourColor = -1;
    var nextAvailableContourIndex = 0;

    for (var x = 0; x < w; x++) {

      var i = index(x, y, w) * 4;
      var luminance = pixelBuffer[i];
      var pixelColor;

      if (luminance > threshold) {
        // pixel is white
        pixelColor = 1;
        bwBuffer[i / 4] = pixelColor;
      } else {
        // pixel is black
        pixelColor = 0;
        if (lastContour < 0) {
          // this is the first black pixel
          firstBlackPixelIndexInRows[y] = x;
          lastContour = x;
          lastContourColor = pixelColor;
        }
      }

      if (lastContour != -1 && pixelColor != lastContourColor) {
        // found a pixel that's different from our last known contour
        var contourDiff = x - lastContour;
        var indexIntoContourBuffer = index(nextAvailableContourIndex, y, w);
        contourDiffsInRows[indexIntoContourBuffer] = contourDiff;
        nextAvailableContourIndex++;
        numberOfContourDiffsInRows[y]++;

        lastContour = x;
        lastContourColor = pixelColor;
      }

//      Draw binary image to the canvas
//      var color = pixelColor == 1 ? 255 : 0;
//      pixelBuffer[i] = color;
//      pixelBuffer[i + 1] = color;
//      pixelBuffer[i + 2] = color;
    }
  }

  clearArray(firstBlackPixelIndexInColumns, 0);
  clearArray(contourDiffsInColumns, 0);
  clearArray(numberOfContourDiffsInColumns, 0);
  // third pass: same as the last pass, but scanning vertically
  for (var x = 0; x < w; x++) {

    var lastContour = -1;
    var lastContourColor = -1;
    var nextAvailableContourIndex = 0;

    for (var y = 0; y < h; y++) {

      var i = index(x, y, w) * 4;
      var luminance = pixelBuffer[i];
      var pixelColor;

      if (luminance > threshold) {
        // pixel is white
        pixelColor = 1;
      } else {
        // pixel is black
        pixelColor = 0;
        if (lastContour < 0) {
          // this is the first black pixel
          firstBlackPixelIndexInColumns[x] = y;
          lastContour = y;
          lastContourColor = pixelColor;
        }
      }

      if (lastContour != -1 && pixelColor != lastContourColor) {
        // found a pixel that's different from our last known contour
        var contourDiff = y - lastContour;
        var indexIntoContourBuffer = indexV(x, nextAvailableContourIndex, h);
        contourDiffsInColumns[indexIntoContourBuffer] = contourDiff;
        nextAvailableContourIndex++;
        numberOfContourDiffsInColumns[x]++;

        lastContour = y;
        lastContourColor = pixelColor;
      }
    }
  }

  //console.timeEnd("binarize");

  g.putImageData(imageData, 0, 0);
  // Force imageData to be GC'd
  // Not sure if this works
  imageData = null;
  pixelBuffer = null;

  //console.time("findqr");
  // fourth pass: look through contour diffs for 1:1:3:1:1
  for (var y = 0; y < h; y++) {
    var patternStartX = firstBlackPixelIndexInRows[y];
    for (var ix = 4; ix < numberOfContourDiffsInRows[y]; ix += 2) {
      var indexIntoContourBufferX = index(ix - 4, y, w);

      var oneX = contourDiffsInRows[indexIntoContourBufferX];
      var twoX = contourDiffsInRows[++indexIntoContourBufferX];
      var threeX = contourDiffsInRows[++indexIntoContourBufferX];
      var fourX = contourDiffsInRows[++indexIntoContourBufferX];
      var fiveX = contourDiffsInRows[++indexIntoContourBufferX];

      if (isFinderPatternRatio(oneX, twoX, threeX, fourX, fiveX)) {
        var patternEndX = patternStartX + oneX + twoX + threeX + fourX + fiveX;
        // now here I gotta look vertically
        var patternMiddleX = patternStartX + oneX + twoX + Math.round(threeX / 2);

        var patternStartY = firstBlackPixelIndexInColumns[patternMiddleX];
        for (var iy = 4; iy < numberOfContourDiffsInColumns[patternMiddleX]; iy += 2) {
          var indexIntoContourBufferY = indexV(patternMiddleX, iy - 4, h);

          var oneY = contourDiffsInColumns[indexIntoContourBufferY];
          var twoY = contourDiffsInColumns[++indexIntoContourBufferY];
          var threeY = contourDiffsInColumns[++indexIntoContourBufferY];
          var fourY = contourDiffsInColumns[++indexIntoContourBufferY];
          var fiveY = contourDiffsInColumns[++indexIntoContourBufferY];

          if (y > (patternStartY + oneY + twoY) && y < (patternStartY + oneY + twoY + threeY)
              && isFinderPatternRatio(oneY, twoY, threeY, fourY, fiveY)) {
            var patternEndY = patternStartY + oneY + twoY + threeY + fourY + fiveY;
            var patternMiddleY = patternStartY + oneY + twoY + Math.round(threeY / 2);

            var patternStartX2 = firstBlackPixelIndexInRows[patternMiddleY];
            for (var ix2 = 4; ix2 < numberOfContourDiffsInRows[patternMiddleY]; ix2 +=2) {
              var indexIntoContourBufferX2 = index(ix2 - 4, patternMiddleY, w);

              var oneX2 = contourDiffsInRows[indexIntoContourBufferX2];
              var twoX2 = contourDiffsInRows[++indexIntoContourBufferX2];
              var threeX2 = contourDiffsInRows[++indexIntoContourBufferX2];
              var fourX2 = contourDiffsInRows[++indexIntoContourBufferX2];
              var fiveX2 = contourDiffsInRows[++indexIntoContourBufferX2];

              if (patternMiddleX > (patternStartX2 + oneX2 + twoX2)
                  && patternMiddleX < (patternStartX2 + oneX2 + twoX2 + threeX2)
                  && isFinderPatternRatio(oneX2, twoX2, threeX2, fourX2, fiveX2)) {
                var patternEndX2 = patternStartX2 + oneX2 + twoX2 + threeX2 + fourX2 + fiveX2;
                var patternMiddleX2 = patternStartX2 + oneX2 + twoX2 + Math.round(threeX2 / 2);

                if (qrtags.length == 0) {
//                  qrtags.push(new qrtag(
//                        patternMiddleX, patternMiddleY,
//                        patternEndX2 - patternStartX2, patternEndY - patternStartY));

                  drawVerticalLine(patternMiddleX, patternStartY, patternEndY);
                  drawHorizontalLine(patternMiddleY, patternStartX2, patternEndX2);
                } else {
//                  for (var q = 0; q < qrtags.length; q++) {
//                    var knownTag = qrtags[q];
//                    var knownTagStartX = knownTag.x - knownTag.width / 2;
//                    var knownTagEndX = knownTagStartX + knownTag.width;
//                    var knownTagStartY = knownTag.y - knownTag.height / 2;
//                    var knownTagEndY = knownTagStartY + knownTag.height;
//
//                    if (!((patternStartX2 > knownTagStartX && patternStartX2 < knownTagEndX)
//                          || (patternEndX2 > knownTagStartX && patternEndX2 < knownTagEndX))
//                        || !((patternStartY > knownTagStartY && patternStartY < knownTagEndY)
//                          || (patternEndY > knownTagStartY && patternEndY < knownTagEndY))) {
//
//                      qrtags.push(new qrtag(
//                            patternMiddleX, patternMiddleY,
//                            patternEndX2 - patternStartX2, patternEndY - patternStartY));
//
//                      drawVerticalLine(patternMiddleX, patternStartY, patternEndY);
//                      drawHorizontalLine(patternMiddleY, patternStartX2, patternEndX2);
//                    }
//                  }
                }
              }

              patternStartX2 += oneX2 + twoX2;
            }
          }

          patternStartY += oneY + twoY;
        }
      }

      patternStartX += oneX + twoX;
    }
  }
  //console.timeEnd("findqr");

  lastTimes.unshift(time);
  if (lastTimes.length > 30) {
    lastTimes.pop();
  }

  var totalTime = 0;
  for (var i = 1; i < lastTimes.length; i++) {
    totalTime += (lastTimes[i - 1] - lastTimes[i]);
  }
  var avgTime = totalTime / (lastTimes.length - 1);

  g.font = "30px sans-serif";
  g.fillStyle = "orange";
  g.fillText(Math.round(1000 / avgTime), 10, 30);

  console.log(qrtags);

  window.requestAnimationFrame(render);
}

var lowerbound = 0.80, upperbound = 1.20;
function isFinderPatternRatio(one, two, three, four, five) {
  var outeraverage = (one + two + four + five) / 4;
  var innerestimate = outeraverage * 3;

  var outerlower = outeraverage * lowerbound;
  var outerupper = outeraverage * upperbound;
  if ((three > innerestimate * lowerbound && three < innerestimate * upperbound)
      && (one > outerlower && one < outerupper)
      && (two > outerlower && two < outerupper)
      && (four > outerlower && four < outerupper)
      && (five > outerlower && five < outerupper)) {
    return true;
  } else {
    return false;
  }
}

// Returns an index into a flat packed pixel buffer
function index(x, y, w) {
  return y * w + x;
}

// Same as index, but for a vertically oriented buffer
function indexV(x, y, h) {
  return x * h + y;
}

function otsu(histogram, total) {
  var threshold;

  var sum = 0;
  for (var i = 1; i < 256; ++i)
    sum += i * histogram[i];

  var variance = 0;
  var bestVariance = -9999999;

  var meanBg = 0;
  var weightBg = 0;

  var meanFg = sum / total;
  var weightFg = total;

  var diffMeans = 0;

  var t = 0;
  while (t < 256) {
    diffMeans = meanFg - meanBg;
    variance = weightBg * weightFg * diffMeans * diffMeans;

    if (variance > bestVariance) {
      bestVariance = variance;
      threshold = t;
    }

    while (t < 256 && histogram[t] == 0) {
      t++;
    }

    meanBg = (meanBg * weightBg + histogram[t] * t) / (weightBg + histogram[t]);
    meanFg = (meanFg * weightFg - histogram[t] * t) / (weightFg - histogram[t]);
    weightBg += histogram[t];
    weightFg -= histogram[t];
    t++;
  }

  return threshold;
}

function qrtag(x, y, width, height) {
  this.x = x;
  this.y = y;
  this.width = width;
  this.height = height;
}

function drawHorizontalLine(y, x1, x2) {
  g.strokeStyle = "#ff0000";
  g.beginPath();
  g.moveTo(x1, y);
  g.lineTo(x2, y);
  g.stroke();
}

function drawVerticalLine(x, y1, y2) {
  g.strokeStyle = "#ff0000";
  g.beginPath();
  g.moveTo(x, y1);
  g.lineTo(x, y2);
  g.stroke();
}
