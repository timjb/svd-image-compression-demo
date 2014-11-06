// Teach jQuery that events can have the 'dataTransfer' property
jQuery.event.props.push("dataTransfer");

var dropTarget = $('#drop-target');
var dropText = $('#drop-text');
var options = $('#options');

var dropInfoText = "Drop an image here &hellip;";

function initialize () {
  if (typeof window.FileReader === 'undefined') {
    dropText.text("Dropping images is not supported by your browser. Please upgrade to a modern browser.");
  } else {
    dropText.html(dropInfoText);
  }

  dropTarget
    .on('dragover', function (evt) {
      dropTarget.addClass('hover');
      dropText.html("Drop now &hellip;");
      evt.preventDefault(); // without this, the drop event would not fire on the element!
    })
    .on('dragleave', function () {
      dropTarget.removeClass('hover');
      dropText.html(dropInfoText);
    })
    .on('drop', function (evt) {
      dropTarget.removeClass('hover');
      evt.preventDefault();

      var file = evt.dataTransfer.files[0];
      if (!file.type.match(/image.*/)){
        dropText.html("The dropped file is not an image! Try another file &hellip;");
        dropTarget.empty().append(dropText);
        return;
      }

      var reader = new FileReader();
      reader.onload = function (event) {
        loadImage(event.target.result);
      };
      reader.readAsDataURL(file);

      return false;
    });

  $('.images li > a:first-child').each(function () {
    var src = $(this).attr('href');
    $(this).on('click', function (evt) {
      evt.preventDefault();
      loadImage(src);
    });
    preload(src);
  });
}

function preload (src) {
  var img = new Image();
  img.onload = function () {
    console.log("Preloaded image '" + src + "'");
  };
  img.src = src;
}

function loadImage (src) {
  var img = new Image();
  img.onload = function () { initializeImage(img); };
  img.src = src;
}

function initializeImage (img) {
  var w = img.width, h = img.height;
  var canvas = $('<canvas />').attr({ width: w, height: h });
  dropTarget.empty().append(canvas);
  var ctx = canvas.get(0).getContext('2d');
  //ctx.drawImage(img, 0, 0, img.width, img.height);
  ctx.drawImage(img, 0, 0);

  var imageData = ctx.getImageData(0, 0, w, h);
  var pixels = imageSvd.imageDataToPixels(imageData);

  var redSvd = imageSvd.svd(pixels.red, h, w);
  var greenSvd = imageSvd.svd(pixels.green, h, w);
  var blueSvd = imageSvd.svd(pixels.blue, h, w);

  function renderImage (numSvs) {
    var svds = { red: redSvd, green: greenSvd, blue: blueSvd };
    imageSvd.svdsToImageData(svds, numSvs, imageData);
    ctx.putImageData(imageData, 0, 0);
  }

  var startNumSvs = 5;
  renderImage(startNumSvs);

  function initializeUserInterface () {
    var slider = $('<input />').attr({ type: 'number', value: startNumSvs, min: 1, max: 50 });
    options.empty().append(slider);
    slider.on('change', function () {
      console.log(slider.val());
      renderImage(slider.val());
    });
  }

  initializeUserInterface();
}

function copyPixelsToImageData (pixels, imageData) {
  var w = imageData.width, h = imageData.height;
  var red = pixels.red, green = pixels.green, blue = pixels.blue, alpha = pixels.alpha;
  var i = 0;
  for (var y = 0; y < h; y++) {
    var redRow = red[y], greenRow = green[y], blueRow = blue[y], alphaRow = alpha[y];
    for (var x = 0; x < w; x++) {
      imageData.data[i++] = redRow[x];
      imageData.data[i++] = greenRow[x];
      imageData.data[i++] = blueRow[x];
      imageData.data[i++] = alphaRow[x];
    }
  }
}

var A = [[0,1,0],[2,0,0],[0,0,3]];

var B = [[0,1,2],[3,4,5],[6,7,8]];

var V = [0,1,2,3,4,5,6,7,8,9];