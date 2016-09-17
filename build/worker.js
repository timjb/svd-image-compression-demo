/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports) {

	/// <reference path="../typings/globals/emscripten/index.d.ts" />
	/// <reference path="../node_modules/typescript/lib/lib.webworker.d.ts" />
	"use strict";
	importScripts('../build/clapack.js');
	var input = null;
	this.onmessage = function (msg) {
	    var data = msg.data;
	    if (data.msg === "set-input") {
	        input = { a: new Float64Array(data.a), m: data.m, n: data.n };
	    }
	    else if (data.msg === "compute-svd") {
	        if (!input) {
	            throw new Error('set-input must come first!');
	        }
	        svd(input.a, input.m, input.n, data.approx);
	    }
	    else {
	        throw new Error('unrecognized command!');
	    }
	};
	var svd_simple = Module.cwrap('svd_simple', 'number', ['number', 'number', 'number', 'number', 'number', 'number']);
	var svd_simple_approx = Module.cwrap('svd_simple_approx', 'number', ['number', 'number', 'number', 'number', 'number', 'number', 'number']);
	function svd(a, m, n, approx) {
	    var d = approx ? Math.min(Math.min(m, n), 50) : Math.min(m, n);
	    var sizeof_double = 8;
	    var buf = Module.HEAPU8.buffer;
	    var ptr_a = Module._malloc(m * n * sizeof_double);
	    var arr_a = new Float64Array(buf, ptr_a, m * n);
	    var ptr_u = Module._malloc(m * d * sizeof_double);
	    var arr_u = new Float64Array(buf, ptr_u, m * d);
	    var ptr_s = Module._malloc(d * sizeof_double);
	    var arr_s = new Float64Array(buf, ptr_s, d);
	    var ptr_vt = Module._malloc(d * n * sizeof_double);
	    var arr_vt = new Float64Array(buf, ptr_vt, d * n);
	    for (var i = 0; i < a.length; i++) {
	        arr_a[i] = a[i];
	    }
	    var timerName = "svd" + (Math.round(Math.random() * 100)) + " approx:" + (approx ? "yes" : "no");
	    console.time(timerName);
	    if (approx) {
	        svd_simple_approx(m, n, d, ptr_a, ptr_u, ptr_s, ptr_vt);
	    }
	    else {
	        svd_simple(m, n, ptr_a, ptr_u, ptr_s, ptr_vt);
	    }
	    console.timeEnd(timerName);
	    var svd = { u: arr_u, s: arr_s, vt: arr_vt, d: d, m: m, n: n };
	    postMessage(svd);
	    Module._free(ptr_a);
	    Module._free(ptr_u);
	    Module._free(ptr_s);
	    Module._free(ptr_vt);
	}


/***/ }
/******/ ]);
//# sourceMappingURL=worker.js.map