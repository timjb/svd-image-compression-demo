"use strict";

var imageSvd = (typeof exports === 'undefined') ? {} : exports;
var SVD = (typeof require === 'function') ? require('./svd') : SVD;

imageSvd.imageDataToPixels = function (imageData) {
  var n = imageData.width, m = imageData.height;
  var red   = new Float64Array(m*n);
  var green = new Float64Array(m*n);
  var blue  = new Float64Array(m*n);
  var i = 0;
  for (var y = 0; y < m; y++) {
    for (var x = 0; x < n; x++) {
      var q = x*m + y;
      red[q]   = imageData.data[i];
      green[q] = imageData.data[i+1];
      blue[q]  = imageData.data[i+2];
      i += 4; // skip alpha value
    }
  }
  return { red: red, green: green, blue: blue };
};

// updates the image data to include (f=1) or exclude (f=-1)
// svs in range [l, u)
imageSvd.svdsToImageData = function (svds, imageData, l, u, f) {
  var n = imageData.width, m = imageData.height;
  var redSvd = svds.red, greenSvd = svds.green, blueSvd = svds.blue;
  var d = redSvd.d;
  u = Math.min(u, d);
  var redU = redSvd.u, redVt = redSvd.vt, redS = redSvd.s;
  var greenU = greenSvd.u, greenVt = greenSvd.vt, greenS = greenSvd.s;
  var blueU = blueSvd.u, blueVt = blueSvd.vt, blueS = blueSvd.s;
  var data = imageData.data;

  var i = 0;
  for (var y = 0; y < m; y++) {
    for (var x = 0; x < n; x++) {
      var r = 0, g = 0, b = 0;
      for (var k = u - 1; k >= l; k--) {
        r += redU[k*m+y] * redS[k] * redVt[x*d+k];
        g += greenU[k*m+y] * greenS[k] * greenVt[x*d+k];
        b += blueU[k*m+y] * blueS[k] * blueVt[x*d+k];
      }

      data[i]   += f*r;
      data[i+1] += f*g;
      data[i+2] += f*b;
      i += 4;
    }
  }
};
