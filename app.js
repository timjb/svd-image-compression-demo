// Teach jQuery that events can have the 'dataTransfer' property
jQuery.event.props.push("dataTransfer");

var dropTarget = $('#drop-target');
var dropText = $('#drop-text');
var options = $('#options');

var fileInputHtml =
    '<div id="file-input-button">' +
      '<span>choose an image file</span>' +
      '<input type="file" accept="image/*" id="file-input" />' +
    '</div>';

var dropInfoText = 'Drop an image here, ' + fileInputHtml + ' &hellip;';

function initialize () {
  if (typeof window.FileReader === 'undefined') {
    dropText.text("Dropping images is not supported by your browser. Please upgrade to a modern browser.");
  } else {
    dropText.html(dropInfoText);
  }

  function loadFile (file) {
    var reader = new FileReader();
    reader.onload = function (event) {
      loadImage(event.target.result);
    };
    reader.readAsDataURL(file);
  }

  $(document.body).delegate('#file-input', 'change', function () {
    if (this.files && this.files[0]) {
      var file = this.files[0];
      if (!file.type.match(/image.*/)) {
        dropText.html("The chosen file is not an image! Try another file &hellip;<br />" + dropInfoText);
      } else {
        loadFile(file);
      }
    }
  });

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
      if (!file.type.match(/image.*/)) {
        dropText.html("The dropped file is not an image! Try another file &hellip;<br />" + dropInfoText);
        dropTarget.empty().append(dropText);
      } else {
        loadFile(file);
      }

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

var calculateSvds = (function () {
  var redWorker = new Worker('js/svd-worker.js');
  var greenWorker = new Worker('js/svd-worker.js');
  var blueWorker = new Worker('js/svd-worker.js');
  var redSvd, greenSvd, blueSvd;
  var callback;

  function maybeCallback () {
    if (redSvd && greenSvd && blueSvd && callback) {
      callback(redSvd, greenSvd, blueSvd);
    }
  }

  redWorker.onmessage = function (res) {
    console.log(res);
    redSvd = res.data;
    maybeCallback();
  };

  greenWorker.onmessage = function (res) {
    greenSvd = res.data;
    maybeCallback();
  };

  blueWorker.onmessage = function (res) {
    blueSvd = res.data;
    maybeCallback();
  };

  return function (m, n, rpx, gpx, bpx, cb) {
    redSvd = greenSvd = blueSvd = null;
    callback = cb;
    redWorker.postMessage({ m: m, n: n, a: rpx });
    greenWorker.postMessage({ m: m, n: n, a: gpx });
    blueWorker.postMessage({ m: m, n: n, a: bpx });
  };
})();

function initializeImage (img) {
  var w = img.width, h = img.height;
  var canvas = $('<canvas />').attr({ width: w, height: h });
  dropTarget.empty().append(canvas);
  var ctx = canvas.get(0).getContext('2d');
  //ctx.drawImage(img, 0, 0, img.width, img.height);
  ctx.drawImage(img, 0, 0);

  var imageData = ctx.getImageData(0, 0, w, h);
  var pixels = imageSvd.imageDataToPixels(imageData);

  calculateSvds(h, w, pixels.red, pixels.green, pixels.blue, function (redSvd, greenSvd, blueSvd) {
    function renderImage (numSvs) {
      var svds = { red: redSvd, green: greenSvd, blue: blueSvd };
      imageSvd.svdsToImageData(svds, numSvs, imageData);
      ctx.putImageData(imageData, 0, 0);
    }

    var startNumSvs = 5;
    renderImage(startNumSvs);

    function initializeUserInterface () {
      //var slider = $('<input />').attr({ type: 'number', value: startNumSvs, min: 1, max: 50 });
      var slider = $('<div class="slider" />');
      options.empty().append(slider).addClass('active');
      slider.noUiSlider({
        // TODO: adapt to image size
        range: {
          'min': [1,1],
          '20%': [10,2],
          '30%': [20,10],
          '50%': [100,20],
          'max': [Math.min(w,h)]
        },
        start: startNumSvs
      }).noUiSlider_pips({
        mode: 'steps'
      }).on('change', function () {
        console.log(slider.val());
        renderImage(slider.val());
      });
    }

    initializeUserInterface();
  });
}

var A = [[0,1,0],[2,0,0],[0,0,3]];

var B = [[0,1,2],[3,4,5],[6,7,8]];

var V = [0,1,2,3,4,5,6,7,8,9];