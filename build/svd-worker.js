!function e(r,n,o){function u(a,l){if(!n[a]){if(!r[a]){var m="function"==typeof require&&require;if(!l&&m)return m(a,!0);if(t)return t(a,!0);var i=new Error("Cannot find module '"+a+"'");throw i.code="MODULE_NOT_FOUND",i}var s=n[a]={exports:{}};r[a][0].call(s.exports,function(e){var n=r[a][1][e];return u(n||e)},s,s.exports,e,r,n,o)}return n[a].exports}for(var t="function"==typeof require&&require,a=0;a<o.length;a++)u(o[a]);return u}({1:[function(e,r,n){"use strict";function o(e,r,n,o){for(var u=o?Math.min(Math.min(r,n),50):Math.min(r,n),l=Module.HEAPU8.buffer,m=Module._malloc(r*n*8),i=new Float64Array(l,m,r*n),s=Module._malloc(r*u*8),d=new Float64Array(l,s,r*u),c=Module._malloc(8*u),f=new Float64Array(l,c,u),p=Module._malloc(u*n*8),M=new Float64Array(l,p,u*n),b=0;b<e.length;b++)i[b]=e[b];var v="svd"+Math.round(100*Math.random())+" approx:"+(o?"yes":"no");console.time(v),o?a(r,n,u,m,s,c,p):t(r,n,m,s,c,p),console.timeEnd(v);var _={u:d,s:f,vt:M,d:u,m:r,n:n};postMessage(_),Module._free(m),Module._free(s),Module._free(c),Module._free(p)}Object.defineProperty(n,"__esModule",{value:!0}),importScripts("../build/clapack.js");var u=null;console.log("worker started!"),onmessage=function(e){var r=e.data;if("set-input"===r.msg)u={a:new Float64Array(r.a),m:r.m,n:r.n};else{if("compute-svd"!==r.msg)throw new Error("unrecognized command!");if(!u)throw new Error("set-input must come first!");o(u.a,u.m,u.n,r.approx)}};var t=Module.cwrap("svd_simple","number",["number","number","number","number","number","number"]),a=Module.cwrap("svd_simple_approx","number",["number","number","number","number","number","number","number"])},{}]},{},[1]);
//# sourceMappingURL=svd-worker.js.map
