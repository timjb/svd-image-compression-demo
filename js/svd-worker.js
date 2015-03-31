var Module = { locateFile : function (file) { return "../build/" + file; } };
importScripts(['../build/clapack.js']);

this.onmessage = function (msg) {
  var svdObj = svd(msg.data.a, msg.data.m, msg.data.n);
  postMessage(svdObj); // TODO: use transferable objects to avoid copying
};

/*
function createZeroMatrix (m, n) {
  var mat = [];
  for (var y = 0; y < m; y++) {
    mat[y] = new Float32Array(n);
  }
  return mat;
}

function svd (a, m, n) {
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
*/

var svd_simple = Module.cwrap('svd_simple', 'number', ['number', 'number', 'number', 'number', 'number', 'number']);

function svd (a, m, n) {
  //console.log(typeof )
  var k = Math.min(m, n);
  var sizeof_double = 8;
  var buf = Module.HEAPU8.buffer;

  var ptr_a  = Module._malloc(m * n * sizeof_double);
  var arr_a  = new Float64Array(buf, ptr_a, m * n);
  var ptr_u  = Module._malloc(m * k * sizeof_double);
  var arr_u  = new Float64Array(buf, ptr_u, m * k);
  var ptr_s  = Module._malloc(k *     sizeof_double);
  var arr_s  = new Float64Array(buf, ptr_s, k);
  var ptr_vt = Module._malloc(k * n * sizeof_double);
  var arr_vt = new Float64Array(buf, ptr_vt, k * n);

  for (var i = 0; i < a.length; i++) {
    arr_a[i] = a[i];
  }
  //console.log(arr_a);

  var info = svd_simple(m, n, ptr_a, ptr_u, ptr_s, ptr_vt);
  console.log(info);

  // TODO

  return { u: arr_u, s: arr_s, vt: arr_vt };
}
