var calculateSvds = (function () {
  function start () { return new Worker('js/svd-worker.js'); }

  var callback = null;
  function maybeCallback () {
    if (redSvd && greenSvd && blueSvd && callback) {
      var cb = callback;
      callback = null;
      cb(redSvd, greenSvd, blueSvd);
      redSvd = greenSvd = blueSvd = null;
    }
  }

  var redWorker, redSvd;
  function initRedWorker () {
    if (redWorker) { redWorker.terminate(); }
    redWorker = start();
    redWorker.onmessage = function (res) {
      redSvd = res.data;
      maybeCallback();
    };
  }

  var greenWorker, greenSvd;
  function initGreenWorker () {
    if (greenWorker) { greenWorker.terminate(); }
    greenWorker = start();
    greenWorker.onmessage = function (res) {
      greenSvd = res.data;
      maybeCallback();
    };
  }

  var blueWorker, blueSvd;
  function initBlueWorker () {
    if (blueWorker) { blueWorker.terminate(); }
    blueWorker = start();
    blueWorker.onmessage = function (res) {
      blueSvd = res.data;
      maybeCallback();
    };
  }

  initRedWorker();
  initGreenWorker();
  initBlueWorker();

  return function (m, n, rpx, gpx, bpx, approx, cb) {
    /* It would be great if the web worker API allowed one to simply abort the
       current task a worker is executing by e.g. throwing an exception in the
       worker. With this, all the initialization and memory allocation of
       Emscripten associated with a complete restart could be avoided. */
    if (callback) {
      if (!redSvd)   { initRedWorker(); }
      if (!greenSvd) { initGreenWorker(); }
      if (!blueSvd)  { initBlueWorker(); }
    }
    redSvd = greenSvd = blueSvd = null;
    callback = cb;
    redWorker.postMessage({ m: m, n: n, a: rpx, approx: approx });
    greenWorker.postMessage({ m: m, n: n, a: gpx, approx: approx });
    blueWorker.postMessage({ m: m, n: n, a: bpx, approx: approx });
  };
})();

var preload = (function () {
  var preloaded = {};

  return function (src) {
    if (preloaded[src]) { return; }
    var img = new Image();
    img.onload = function () {
      preloaded[src] = true;
      console.log("Preloaded image '" + src + "'");
    };
    img.src = src;
  };
})();

function loadImage (src, callback) {
  var img = new Image();
  img.onload = function () { callback(img); };
  img.src = src;
}

var FileInputField = React.createClass({displayName: "FileInputField",

  onChange: function () {
    var files = this.refs.input.getDOMNode().files;
    console.log(files);
    if (!files || !files[0]) { return; }
    if (this.props.onChange) { this.props.onChange(files[0]); }
  },

  render: function () {
    return (
      React.createElement("span", {className: "file-input-button"}, 
        React.createElement("span", null, this.props.label), 
        React.createElement("input", {ref: "input", type: "file", accept: "image/*", className: "file-input", onChange: this.onChange})
      )
    );
  }

});


var Gallery = React.createClass({displayName: "Gallery",

  getImages: function () {
    return ([
      {
        name: 'cats',
        artist: 'Jetske',
        source: 'https://www.flickr.com/photos/jetske/5827857531/'
      },
      {
        name: 'tree',
        artist: 'Moyan Brenn',
        source: 'https://www.flickr.com/photos/aigle_dore/15061080128/'
      },
      {
        name: 'mondrian',
        artist: 'Rael Garcia Arnes',
        source: 'https://www.flickr.com/photos/raelga/4408707212/'
      },
      {
        name: 'nyc',
        artist: 'Chris Isherwood',
        source: 'https://www.flickr.com/photos/isherwoodchris/3096255994/'
      },
      {
        name: 'girl',
        artist: 'Elvin',
        source: 'https://www.flickr.com/photos/25228175@N08/5896000539/'
      }
    ].map(function (obj) {
      var url = 'images/' + obj.name + '_medium.jpg';
      preload(url);
      return {
        width: 150,
        height: 150,
        url: url,
        preview: 'images/' + obj.name + '_small.jpg',
        artist: obj.artist,
        source: obj.source
      };
    }));
  },

  render: function () {
    var renderImage = function (img) {
      var onClick = function (evt) {
        if (this.props.onClick) { this.props.onClick(img.url); }
        evt.preventDefault();
      }.bind(this);

      return (
        React.createElement("li", null, 
          React.createElement("a", {href: img.url, onClick: onClick}, 
            React.createElement("img", {width: img.width, height: img.height, src: img.preview})
          ), 
          React.createElement("p", {className: "caption"}, 
            React.createElement("a", {href: img.source}, 
              "By ", img.artist
            )
          )
        )
      );
    }.bind(this);

    return (
      React.createElement("ul", {className: "images"}, 
        this.getImages().map(renderImage)
      )
    );
  }

});

var SVSlider = React.createClass({displayName: "SVSlider",

  render: function () {
    return React.createElement("div", {className: "slider"});
  },

  componentDidMount: function () {
    var slider = this.getDOMNode();
    noUiSlider.create(slider, {
      // TODO: adapt to image size
      range: {
        'min': [1,1],
        '20%': [10,2],
        '30%': [20,10],
        '50%': [100,20],
        'max': [this.props.max]
      },
      start: this.props.value,
      pips: {
        mode: 'steps'
      }
    });
    slider.noUiSlider.on('change', function () {
      var val = slider.noUiSlider.get();
      console.log(val);
      if (this.props.onChange) { this.props.onChange(val); }
    }.bind(this));
  }

});

var CanvasComponent = {
  render: function () {
    return React.createElement("canvas", {width: this.props.width, height: this.props.height});
  },

  componentDidMount: function () {
    this.paint();
  },

  componentDidUpdate: function () {
    this.paint();
  }
};

var SVDView = React.createClass({displayName: "SVDView",

  mixins: [CanvasComponent],

  paint: function () {
    var w = this.props.width, h = this.props.height;
    var ctx = this.getDOMNode().getContext('2d');
    var imageData = ctx.getImageData(0, 0, w, h);
    imageSvd.svdsToImageData(this.props.svds, this.props.numSvs, imageData);
    ctx.putImageData(imageData, 0, 0);
  }

});

// returns a random element in [0, n)
function random (n) {
  return Math.floor(Math.random() * n);
}

function randomColorFromImg (img) {
  var canvas = document.createElement('canvas');
  canvas.width  = img.width;
  canvas.height = img.height;
  var ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  var r = 0, g = 0, b = 0;
  var n = 10;
  for (var i = 0; i < n; i++) {
    var x = random(img.width), y = random(img.height);
    var d = ctx.getImageData(x, y, 1, 1).data;
    r += d[0]; g += d[1]; b += d[2];
  }
  var fl = Math.floor;
  return 'rgb(' + fl(r/n) + ',' + fl(g/n) + ',' + fl(b/n) + ')';
}

var Placeholder = React.createClass({displayName: "Placeholder",

  render: function () {
    var color = randomColorFromImg(this.props.img);
    console.log(color);
    var style = {
      width: this.props.width,
      height: this.props.height,
      background: color
    };
    return React.createElement("div", {className: "placeholder", style: style});
  }

});

function getImageData (img) {
  var canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  var ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, img.width, img.height);
}

var firstImg = {
  w: 600, h: 402,
  src: 'images/mountains_sea.jpg',
  approxSrc: 'images/mountains_sea_5svs.jpg'
};

var App = React.createClass({displayName: "App",

  getInitialState: function () {
    return {
      width: firstImg.w,
      height: firstImg.h,
      placeholderImg: firstImg.approxSrc,
      numSvs: 5,
      approx: true,
      error: ""
    };
  },

  componentDidMount: function () {
    document.body.ondragover  = this.onDragOver;
    document.body.ondragleave = this.onDragLeave;
    document.body.ondrop      = this.onDrop;
    this.loadImage(firstImg.src, firstImg.approxSrc);
  },

  initializeImage: function (img) {
    var w = img.width, h = img.height;
    this.setState({ width: w, height: h, img: img, svds: null })
    var imageData = getImageData(img);
    var pxls = imageSvd.imageDataToPixels(imageData);

    calculateSvds(h, w, pxls.red, pxls.green, pxls.blue, true,
                  function (redSvdApprox, greenSvdApprox, blueSvdApprox) {
      var svdsApprox = { red: redSvdApprox, green: greenSvdApprox, blue: blueSvdApprox };
      this.setState({ svds: svdsApprox, approx: true });
      calculateSvds(h, w, pxls.red, pxls.green, pxls.blue, false,
                    function (redSvd, greenSvd, blueSvd) {
        var svds = { red: redSvd, green: greenSvd, blue: blueSvd };
        this.setState({ svds: svds, approx: false });
      }.bind(this));
    }.bind(this));
  },

  loadImage: function (url, placeholderImg) {
    this.setState({ placeholderImg: placeholderImg || null });
    loadImage(url, this.initializeImage);
  },

  onDragOver: function (evt) {
    this.setState({ hover: true });
    // without this, the drop event would not fire on the element!
    evt.preventDefault();
  },

  onDragLeave: function () {
    this.setState({ hover: false });
  },

  onDrop: function (evt) {
    this.setState({ hover: false });
    evt.preventDefault();

    var files = evt.dataTransfer.files;
    if (!files || !files[0]) { return; }
    this.onFileChosen(files[0]);
  },

  onFileChosen: function (file) {
    this.setState({ error: "" });
    if (!file.type.match(/image.*/)) {
      this.setState({ error: "The chosen file is not an image!" });
      return;
    }
    var reader = new FileReader();
    reader.onload = function (evt) {
      this.loadImage(evt.target.result);
    }.bind(this);
    reader.readAsDataURL(file);
  },

  onChangeSvs: function (numSvs) {
    this.setState({ numSvs: numSvs });
  },

  render: function () {
    document.body.className = this.state.hover ? 'hover' : '';

    var w = this.state.width, h = this.state.height;
    var img = this.state.img;
    var placeholderImg = this.state.placeholderImg;

    var infoBar = "";
    if (!this.state.svds) {
      infoBar = (
        React.createElement("p", {className: "info-bar"}, 
          "Please wait …"
        )
      );
    } else if (this.state.approx) {
      infoBar = (
        React.createElement("p", {className: "info-bar"}, 
          "Showing approximate SVD  ", 
          React.createElement("img", {src: "deps/spinner.gif", width: "16", height: "16"}), 
          "  Computing precise result …"
        )
      );
    }

    var imageContainerStyle = {
      width:  w + 200,
      height: h - 20
    }
    return (
      React.createElement("div", null, 
        React.createElement("div", {className: "image-container", style: imageContainerStyle}, 
          this.state.svds
            ? React.createElement(SVDView, {svds: this.state.svds || null, 
                       width: w, height: h, 
                       numSvs: this.state.numSvs})
            : (placeholderImg
                ? React.createElement("img", {width: w, height: h, src: placeholderImg})
                : React.createElement(Placeholder, {width: w, height: h, img: img})), 
          infoBar
        ), 
        React.createElement("div", {className: "wrapper"}, 
          React.createElement("div", {className: "options"}, 
            React.createElement(SVSlider, {value: this.state.numSvs, 
                      onChange: this.onChangeSvs, 
                      max: Math.min(w,h)})
          ), 
          this.state.error
            ? React.createElement("p", null, this.state.error, " Try another file …")
            : "", 
          React.createElement("p", null, "You can ", React.createElement(FileInputField, {onChange: this.onFileChosen, label: "upload"}), " your own pictures or drop them on this page. Here are some nice examples to try:"), 

          React.createElement(Gallery, {onClick: this.loadImage})
        )
      )
    );
  }

});

React.render(React.createElement(App, null), $('.app').get(0));
