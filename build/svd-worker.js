!function(){function r(e,n,o){function u(a,m){if(!n[a]){if(!e[a]){var l="function"==typeof require&&require;if(!m&&l)return l(a,!0);if(t)return t(a,!0);var i=new Error("Cannot find module '"+a+"'");throw i.code="MODULE_NOT_FOUND",i}var s=n[a]={exports:{}};e[a][0].call(s.exports,function(r){var n=e[a][1][r];return u(n||r)},s,s.exports,r,e,n,o)}return n[a].exports}for(var t="function"==typeof require&&require,a=0;a<o.length;a++)u(o[a]);return u}return r}()({1:[function(r,e,n){"use strict";function o(r,e,n,o){for(var u=o?Math.min(Math.min(e,n),50):Math.min(e,n),m=8,l=Module.HEAPU8.buffer,i=Module._malloc(e*n*m),s=new Float64Array(l,i,e*n),c=Module._malloc(e*u*m),f=new Float64Array(l,c,e*u),d=Module._malloc(u*m),p=new Float64Array(l,d,u),M=Module._malloc(u*n*m),b=new Float64Array(l,M,u*n),v=0;v<r.length;v++)s[v]=r[v];var w="svd"+Math.round(100*Math.random())+" approx:"+(o?"yes":"no");console.time(w),o?a(e,n,u,i,c,d,M):t(e,n,i,c,d,M),console.timeEnd(w);var _={u:f,s:p,vt:b,d:u,m:e,n:n};postMessage(_),Module._free(i),Module._free(c),Module._free(d),Module._free(M)}importScripts("../build/clapack.js");var u=null;console.log("worker started!"),onmessage=function(r){var e=r.data;if("set-input"===e.msg)u={a:new Float64Array(e.a),m:e.m,n:e.n};else{if("compute-svd"!==e.msg)throw new Error("unrecognized command!");if(!u)throw new Error("set-input must come first!");o(u.a,u.m,u.n,e.approx)}};var t=Module.cwrap("svd_simple","number",["number","number","number","number","number","number"]),a=Module.cwrap("svd_simple_approx","number",["number","number","number","number","number","number","number"])},{}]},{},[1]);
//# sourceMappingURL=svd-worker.js.map
