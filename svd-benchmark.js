#!/usr/bin/env node

var numeric = require("./numeric-1.2.6");
var Canvas = require("canvas");
var Image = Canvas.Image;
var fs = require("fs");
var imageSvd = require("./image-svd");

function svd(a, m, n) {
  var res = numeric.svd(a);
  return { u: res.U, s: res.S, v: res.V };
}

function writeOut(canvas, outfile) {
  var out = fs.createWriteStream(outfile);
  var stream = canvas.pngStream();

  stream.on("data", function (chunk) {
    out.write(chunk);
  });
  stream.on("end", function () {
    console.log("saved png");
  });
}

function doSvd(img, outfile, numSvs) {
  var w = img.width,
    h = img.height;
  var canvas = new Canvas(w, h);
  var ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);
  var imageData = ctx.getImageData(0, 0, w, h);
  var pixels = imageSvd.imageDataToPixels(imageData);

  console.log("Computing SVD for red channel ...");
  var redSvd = imageSvd.svd(pixels.red, h, w);
  console.log("... green channel ...");
  var greenSvd = imageSvd.svd(pixels.green, h, w);
  console.log("... blue channel ...");
  var blueSvd = imageSvd.svd(pixels.blue, h, w);

  var svds = { red: redSvd, green: greenSvd, blue: blueSvd };
  imageSvd.svdsToImageData(svds, numSvs, imageData);
  ctx.putImageData(imageData, 0, 0);

  writeOut(canvas, outfile);
}

function main() {
  var args = process.argv.slice(2);
  if (args.length !== 3 || ["--help", "-h"].indexOf(args[0]) >= 0) {
    console.log("usage: ./" + process.argv[1] + " [image-file] [output-file] [num-svs]");
    process.exit(1);
  }
  var imageFile = args[0];
  var outfile = args[1];
  var numSvs = parseInt(args[2], 10);

  fs.readFile(imageFile, function (err, src) {
    if (err) {
      throw err;
    }
    var img = new Image();
    img.src = src;
    doSvd(img, outfile, numSvs);
  });
}

main();
