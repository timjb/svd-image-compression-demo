var Module = { locateFile : function (file) { return "../SVDLIBC/build/" + file; } };
importScripts(['../SVDLIBC/build/svdlibc.js']);

this.onmessage = function (msg) {
  postMessage(svd(msg.data.a, msg.data.m, msg.data.n));
};

var createDMat = Module.cwrap('createDMat', 'number', ['number', 'number', 'number']);
var svdConvertDtoS = Module.cwrap('svdConvertDtoS', 'number', ['number']);
var svdFreeSMat = Module.cwrap('svdFreeSMat', 'number', ['number']);
var svdLAS2A = Module.cwrap('svdLAS2A', 'number', ['number', 'number']);
var dmatGetRows = Module.cwrap('dmatGetRows', 'number', ['number']);
var dmatGetCols = Module.cwrap('dmatGetCols', 'number', ['number']);
var dmatGetValue = Module.cwrap('dmatGetValue', 'number', ['number']);
var svdrecGetD  = Module.cwrap('svdrecGetD', 'number', ['number']);
var svdrecGetUt = Module.cwrap('svdrecGetUt', 'number', ['number']);
var svdrecGetS  = Module.cwrap('svdrecGetS', 'number', ['number']);
var svdrecGetVt = Module.cwrap('svdrecGetVt', 'number', ['number']);
var svdFreeSVDRec = Module.cwrap('svdFreeSVDRec', 'number', ['number'])

function transposeMatrixFromDMat (dmat) {
  var rows = dmatGetRows(dmat);
  var cols = dmatGetCols(dmat);
  var value = dmatGetValue(dmat);
  var matrix = [];

  for (var x = 0; x < cols; x++) {
    matrix[x] = new Float64Array(rows);
  }

  for (var y = 0; y < rows; y++) {
    var row = getValue(value + y*8, '*');
    for (var x = 0; x < cols; x++) {
      matrix[x][y] = getValue(row + x*8, 'double');
    }
  }
  return matrix;
}

function svd (a, m, n) {
  var dataPtr = Module._malloc(8*m*n);
  var dataHeap = new Float64Array(Module.HEAPU8.buffer, dataPtr, m*n);

  for (var y = 0; y < m; y++) {
    for (var x = 0; x < n; x++) {
      dataHeap[y*n+x] = a[y][x];
    }
  }

  var dMat = createDMat(dataPtr, m, n);
  var sMat = svdConvertDtoS(dMat);

  var svdStruct = svdLAS2A(sMat, 0);

  var ut = transposeMatrixFromDMat(svdrecGetUt(svdStruct));
  var vt = transposeMatrixFromDMat(svdrecGetVt(svdStruct));

  var d = svdrecGetD(svdStruct);
  var sPtr = svdrecGetS(svdStruct);

  var s = new Float64Array(d);
  for (var i = 0; i < d; i++) {
    s[i] = getValue(sPtr + i*8, 'double');
  }

  Module._free(dataPtr);
  Module._free(dMat);
  svdFreeSMat(sMat);
  svdFreeSVDRec(svdStruct);

  return { d: d, u: ut, s: s, v: vt };
}