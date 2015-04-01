importScripts(['../build/clapack.js']);

this.onmessage = function (msg) {
  if (msg.data.approx) {
    svdApprox(msg.data.a, msg.data.m, msg.data.n);
  } else {
    svd(msg.data.a, msg.data.m, msg.data.n);
  }
};

var svd_simple = Module.cwrap('svd_simple', 'number', ['number', 'number', 'number', 'number', 'number', 'number']);
var svd_simple_approx = Module.cwrap('svd_simple_approx', 'number', ['number', 'number', 'number', 'number', 'number', 'number', 'number']);

function svdApprox (a, m, n) {
  var k = Math.min(m, n);
  var t = Math.min(k, 50);
  var sizeof_double = 8;
  var buf = Module.HEAPU8.buffer;

  var ptr_a  = Module._malloc(m * n * sizeof_double);
  var arr_a  = new Float64Array(buf, ptr_a, m * n);
  var ptr_u  = Module._malloc(m * t * sizeof_double);
  var arr_u  = new Float64Array(buf, ptr_u, m * t);
  var ptr_s  = Module._malloc(t *     sizeof_double);
  var arr_s  = new Float64Array(buf, ptr_s, t);
  var ptr_vt = Module._malloc(t * n * sizeof_double);
  var arr_vt = new Float64Array(buf, ptr_vt, t * n);

  for (var i = 0; i < a.length; i++) { arr_a[i] = a[i]; }

  console.log(arr_a);

  var timerName = "svd_simple_approx" + (Math.round(Math.random() * 100));
  console.time(timerName);
  svd_simple_approx(m, n, t, ptr_a, ptr_u, ptr_s, ptr_vt);
  console.timeEnd(timerName);

  postMessage({ u: arr_u, s: arr_s, vt: arr_vt, d: t });

  Module._free(ptr_a);
  Module._free(ptr_u);
  Module._free(ptr_s);
  Module._free(ptr_vt);
}

function svd (a, m, n) {
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

  for (var i = 0; i < a.length; i++) { arr_a[i] = a[i]; }

  var timerName = "svd_simple" + (Math.round(Math.random() * 100));
  console.time(timerName);
  svd_simple(m, n, ptr_a, ptr_u, ptr_s, ptr_vt);
  console.timeEnd(timerName);

  postMessage({ u: arr_u, s: arr_s, vt: arr_vt, d: k });

  Module._free(ptr_a);
  Module._free(ptr_u);
  Module._free(ptr_s);
  Module._free(ptr_vt);
}
