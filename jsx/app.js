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

var FileInputField = React.createClass({

  onChange: function () {
    var files = this.refs.input.getDOMNode().files;
    console.log(files);
    if (!files || !files[0]) { return; }
    if (this.props.onChange) { this.props.onChange(files[0]); }
  },

  render: function () {
    return (
      <span className="file-input-button">
        <span>choose an image file</span>
        <input ref="input" type="file" accept="image/*" className="file-input" onChange={this.onChange} />
      </span>
    );
  }

});

var DropTarget = React.createClass({

  getInitialState: function () {
    return { image: null };
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

    var files = evt.nativeEvent.dataTransfer.files;
    if (!files || !files[0]) { return; }
    this.onFileChosen(files[0]);
  },

  onFileChosen: function (file) {
    this.setState({ error: "" });
    if (this.props.onFileChosen) { this.props.onFileChosen(file); }
  },

  render: function () {
    var content;
    if (this.props.children) {
      content = this.props.children;
    } else if (typeof window.FileReader === 'undefined') {
      content = (
        <p className="drop-text">
          Dropping images is not supported by your browser. Please upgrade to a modern browser.
        </p>
      );
    } else if (this.state.hover) {
      content = <p className="drop-text">Drop now &hellip;</p>;
    } else {
      var err = this.state.error ? <span>{this.state.error} Try another file &hellip;<br /></span> : "";
      this.fileInput = <FileInputField onChange={this.onFileChosen} />;
      content = (
        <p className="drop-text">
          {err}
          Drop an image here, {this.fileInput} &hellip;
        </p>
      );
    }

    return (
      <div className={"drop-target" + (this.state.hover ? " hover" : "")}
           onDragOver={this.onDragOver}
           onDragLeave={this.onDragLeave}
           onDrop={this.onDrop}>
        {content}
      </div>
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
    var slider = $(this.getDOMNode());
    slider.noUiSlider({
      // TODO: adapt to image size
      range: {
        'min': [1,1],
        '20%': [10,2],
        '30%': [20,10],
        '50%': [100,20],
        'max': [this.props.max]
      },
      start: this.props.value
    }).noUiSlider_pips({
      mode: 'steps'
    }).on('change', function () {
      console.log(slider.val());
      if (this.props.onChange) { this.props.onChange(slider.val()); }
    }.bind(this));
  }

});

var SVDView = React.createClass({

  render: function () {
    return <canvas width={this.props.width} height={this.props.height} />;
  },

  componentDidMount: function () {
    this.paint();
  },

  componentDidUpdate: function () {
    this.paint();
  },

  paint: function () {
    var w = this.props.width, h = this.props.height;
    var ctx = this.getDOMNode().getContext('2d');
    var imageData = ctx.getImageData(0, 0, w, h);
    imageSvd.svdsToImageData(this.props.svds, this.props.numSvs, imageData);
    ctx.putImageData(imageData, 0, 0);
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

var App = React.createClass({

  getInitialState: function () {
    return { numSvs: 5 };
  },

  initializeImage: function (img) {
    var w = img.width, h = img.height;
    var imageData = getImageData(img);
    var pxls = imageSvd.imageDataToPixels(imageData);

    calculateSvds(h, w, pxls.red, pxls.green, pxls.blue, function (redSvd, greenSvd, blueSvd) {
      var svds = { red: redSvd, green: greenSvd, blue: blueSvd };
      this.setState({ svds: svds, width: w, height: h });
    }.bind(this));
  },

  loadImage: function (url) {
    loadImage(url, this.initializeImage);
  },

  onFileChosen: function (file) {
    if (!file.type.match(/image.*/)) {
      this.refs.dropTarget.setState({ error: "The chosen file is not an image!" });
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
    var w = this.state.width, h = this.state.height;
    return (
      <div>
        <DropTarget ref="dropTarget" onFileChosen={this.onFileChosen}>
          {this.state.svds ? <SVDView svds={this.state.svds}
                                      width={w} height={h}
                                      numSvs={this.state.numSvs} /> : ""}
        </DropTarget>
        <div className="wrapper">
          {this.state.svds ? <div className="options">
                               <SVSlider value={this.state.numSvs}
                                         onChange={this.onChangeSvs}
                                         max={Math.min(w,h)} />
                             </div>
                           : ""}
          <p>&hellip; or one of these pictures:</p>
          <Gallery onClick={this.loadImage} />
        </div>
      </div>
    );
  }

});

React.render(<App />, $('.app').get(0));