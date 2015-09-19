function toFloat32Array (f64A) {
  //return new Float32Array(f64A); // doesn't work in Firefox
  var l = f64A.length;
  var f32A = new Float32Array(l);
  for (var i = 0; i < l; i++) {
    f32A[i] = f64A[i];
  }
  return f32A;
}

function toFloat32Svd (svd) {
  return {
    u:  toFloat32Array(svd.u),
    s:  toFloat32Array(svd.s),
    vt: toFloat32Array(svd.vt),
    d: svd.d, m: svd.m, n: svd.n
  };
}

function toFloat32Svds (svds) {
  return {
    red:   toFloat32Svd(svds.red),
    green: toFloat32Svd(svds.green),
    blue:  toFloat32Svd(svds.blue)
  };
}

var computeSvds = (function () {
  var state = { red: {}, green: {}, blue: {} };

  function start () { return new Worker('js/svd-worker.js'); }

  function initWorker (color) {
    var s = state[color];
    s.computingSvd = false;
    if (s.worker) { s.worker.terminate(); }
    s.worker = start();
    s.worker.onmessage = function (res) {
      s.onmessage(res);
    };
  }

  initWorker('red');
  initWorker('green');
  initWorker('blue');

  return function (m, n, channels, cb) {
    /* It would be great if the web worker API allowed one to simply abort the
       current task a worker is executing by e.g. throwing an exception in the
       worker. With this, all the initialization and memory allocation of
       Emscripten associated with a complete restart could be avoided. */
       
    var finishedApprox = 0;
    var finishedFull = 0;
    
    function helper (color) {
      var s = state[color];
      if (s.computingSvd) { initWorker(color); }
      s.computingSvd = true;
      var buffer = channels[color].buffer;
      s.worker.postMessage( { msg: 'set-input', a: buffer, m: m, n: n }, [buffer]);
      s.onmessage = function (msg) {
        s.approxSvd = msg.data;
        finishedApprox++;
        if (finishedApprox === 3) {
          cb({
            red: state.red.approxSvd,
            green: state.green.approxSvd,
            blue: state.blue.approxSvd,
            approx: true
          });
        }
        s.onmessage = function (msg) {
          s.fullSvd = msg.data;
          finishedFull++;
          if (finishedFull === 3) {
            cb({
              red: state.red.fullSvd,
              green: state.green.fullSvd,
              blue: state.blue.fullSvd,
              approx: false
            });
          }
          s.computingSvd = false;
        };
        s.worker.postMessage({ msg: 'compute-svd', approx: false });
      };
      s.worker.postMessage({ msg: 'compute-svd', approx: true });
    }
    
    helper('red');
    helper('green');
    helper('blue');
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
      <span className="button file-input-button">
        <span>{this.props.label}</span>
        <input ref="input" type="file" accept="image/*" className="file-input" onChange={this.onChange} />
      </span>
    );
  }

});


var Gallery = React.createClass({

  getImages: function () {
    function quiz (obj) {
      obj.preview = 'images/question_mark_small.jpg';
      obj.quiz = true;
      return obj;
    }
    return ([
      {
        name: 'cats',
        caption: 'By Jetske',
        source: 'https://www.flickr.com/photos/jetske/5827857531/'
      },
      {
        name: 'tree',
        caption: 'By Moyan Brenn',
        source: 'https://www.flickr.com/photos/aigle_dore/15061080128/'
      },
      {
        name: 'mondrian',
        caption: 'By Rael Garcia Arnes',
        source: 'https://www.flickr.com/photos/raelga/4408707212/'
      },
      {
        name: 'nyc',
        caption: 'By Chris Isherwood',
        source: 'https://www.flickr.com/photos/isherwoodchris/3096255994/'
      },
      {
        name: 'girl',
        caption: 'By Elvin',
        source: 'https://www.flickr.com/photos/25228175@N08/5896000539/'
      },
      {
        name: 'royal_stewart',
        caption: 'The Royal Stewart tartan',
        source: 'https://en.wikipedia.org/wiki/Royal_Stewart_tartan'
      },
      {
        url: 'images/randbitmap-rdo_medium.png',
        preview: 'images/randbitmap-rdo_small.png',
        caption: 'Random data',
        source: 'https://www.random.org/bitmaps/'
      },
      {
        name: 'girih_pattern',
        caption: 'Girih pattern by İnfoCan',
        source: 'https://en.wikipedia.org/wiki/Girih#/media/File:Samarkand_Shah-i_Zinda_Tuman_Aqa_complex_cropped2.jpg'
      },
      {
        name: 'manifesto_manifesto',
        caption: 'Manifesto² by c_kick',
        source: 'http://www.hnldesign.nl/blog/the-manifesto-manifesto/'
      },
      {
        name: 'skater_boy',
        caption: 'By Chris Goldberg',
        source: 'https://flic.kr/p/keMZvg'
      },
      quiz({
        // Taj Mahal
        name: 'quiz1',
        caption: 'By Francisco Martins',
        source: 'https://flic.kr/p/4bpEpb'
      }),
      quiz({
        // Rubik's Cube
        name: 'quiz2',
        caption: 'By Eleonora Gorini',
        source: 'https://flic.kr/p/5yWPDc'
      }),
      quiz({
        // Airplane
        name: 'quiz3',
        caption: 'By melfoody',
        source: 'https://flic.kr/p/enTNR5'
      }),
      quiz({
        // The Starry Night
        name: 'quiz4',
        caption: "By VvG",
        source: 'https://goo.gl/oH2BLt'
      }),
      quiz({
        // indian_peafowl
        name: 'quiz5',
        caption: 'By Sergiu Bacioiu',
        source: 'https://flic.kr/p/7TdBUA'
      })
    ].map(function (obj) {
      return {
        width: 150,
        height: 150,
        url: obj.url || 'images/' + obj.name + '_medium.jpg',
        preview: obj.preview || 'images/' + obj.name + '_small.jpg',
        caption: obj.caption,
        source: obj.source,
        quiz: !!obj.quiz
      };
    }));
  },
  
  renderImage: function (img) {
    var onClick = function (evt) {
      evt.preventDefault();
      if (this.props.onClick) {this.props.onClick(img); }
    }.bind(this);
    var onMouseOver = function () {
      preload(img.url);
    };

    return (
      <div className="image">
        <a href={img.url} onClick={onClick} onMouseOver={onMouseOver}>
          <img width={img.width} height={img.height} src={img.preview} />
        </a>
        <p className="caption">
          <a href={img.source}>
            {img.caption}
          </a>
        </p>
      </div>
    );
  },

  render: function () {
    var settings = {
      ref: 'slider',
      className: 'gallery',
      slidesToShow: 5,
      slidesToScroll: 5,
      draggable: false,
      infinite: false,
      afterChange: this.props.onScroll || function () {}
    };

    return (
      <Slider {...settings}>
        {this.getImages().map(this.renderImage)}
      </Slider>
    );
  }

});

function galleryShowsGuessingPage (slideNum) {
    return slideNum === 10;
};

var SVSlider = React.createClass({

  render: function () {
    return <div className="slider" />;
  },

  componentDidUpdate: function (prevProps, prevState) {
    var noUiSlider = this.getDOMNode().noUiSlider;
    if (!noUiSlider) { return; }
    if (this.props.value !== noUiSlider.get()) {
      // hacky
      noUiSlider.set(this.props.value);
    }
    if (this.props.maxSvs !== prevProps.maxSvs) {
      noUiSlider.destroy();
      this.buildSlider();
    }
  },
  
  componentDidMount: function () {
    this.buildSlider();
  },

  buildSlider: function () {
    var slider = this.getDOMNode();
    noUiSlider.create(slider, this.getSliderOptions());
    
    slider.noUiSlider.on('update', function () {
      var val = Math.round(slider.noUiSlider.get());
      if (val !== this.props.value) {
        if (this.props.onUpdate) { this.props.onUpdate(val); }
      }
    }.bind(this));
    slider.noUiSlider.on('change', function () {
      var val = Math.round(slider.noUiSlider.get());
      if (val !== this.props.value) {
        if (this.props.onChange) { this.props.onChange(val); }
      }
    }.bind(this));
  },
  
  getSliderOptions: function () {
    var maxVal = this.props.max;
    var maxSvs = this.props.maxSvs;

    var values = [];
    for (var i = 1; i < 20; i++)       { values.push(i); }
    for (i = 20; i < 100; i += 5)      { values.push(i); }
    for (i = 100; i < maxVal; i += 10) { values.push(i); }
    values.push(maxVal);

    return {
      // TODO: adapt to image size
      behaviour: 'snap',
      range: {
        'min': [1,1],
        '18%': [10,2],
        '30%': [20,10],
        '48%': [100,20],
        'max': [maxVal]
      },
      start: this.props.value,
      pips: {
        mode: 'values',
        values: values,
        density: 10,
        filter: function (v) {
          if (v > maxSvs) { return 0; }
          if (v === 1 || v === 10 || v === 20) { return 1; }
          if (v % 100 === 0) { return 1; }
          if (v < 10) { return 2;}
          if (v < 20 && v % 2 === 0) { return 2; }
          if (v < 100 && v % 10 === 0) { return 2; }
          if (v % 20 === 0) { return 2; }
          return 0;
        }
      }
    };
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
      this.products = null;
    } else if (nextProps.numSvs !== this.props.numSvs) {
      // update cached image data
      if (nextProps.numSvs > this.props.numSvs) {
        this.imageDataUpdates++;
        imageSvd.multiplySvds(
          this.props.svds, this.products,
          this.props.numSvs, nextProps.numSvs, 1);
      } else if (this.props.numSvs - nextProps.numSvs < nextProps.numSvs) {
        this.imageDataUpdates++;
        imageSvd.multiplySvds(
          this.props.svds, this.products,
          nextProps.numSvs, this.props.numSvs, -1);
      } else {
        // it is cheaper to compute from scratch
        this.products = null;
      }
    }
    return true;
  },
  
  initProducts: function () {
    var n = this.props.width, m = this.props.height;
    this.products = {
      red:   new Float32Array(m*n),
      green: new Float32Array(m*n),
      blue:  new Float32Array(m*n)
    };
  },

  computeProductsFromScratch: function () {
    imageSvd.multiplySvds(this.props.svds, this.products, 0, this.props.numSvs, 1);
    this.imageDataUpdates = 0;
  },

  refreshImageData: function () {
    if (this.imageDataUpdates >= 20) {
      this.computeImageDataFromScratch();
      this.paint();
    }
  },

  paint: function () {
    var n = this.props.width, m = this.props.height;
    var ctx = this.getDOMNode().getContext('2d');
    if (this.state.hover && this.props.hoverToSeeOriginal) {
      ctx.drawImage(this.props.img, 0, 0, n, m);
    } else {
      if (!this.imageData) {
        // storing image data saves ~10ms
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, n, m);
        this.imageData = ctx.getImageData(0, 0, n, m);
      }
      if (!this.products) {
        this.initProducts();
        this.computeProductsFromScratch();
      }
      var data = this.imageData.data;
      var redProd = this.products.red,
          greenProd = this.products.green,
          blueProd = this.products.blue;
      for (var y = 0; y < m; y++) {
        for (var x = 0; x < n; x++) {
          var i = y*n + x, j = 4*i;
          data[j]   = redProd[i];
          data[j+1] = greenProd[i];
          data[j+2] = blueProd[i];
        }
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
      hoverToSeeOriginal: true,
      guessingPage: false
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
    
    computeSvds(h, w, pxls, function (svds) {
      this.setState({ svds: toFloat32Svds(svds), approx: svds.approx });
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
    this.setState({ numSvs: numSvs });
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

  onClickGallery: function (img) {
    if (img.quiz) {
      this.setState({ numSvs: 1 });
    }
    this.loadImage(img.url);
  },
  
  onScrollGallery: function (slideNum) {
    var guessingPage = galleryShowsGuessingPage(slideNum);
    var transition = this.state.guessingPage !== guessingPage;
    if (transition) {
      this.setState({
        guessingPage: guessingPage,
        hoverToSeeOriginal: !guessingPage
      });
    }
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
    };

    var dropTarget = (
      <div className={'drop-target ' + (this.state.error ? '' : 'active')}
           onDragOver={this.onDragOver}
           onDragLeave={this.onDragLeave}
           onDrop={this.onDrop} />
    );

    var mainImageView, maxSvs;
    if (this.state.svds) {
      mainImageView = <SVDView ref="svdView"
                               svds={this.state.svds} numSvs={numSvs}
                               width={w} height={h} img={img}
                               hoverToSeeOriginal={this.state.hoverToSeeOriginal} />;
      maxSvs = this.state.svds.red.d;
    } else {
      maxSvs = 1;
      if (placeholderImg) {
        mainImageView = <img width={w} height={h} src={placeholderImg} />;
      } else {
        mainImageView = <Placeholder width={w} height={h} img={img} />;
      }
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
          {w*h} / {compressedSize} = {(w*h / compressedSize).toFixed(2)}
        </p>
        <p>
          <a className={'button toggle-show-svs ' + (this.state.showSvs ? 'active' : '')}
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
            <SVSlider value={numSvs} maxSvs={maxSvs}
                      onUpdate={this.onUpdateSvs}
                      onChange={this.onChangeSvs}
                      max={Math.min(w,h)} />
          </div>
          <p>
            {this.state.guessingPage
              ? "How many singular values do you need to recognize the subject of these pictures?"
              : "Change the number of singular values using the slider. Click on one of these images to compress it:"}
          </p>
          <Gallery ref="gallery" onClick={this.onClickGallery} onScroll={this.onScrollGallery} />
          <p>
            <span className="valign">You can compress your own images by using the</span>
            <FileInputField onChange={this.onFileChosen} label="file picker" />
            <span className="valign">or by dropping them on this page.</span>
          </p>
        </div>
      </div>
    );
  }

});

React.render(<App />, document.getElementById('app'));
