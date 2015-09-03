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

imageSvd.svdsToImageData = function (svds, numSvs, imageData) {
  var n = imageData.width, m = imageData.height;
  var redSvd = svds.red, greenSvd = svds.green, blueSvd = svds.blue;
  var k = redSvd.d;
  numSvs = Math.min(numSvs, k);
  var redU = redSvd.u, redVt = redSvd.vt, redS = redSvd.s;
  var greenU = greenSvd.u, greenVt = greenSvd.vt, greenS = greenSvd.s;
  var blueU = blueSvd.u, blueVt = blueSvd.vt, blueS = blueSvd.s;
  var data = imageData.data;

  var w = [];

  var i = 0;
  for (var y = 0; y < m; y++) {
    for (var x = 0; x < n; x++) {
      var r = 0, g = 0, b = 0;
      for (var d = numSvs - 1; d >= 0; d--) {
        r += redU[d*m+y] * redS[d] * redVt[x*k+d];
        g += greenU[d*m+y] * greenS[d] * greenVt[x*k+d];
        b += blueU[d*m+y] * blueS[d] * blueVt[x*k+d];
      }

      if (r === 0 && g === 0 && b === 0) {
        w.push({ x: x, y: y });
      }

      data[i] = r;
      data[i+1] = g;
      data[i+2] = b;
      data[i+3] = 255;
      i += 4;
    }
  }
};

function createZeroMatrix (m, n) {
  var mat = [];
  for (var y = 0; y < m; y++) {
    mat[y] = new Float32Array(n);
  }
  return mat;
}

imageSvd.svd = function (a, m, n) {
  var d = Math.max(m, n);
  var s = new Float32Array(d); // will contain the singular values
  var v = createZeroMatrix(d, d);

  var u = createZeroMatrix(d, d);
  for (var y = 0; y < m; y++) {
    for (var x = 0; x < n; x++) {
      u[y][x] = a[y][x];
    }
  }

  SVD.svdcmp(u, m, n, s, v);
  return { u: u, s: s, v: v };
};

/*
function svd (a, m, n) {
  var res = numeric.svd(a);
  return { u: res.U, s: res.S, v: res.V };
}
*/
