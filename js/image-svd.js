"use strict";

var imageSvd = (typeof exports === 'undefined') ? {} : exports;
var SVD = (typeof require === 'function') ? require('./svd') : SVD;

imageSvd.imageDataToPixels = function (imageData) {
  var w = imageData.width, h = imageData.height;
  var red = [], green = [], blue = [], alpha = [];
  var i = 0;
  for (var y = 0; y < h; y++) {
    var redRow = [], greenRow = [], blueRow = [], alphaRow = [];
    for (var x = 0; x < w; x++) {
      redRow[x] = imageData.data[i++];
      greenRow[x] = imageData.data[i++];
      blueRow[x] = imageData.data[i++];
      alphaRow[x] = imageData.data[i++];
    }
    red[y] = redRow;
    green[y] = greenRow;
    blue[y] = blueRow;
    alpha[y] = alphaRow;
  }
  return { red: red, green: green, blue: blue, alpha: alpha };
};

imageSvd.svdsToImageData = function (svds, numSvs, imageData) {
  var w = imageData.width, h = imageData.height;
  var redSvd = svds.red, greenSvd = svds.green, blueSvd = svds.blue;
  var redU = redSvd.u, redV = redSvd.v, redS = redSvd.s;
  var greenU = greenSvd.u, greenV = greenSvd.v, greenS = greenSvd.s;
  var blueU = blueSvd.u, blueV = blueSvd.v, blueS = blueSvd.s;

  var i = 0;
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var r = 0, g = 0, b = 0;
      for (var k = 0; k < numSvs; k++) {
        r += redV[x][k] * redS[k] * redU[y][k];
        g += greenV[x][k] * greenS[k] * greenU[y][k];
        b += blueV[x][k] * blueS[k] * blueU[y][k];
      }

      imageData.data[i] = r;
      imageData.data[i+1] = g;
      imageData.data[i+2] = b;
      imageData.data[i+3] = 255;
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
