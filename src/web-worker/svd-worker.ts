/* eslint-disable @typescript-eslint/camelcase */

/// <reference types="emscripten" />

import protocol = require('../shared/svd-worker-protocol');

self.importScripts('../build/clapack.js');

let input: null | {
  a: Float64Array;
  m: number;
  n: number;
} = null;

console.log("worker started!");

type ptr = number;

const svd_simple: (m: number, n: number, A: ptr, U: ptr, S: ptr, Vt: ptr) => number =
  Module.cwrap('svd_simple', 'number', ['number', 'number', 'number', 'number', 'number', 'number']);
const svd_simple_approx: (m: number, n: number, t: number, A: ptr, U: ptr, S: ptr, Vt: ptr) => number =
  Module.cwrap('svd_simple_approx', 'number', ['number', 'number', 'number', 'number', 'number', 'number', 'number']);

function svd (a: Float64Array, m: number, n: number, approx: boolean): void {
  const d = approx ? Math.min(Math.min(m, n), 50) : Math.min(m, n);
  const sizeof_double = 8;
  const buf = Module.HEAPU8.buffer;

  const ptr_a  = Module._malloc(m * n * sizeof_double);
  const arr_a  = new Float64Array(buf, ptr_a, m * n);
  const ptr_u  = Module._malloc(m * d * sizeof_double);
  const arr_u  = new Float64Array(buf, ptr_u, m * d);
  const ptr_s  = Module._malloc(d *     sizeof_double);
  const arr_s  = new Float64Array(buf, ptr_s, d);
  const ptr_vt = Module._malloc(d * n * sizeof_double);
  const arr_vt = new Float64Array(buf, ptr_vt, d * n);

  for (let i = 0; i < a.length; i++) { arr_a[i] = a[i]; }

  const timerName = "svd" + (Math.round(Math.random() * 100)) + " approx:" + (approx ? "yes" : "no");
  console.time(timerName);
  if (approx) {
    svd_simple_approx(m, n, d, ptr_a, ptr_u, ptr_s, ptr_vt);
  } else {
    svd_simple(m, n, ptr_a, ptr_u, ptr_s, ptr_vt);
  }
  console.timeEnd(timerName);

  const svd: protocol.WorkerRes = { u: arr_u, s: arr_s, vt: arr_vt, d: d, m: m, n: n };
  postMessage(svd);

  Module._free(ptr_a);
  Module._free(ptr_u);
  Module._free(ptr_s);
  Module._free(ptr_vt);
}

onmessage = (event: MessageEvent): void => {
  const data = event.data as protocol.WorkerReq;
  if (data.msg === "set-input") {
    input = { a: new Float64Array(data.a), m: data.m, n: data.n };
  } else if (data.msg === "compute-svd") {
    if (!input) { throw new Error('set-input must come first!'); }
    svd(input.a, input.m, input.n, data.approx);
  } else {
    throw new Error('unrecognized command!');
  }
};