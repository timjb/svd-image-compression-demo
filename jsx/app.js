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
  if (/^http/.test(src)) {
    console.log('cors');
    // absolute url: use CORS proxy http://crossorigin.me
    img.crossOrigin = 'anonymous';
    img.src = 'http://crossorigin.me/' + src;
  } else {
    // relative url: load directly
    img.src = src;
  }
}

var FileInputField = React.createClass({

  onChange: function () {
    var files = this.refs.input.getDOMNode().files;
    if (!files || !files[0]) { return; }
    if (this.props.onChange) { this.props.onChange(files[0]); }
  },

  render: function () {
    return (
      <span className="file-input-button">
        <span>{this.props.label}</span>
        <input ref="input" type="file" accept="image/*" className="file-input" onChange={this.onChange} />
      </span>
    );
  }

});


var Gallery = React.createClass({

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
        <li>
          <a href={img.url} onClick={onClick}>
            <img width={img.width} height={img.height} src={img.preview} />
          </a>
          <p className="caption">
            <a href={img.source}>
              By {img.artist}
            </a>
          </p>
        </li>
      );
    }.bind(this);

    return (
      <ul className="images">
        {this.getImages().map(renderImage)}
      </ul>
    );
  }

});

var SVSlider = React.createClass({

  render: function () {
    return <div className="slider" />;
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
    slider.noUiSlider.on('update', function () {
      var val = slider.noUiSlider.get();
      if (this.props.onUpdate) { this.props.onUpdate(val); }
    }.bind(this));
    slider.noUiSlider.on('change', function () {
      var val = slider.noUiSlider.get();
      if (this.props.onChange) { this.props.onChange(val); }
    }.bind(this));
  }

});

var HoverCanvasView = {

  getInitialState: function () {
    return { hover: false };
  },

  componentDidMount: function () {
    this.paint();
  },

  componentDidUpdate: function () {
    this.paint();
  },

  onMouseEnter: function () {
    this.setState({ hover: true });
  },

  onMouseOut: function () {
    this.setState({ hover: false });
  },

  render: function () {
    return <canvas width={this.props.width}
                   height={this.props.height}
                   onMouseEnter={this.onMouseEnter}
                   onMouseOut={this.onMouseOut} />;
  }

};

var SVDView = React.createClass({

  mixins: [HoverCanvasView],

  shouldComponentUpdate: function (nextProps, nextState) {
    if (nextProps.svds !== this.props.svds) {
      // invalidate cached image data
      this.imageData = null;
    } else if (nextProps.numSvs !== this.props.numSvs) {
      // update cached image data
      this.imageDataUpdates++;
      if (nextProps.numSvs > this.props.numSvs) {
        imageSvd.svdsToImageData(
          this.props.svds, this.imageData,
          this.props.numSvs, nextProps.numSvs, 1);
      } else {
        imageSvd.svdsToImageData(
          this.props.svds, this.imageData,
          nextProps.numSvs, this.props.numSvs, -1);
      }
    }
    return true;
  },

  computeImageDataFromScratch: function () {
    var w = this.props.width, h = this.props.height;
    var ctx = this.getDOMNode().getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    this.imageData = ctx.getImageData(0, 0, w, h);
    imageSvd.svdsToImageData(this.props.svds, this.imageData, 0, this.props.numSvs, 1);
    this.imageDataUpdates = 0;
  },

  refreshImageData: function () {
    if (this.imageDataUpdates >= 10) {
      this.computeImageDataFromScratch();
      this.paint();
    }
  },

  paint: function () {
    var w = this.props.width, h = this.props.height;
    var ctx = this.getDOMNode().getContext('2d');
    if (this.state.hover && this.props.hoverToSeeOriginal) {
      ctx.drawImage(this.props.img, 0, 0, w, h);
    } else {
      if (!this.imageData) {
        this.computeImageDataFromScratch();
      }
      ctx.putImageData(this.imageData, 0, 0);
    }
  }

});

var SVSView = React.createClass({

  mixins: [HoverCanvasView],

  paint: function () {
    var w = this.props.width, h = this.props.height;
    var ctx = this.getDOMNode().getContext('2d');
    var hover = this.state.hover;

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = hover ? 'rgb(90, 90, 90)' : 'rgba(90, 90, 90, 0.35)';
    ctx.fillRect(0, 0, w, h);

    var redSvs   = this.props.svds.red.s;
    var greenSvs = this.props.svds.green.s;
    var blueSvs  = this.props.svds.blue.s;
    var norm = (redSvs[5] + greenSvs[5] + blueSvs[5]) / (3*h);
    var numSvs = this.props.numSvs;
    var d = this.props.svds.red.d;

    var imageData = ctx.getImageData(0, 0, w, h);
    var data = imageData.data;
    for (var i = 0; i < d; i++) {
      var redV   = Math.round(redSvs[i]   / norm);
      var greenV = Math.round(greenSvs[i] / norm);
      var blueV  = Math.round(blueSvs[i]  / norm);
      var b = i < numSvs ? 30 : 0; // bonus
      for (var j = 0; j < h; j++) {
        var k = ((h-j)*w + i)*4;
        data[k]   = (j < redV   ? 225 : 100) + b;
        data[k+1] = (j < greenV ? 225 : 100) + b;
        data[k+2] = (j < blueV  ? 225 : 100) + b;
        data[k+3] = hover ? 255 : (data[k] + data[k+1] + data[k+2]) / 3;
      }
    }
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

var Placeholder = React.createClass({

  render: function () {
    var color = randomColorFromImg(this.props.img);
    var style = {
      width: this.props.width,
      height: this.props.height,
      background: color
    };
    return <div className="placeholder" style={style} />;
  }

});

function getImageData (img) {
  var canvas = document.createElement('canvas');
  canvas.width  = img.width;
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

function contains (list, el) {
  for (var i = 0; i < list.length; i++) {
    if (list[i] === el) { return true; }
  }
  return false;
}

var App = React.createClass({

  getInitialState: function () {
    return {
      width: firstImg.w,
      height: firstImg.h,
      placeholderImg: firstImg.approxSrc,
      numSvs: 5,
      approx: true,
      showSvs: false,
      error: "",
      hoverToSeeOriginal: true
    };
  },

  componentDidMount: function () {
    window.ondragover = this.onDragOver;
    this.loadImage(firstImg.src, firstImg.approxSrc);
  },

  initializeImage: function (img) {
    var w = img.width, h = img.height;

    try {
      var imageData = getImageData(img);
    } catch (exc) {
      if (exc.message.match(/(tainted|cross\-origin|insecure)/)) {
        return window.alert("Due to browser limitations (cross-origin policy), it isn't possible use pictures dragged from other sites. You have to save the image locally before you can use it.");
      }
      throw exc; // rethrow
    }

    if (w > 1000 || h > 1000) {
      var msg = "Your image is quite large. Computing the SVD may take a while. Continue?";
      if (!window.confirm(msg)) { return; }
    }

    this.setState({ width: w, height: h, img: img, svds: null, error: "" })
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
    // without this, the drop event would not fire on the element!
    evt.preventDefault();

    if (!this.state.hover) {
      var types = evt.dataTransfer.types;
      this.setState({
        hover: true,
        error: (contains(types, 'text/uri-list') ||
                contains(types, 'Files'))
                 ? ""
                 : "The dragged object is not an image!"
      });
    }
  },

  onDragLeave: function (evt) {
    this.setState({ hover: false, error: "" });
  },

  onDrop: function (evt) {
    this.setState({ hover: false });
    evt.preventDefault();

    var files = evt.dataTransfer.files;
    if (files && files.length > 0) {
      this.onFileChosen(files[0]);
    } else if (contains(evt.dataTransfer.types, 'text/uri-list')) {
      this.loadImage(evt.dataTransfer.getData('text/uri-list'));
    }
  },

  onFileChosen: function (file) {
    if (!file.type.match(/^image\/.*/)) {
      this.setState({
        error: "The chosen file is not an image! Try another file ..."
      });
      return;
    }
    this.setState({ error: "" });
    var reader = new FileReader();
    reader.onload = function (evt) {
      this.loadImage(evt.target.result);
    }.bind(this);
    reader.readAsDataURL(file);
  },

  onUpdateSvs: function (numSvs) {
    this.setState({ numSvs: Math.round(numSvs) });
  },

  onChangeSvs: function (numSvs) {
    window.setTimeout(function () {
      this.refs.svdView.refreshImageData();
    }.bind(this), 400);
  },

  clickShowSvs: function (evt) {
    evt.preventDefault();
    this.setState({ showSvs: !this.state.showSvs });
  },

  clickHoverToSeeOriginal: function (evt) {
    evt.preventDefault();
    this.setState({ hoverToSeeOriginal: !this.state.hoverToSeeOriginal });
  },

  render: function () {
    var w = this.state.width, h = this.state.height;
    var img = this.state.img;
    var placeholderImg = this.state.placeholderImg;
    var numSvs = this.state.numSvs;

    var infoBar;
    if (this.state.error) {
      infoBar = this.state.error;
    } else if (this.state.hover) {
      infoBar = "Drop now!";
    } else if (!this.state.svds) {
      infoBar = <span>Please wait &hellip;</span>;
    } else if (this.state.approx) {
      infoBar = (
        <span>
          Showing approximate SVD &nbsp;
          <img src="deps/spinner.gif" width="16" height="16" />
          &nbsp; Computing precise result &hellip;
        </span>
      );
    }

    var imageContainerStyle = {
      width:  w + 240,
      height: h - 20
    }

    var dropTarget = (
      <div className={'drop-target ' + (this.state.error ? '' : 'active')}
           onDragOver={this.onDragOver}
           onDragLeave={this.onDragLeave}
           onDrop={this.onDrop} />
    );

    var mainImageView;
    if (this.state.svds) {
      mainImageView = <SVDView ref="svdView"
                               svds={this.state.svds} numSvs={numSvs}
                               width={w} height={h} img={img}
                               hoverToSeeOriginal={this.state.hoverToSeeOriginal} />;
    } else if (placeholderImg) {
      mainImageView = <img width={w} height={h} src={placeholderImg} />;
    } else {
      mainImageView = <Placeholder width={w} height={h} img={img} />;
    }

    function showPercentageOneDecimal (p) {
      var n = ''+Math.round(p*1000);
      var l = n.length;
      if (l === 1) { return '0.' + n; }
      return n.slice(0,l-1) + '.' + n.charAt(l-1);
    }

    var compressedSize = h*numSvs + numSvs + numSvs*w;
    var stats = (
      <div className="stats" style={{ left: w + 20 }}>
        <table>
          <tr>
            <th className="label">Image size</th>
            <td>{w} &times; {h}</td>
          </tr>
          <tr>
            <th className="label">#pixels</th>
            <td>= {w*h}</td>
          </tr>
        </table>
        <p>
          <span className="label">Uncompressed size</span><br />
          proportional to number of pixels
        </p>
        <p>
          <span className="label">Compressed size</span><br />
          approximately proportional to <br />
          {h}&thinsp;&times;&thinsp;{numSvs} + {numSvs} + {numSvs}&thinsp;&times;&thinsp;{w} <br />
          = {compressedSize}
        </p>
        <p>
          <span className="label">Compression ratio</span><br />
          {compressedSize} / {w*h} = {showPercentageOneDecimal(compressedSize / (w*h))}%
        </p>
        <p>
          <a className={'toggle-show-svs ' + (this.state.showSvs ? 'active' : '')}
             href="#" onClick={this.clickShowSvs}>
            Show singular values
          </a>
        </p>
        <p className="hint">
          <a className={'toggle-hover-original ' + (this.state.hoverToSeeOriginal ? 'active' : '')}
             href="#" onClick={this.clickHoverToSeeOriginal}>
            <span className="check-box">
              {this.state.hoverToSeeOriginal ? <span>&#9745;</span>
                                             : <span>&#9744;</span>}
            </span>
            <span className="text">hover to see the original picture</span>
          </a>
        </p>
      </div>
    );

    return (
      <div>
        {this.state.hover ? dropTarget : ""}
        <div className="image-container" style={imageContainerStyle}>
          {mainImageView}
          {(this.state.svds && this.state.showSvs)
            ? <SVSView svds={this.state.svds} numSvs={numSvs}
                       width={w} height={h} />
            : ""}
          {infoBar ? <p className="info-bar">{infoBar}</p> : ""}
          {stats}
        </div>
        <div className="wrapper">
          <div className="options">
            <SVSlider value={numSvs}
                      onUpdate={this.onUpdateSvs}
                      onChange={this.onChangeSvs}
                      max={Math.min(w,h)} />
          </div>
          <p>You can <FileInputField onChange={this.onFileChosen} label="upload" /> your own pictures or drop them on this page. Here are some nice examples to try:</p>

          <Gallery onClick={this.loadImage} />
        </div>
      </div>
    );
  }

});

React.render(<App />, document.getElementById('app'));
