import * as React from "react";
import * as ReactDOM from "react-dom";
import * as noUiSlider from "nouislider";
import * as Slider from "react-slick";
import imageSvd = require('./image-svd');
import types = require('../shared/types');
import protocol = require('../shared/svd-worker-protocol');

// Copied from underscore.js (https://github.com/jashkenas/underscore)
//
// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
function debounce(func: () => void, wait: number, immediate: boolean = false): () => void {
  const getNow = Date.now || (() => new Date().getTime());

  let timeout: null | number, args: IArguments, timestamp: number;

  const later = () => {
    const last = getNow() - timestamp;

    if (last < wait && last >= 0) {
      timeout = setTimeout(later, wait - last);
    } else {
      timeout = null;
      if (!immediate) {
        func.apply(null, args);
      }
    }
  };

  return function () {
    args = arguments;
    timestamp = getNow();
    const callNow = immediate && !timeout;
    if (!timeout) timeout = setTimeout(later, wait);
    if (callNow) {
      func.apply(null, args);
    }
  };
}

function toFloat32Array(f64A: Float64Array | number[]): Float32Array {
  //return new Float32Array(f64A); // doesn't work in Firefox
  const l = f64A.length;
  const f32A = new Float32Array(l);
  for (let i = 0; i < l; i++) {
    f32A[i] = f64A[i];
  }
  return f32A;
}

function toFloat32Svd(svd: types.SVD64): types.SVD {
  return {
    u:  toFloat32Array(svd.u),
    s:  toFloat32Array(svd.s),
    vt: toFloat32Array(svd.vt),
    d: svd.d, m: svd.m, n: svd.n
  };
}

function toFloat32Svds(svds: types.SVDs64): types.SVDs {
  return {
    red:   toFloat32Svd(svds.red),
    green: toFloat32Svd(svds.green),
    blue:  toFloat32Svd(svds.blue)
  };
}

const computeSvds = (() => {
  function start(): Worker { return new Worker('build/svd-worker.js'); }

  interface WorkerState {
    computingSvd: boolean;
    worker: Worker;
    onmessage: (event: MessageEvent) => void;
    approxSvd: null | types.SVD64;
    fullSvd: null | types.SVD64;
  }

  function initWorker(): WorkerState {
    const s: WorkerState = {
      computingSvd: false,
      worker: start(),
      onmessage: () => {},
      approxSvd: null,
      fullSvd: null
    };
    s.worker.onmessage = (res) => {
      s.onmessage(res);
    };
    return s;
  }

  let state: types.RGB<WorkerState> = {
    red: initWorker(),
    green: initWorker(),
    blue: initWorker()
  };

  return function(
    m: number, n: number, channels: types.RGB<Float64Array>,
    callback: (res: types.SVDs64 & { approx: boolean }) => void
  ) {
    /* It would be great if the web worker API allowed one to simply abort the
       current task a worker is executing by e.g. throwing an exception in the
       worker. With this, all the initialization and memory allocation of
       Emscripten associated with a complete restart could be avoided. */

    function helper(mkColorLens: <X>() => types.Lens<types.RGB<X>, X>) {
      const workerStateLens = mkColorLens<WorkerState>();
      let s = workerStateLens.get(state);
      if (s.computingSvd) {
        s.worker.terminate();
        s = initWorker();
        state = workerStateLens.set(state, s);
      } else {
        s.computingSvd = true;
      }
      const buffer = mkColorLens<Float64Array>().get(channels).buffer;
      s.worker.postMessage(protocol.makeSetInputReq({ a: buffer, m: m, n: n }), [buffer]);
      s.onmessage = function (msg) {
        s.approxSvd = msg.data as protocol.WorkerRes;
        if (state.red.approxSvd && state.green.approxSvd && state.blue.approxSvd) {
          callback({
            red: state.red.approxSvd,
            green: state.green.approxSvd,
            blue: state.blue.approxSvd,
            approx: true
          });
        }
        s.onmessage = function (msg) {
          s.fullSvd = msg.data;
          s.computingSvd = false;
          if (state.red.fullSvd && state.green.fullSvd && state.blue.fullSvd) {
            callback({
              red: state.red.fullSvd,
              green: state.green.fullSvd,
              blue: state.blue.fullSvd,
              approx: false
            });
          }
        };
        s.worker.postMessage(protocol.makeComputeSVDReq({ approx: false }));
      };
      s.worker.postMessage(protocol.makeComputeSVDReq({ approx: true }));
    }

    helper(types.mkRedLens);
    helper(types.mkGreenLens);
    helper(types.mkBlueLens);
  };
})();

const preload: (src: string) => void = (() => {
  const preloaded: { [src: string]: boolean } = {};

  return function(src: string) {
    if (preloaded[src]) { return; }
    const img = new Image();
    img.onload = function () {
      preloaded[src] = true;
      console.log("Preloaded image '" + src + "'");
    };
    img.src = src;
  };
})();

function loadImage(src: string, callback: (img: HTMLImageElement) => void) {
  const img = new Image();
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

interface FileInputFieldProps {
  label: string;
  onChange: (file: File) => void
}

class FileInputField extends React.Component<FileInputFieldProps, {}> {

  refs: {
    [key: string]: (Element);
    input: HTMLInputElement;
  }

  onChange() {
    const inputElement = ReactDOM.findDOMNode(this.refs.input) as HTMLInputElement;
    const files = inputElement.files;
    if (!files || !files[0]) { return; }
    if (this.props.onChange) { this.props.onChange(files[0]); }
  }

  render() {
    return (
      <span className="button file-input-button">
        <span>{this.props.label}</span>
        <input ref="input" type="file" accept="image/*" className="file-input" onChange={this.onChange.bind(this)} />
      </span>
    );
  }

}

interface GalleryImageDesc {
  name: string;
  caption: string;
  source: string;
  preview?: string;
  url?: string;
  quiz?: boolean;
}

interface FullGalleryImageDesc extends GalleryImageDesc {
  preview: string;
  quiz: boolean;
  width: number;
  height: number;
  url: string;
}

interface GalleryProps {
  onClick: (imgDesc: FullGalleryImageDesc) => void
  onScroll: (imgNum: number) => void
}

class Gallery extends React.Component<GalleryProps, {}> {

  getImages(): FullGalleryImageDesc[] {
    function quiz(obj: GalleryImageDesc): GalleryImageDesc {
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
        caption: 'Made with the KC-O-M',
        url: 'images/keep-calm-and-use-svd_medium.png',
        preview: 'images/keep-calm-and-use-svd_small.png',
        source: 'http://www.keepcalm-o-matic.co.uk/'
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
    ].map((obj: GalleryImageDesc, i: number) => {
      return {
        name: obj.name || 'image-'+i,
        width: 150,
        height: 150,
        url: obj.url || 'images/' + obj.name + '_medium.jpg',
        preview: obj.preview || 'images/' + obj.name + '_small.jpg',
        caption: obj.caption,
        source: obj.source,
        quiz: !!obj.quiz
      };
    }));
  }

  renderImage(img: FullGalleryImageDesc) {
    const onClick = (evt: React.MouseEvent<HTMLElement>) => {
      evt.preventDefault();
      if (this.props.onClick) { this.props.onClick(img); }
    };
    const onMouseOver = () => { preload(img.url); };

    return (
      <div className="image" key={img.name}>
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
  }

  render() {
    return (
      <Slider
        ref="slider"
        className="gallery"
        slidesToShow={5}
        slidesToScroll={5}
        draggable={false}
        infinite={false}
        afterChange={(this.props.onScroll as () => void) || (() => {}) /* we need the type assertion here because the typing definition is wrong */}
      >
        {this.getImages().map(this.renderImage.bind(this))}
      </Slider>
    );
  }

}

function galleryShowsGuessingPage(slideNum: number): boolean {
    return slideNum === 10;
};

interface SVSliderProps {
  value: number;
  maxSvs: number;
  max: number;
  onUpdate: (svs: number) => void
  onChange: (svs: number) => void
}

export class SVSlider extends React.Component<SVSliderProps, {}> {

  render() {
    return <div className="slider" />;
  }

  componentDidUpdate(prevProps: SVSliderProps, prevState: {}) {
    const noUiSlider = (ReactDOM.findDOMNode(this) as noUiSlider.Instance).noUiSlider;
    if (!noUiSlider) { return; }
    if (this.props.value !== SVSlider.getSliderValue(noUiSlider)) {
      // hacky
      noUiSlider.set(this.props.value);
    }
    if (this.props.maxSvs !== prevProps.maxSvs) {
      noUiSlider.destroy();
      this.buildSlider();
    }
  }

  componentDidMount() {
    this.buildSlider();
  }

  private static getSliderValue(noUiSlider: noUiSlider.noUiSlider): number {
    return Math.round(parseInt(noUiSlider.get() as string, 10));
  }

  private buildSlider() {
    const slider = ReactDOM.findDOMNode(this) as noUiSlider.Instance;
    noUiSlider.create(slider, this.getSliderOptions());

    const getSliderValue = () => SVSlider.getSliderValue(slider.noUiSlider);

    slider.noUiSlider.on('update', debounce(() => {
      const val = getSliderValue();
      if (val !== this.props.value) {
        if (this.props.onUpdate) { this.props.onUpdate(val); }
      }
    }, 50));
    slider.noUiSlider.on('change', debounce(() => {
      const val = getSliderValue();
      if (val !== this.props.value) {
        if (this.props.onChange) { this.props.onChange(val); }
      }
    }, 50));
  }

  private getSliderOptions(): noUiSlider.Options {
    const maxVal = this.props.max;
    const maxSvs = this.props.maxSvs;

    const values: number[] = [];
    for (let i = 1; i < 20; i++)           { values.push(i); }
    for (let i = 20; i < 100; i += 5)      { values.push(i); }
    for (let i = 100; i < maxVal; i += 10) { values.push(i); }
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
        filter: (v: number) => {
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

}

interface HoverCanvasViewProps {
  width: number;
  height: number;
}

interface HoverCanvasViewState {
  hover: boolean;
}

abstract class HoverCanvasView<P extends HoverCanvasViewProps, S extends HoverCanvasViewState>
  extends React.Component<P, S> {

  constructor(props: any) {
    super(props);
  }

  abstract paint(): void

  componentDidMount() {
    this.paint();
  }

  componentDidUpdate() {
    this.paint();
  }

  onMouseEnter() {
    this.setState({ hover: true });
  }

  onMouseOut() {
    this.setState({ hover: false });
  }

  render() {
    return (
      <canvas
        width={this.props.width}
        height={this.props.height}
        onMouseEnter={this.onMouseEnter.bind(this)}
        onMouseOut={this.onMouseOut.bind(this)}
      />
    );
  }

}

interface SVDViewProps extends HoverCanvasViewProps {
  numSvs: number;
  hoverToSeeOriginal: boolean;
  img: HTMLImageElement;
  svds: types.SVDs
}

class SVDView extends HoverCanvasView<SVDViewProps, HoverCanvasViewState> {

  private products: null | types.RGB<Float64Array> = null;
  private imageData: null | ImageData = null;

  private imageDataUpdates: number

  constructor(props: SVDViewProps) {
    super(props);
    this.state = { hover: false };
  }

  shouldComponentUpdate(nextProps: SVDViewProps, nextState: HoverCanvasViewState) {
    if (nextProps.svds !== this.props.svds) {
      // invalidate cached image data
      this.imageData = null;
      this.products = null;
    } else if (this.products && nextProps.numSvs !== this.props.numSvs) {
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
  }

  initProducts(): types.RGB<Float64Array> {
    const n = this.props.width, m = this.props.height;
    return {
      red:   new Float64Array(m*n),
      green: new Float64Array(m*n),
      blue:  new Float64Array(m*n)
    };
  }

  computeProductsFromScratch() {
    if (this.products) {
      imageSvd.multiplySvds(this.props.svds, this.products, 0, this.props.numSvs, 1);
      this.imageDataUpdates = 0;
    }
  }

  getProducts(): types.RGB<Float64Array> {
    if (this.products) {
      return this.products;
    } else {
      this.products = this.initProducts();
      this.computeProductsFromScratch();
      return this.products;
    }
  }

  refreshImageData() {
    if (this.imageDataUpdates >= 20) {
      this.computeProductsFromScratch();
      this.paint();
    }
  }

  paint() {
    const n = this.props.width, m = this.props.height;
    const ctx = (ReactDOM.findDOMNode(this) as HTMLCanvasElement).getContext('2d');
    if (!ctx) { return; }
    if (this.state.hover && this.props.hoverToSeeOriginal) {
      ctx.drawImage(this.props.img, 0, 0, n, m);
    } else {
      if (!this.imageData) {
        // storing image data saves ~10ms
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, n, m);
        this.imageData = ctx.getImageData(0, 0, n, m);
      }
      const data = this.imageData.data;
      const {red, green, blue} = this.getProducts();
      for (let y = 0; y < m; y++) {
        for (let x = 0; x < n; x++) {
          const i = y*n + x, j = 4*i;
          data[j]   = red[i];
          data[j+1] = green[i];
          data[j+2] = blue[i];
        }
      }
      ctx.putImageData(this.imageData, 0, 0);
    }
  }

}

interface SVSViewProps extends HoverCanvasViewProps {
  svds: types.SVDs;
  numSvs: number;
}

class SVSView extends HoverCanvasView<SVSViewProps, HoverCanvasViewState> {

  constructor(props: SVSViewProps) {
    super(props);
    this.state = { hover: false };
  }

  paint() {
    const w = this.props.width, h = this.props.height;
    const ctx = (ReactDOM.findDOMNode(this) as HTMLCanvasElement).getContext('2d');
    if (!ctx) { return; }
    const hover = this.state.hover;

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = hover ? 'rgb(90, 90, 90)' : 'rgba(90, 90, 90, 0.35)';
    ctx.fillRect(0, 0, w, h);

    const redSvs   = this.props.svds.red.s;
    const greenSvs = this.props.svds.green.s;
    const blueSvs  = this.props.svds.blue.s;
    const norm = (redSvs[5] + greenSvs[5] + blueSvs[5]) / (3*h);
    const numSvs = this.props.numSvs;
    const d = this.props.svds.red.d;

    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    for (let i = 0; i < d; i++) {
      const redV   = Math.round(redSvs[i]   / norm);
      const greenV = Math.round(greenSvs[i] / norm);
      const blueV  = Math.round(blueSvs[i]  / norm);
      const b = i < numSvs ? 30 : 0; // bonus
      for (let j = 0; j < h; j++) {
        const k = ((h-j)*w + i)*4;
        data[k]   = (j < redV   ? 225 : 100) + b;
        data[k+1] = (j < greenV ? 225 : 100) + b;
        data[k+2] = (j < blueV  ? 225 : 100) + b;
        data[k+3] = hover ? 255 : (data[k] + data[k+1] + data[k+2]) / 3;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

}

// returns a random element in [0, n)
function random(n: number): number {
  return Math.floor(Math.random() * n);
}

function randomColorFromImg(img: HTMLImageElement): string {
  const canvas = document.createElement('canvas');
  canvas.width  = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.drawImage(img, 0, 0);
  let r = 0, g = 0, b = 0;
  const n = 10;
  for (let i = 0; i < n; i++) {
    const x = random(img.width), y = random(img.height);
    const d = ctx.getImageData(x, y, 1, 1).data;
    r += d[0]; g += d[1]; b += d[2];
  }
  const fl = Math.floor;
  return 'rgb(' + fl(r/n) + ',' + fl(g/n) + ',' + fl(b/n) + ')';
}

interface PlaceholderProps {
  width: number;
  height: number;
  img: HTMLImageElement
}

class Placeholder extends React.Component<PlaceholderProps, {}> {

  render() {
    const color = randomColorFromImg(this.props.img);
    const style = {
      width: this.props.width,
      height: this.props.height,
      background: color
    };
    return <div className="placeholder" style={style} />;
  }

}

function getImageData(img: HTMLImageElement): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width  = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, img.width, img.height);
}

const firstImg = {
  w: 600, h: 402,
  src: 'images/mountains_sea.jpg',
  approxSrc: 'images/mountains_sea_5svs.jpg'
};

type Indexable<V> = {
  [key: number]: V
  length: number;
}

function contains<V, L extends Indexable<V>>(list: L, el: V): boolean {
  for (let i = 0; i < list.length; i++) {
    if (list[i] === el) { return true; }
  }
  return false;
}

interface AppState {
  width: number;
  height: number;
  placeholderImg: null | string;
  numSvs: number;
  approx: boolean;
  showSvs: boolean;
  error: string;
  hoverToSeeOriginal: boolean;
  guessingPage: boolean;
  hover: boolean;
  img: null | HTMLImageElement;
  svds: null | types.SVDs;
}

class App extends React.Component<{}, AppState> {

  refs: {
    [key: string]: (Element | React.Component<any, any>);
    svdView: SVDView;
  }

  constructor(props: any) {
    super(props);
    this.state = {
      width: firstImg.w,
      height: firstImg.h,
      placeholderImg: firstImg.approxSrc,
      numSvs: 5,
      approx: true,
      showSvs: false,
      error: "",
      hoverToSeeOriginal: true,
      guessingPage: false,
      hover: false,
      img: null,
      svds: null
    };
  }

  componentDidMount() {
    window.ondragover = this.onDragOver.bind(this);
    this.loadImage(firstImg.src, firstImg.approxSrc);
  }

  initializeImage(img: HTMLImageElement) {
    const {width, height} = img;

    let imageData: ImageData;
    try {
      imageData = getImageData(img);
    } catch (exc) {
      if (exc.message.match(/(tainted|cross\-origin|insecure)/)) {
        return window.alert("Due to browser limitations (cross-origin policy), it isn't possible use pictures dragged from other sites. You have to save the image locally before you can use it.");
      }
      throw exc; // rethrow
    }

    if (width > 1000 || height > 1000) {
      const msg = "Your image is quite large. Computing the SVD may take a while. Continue?";
      if (!window.confirm(msg)) { return; }
    }

    this.setState({ width, height, img, svds: null, error: "" } as AppState);
    const pxls = imageSvd.imageDataToPixels(imageData);

    computeSvds(height, width, pxls, (svds) => {
      this.setState({ svds: toFloat32Svds(svds), approx: svds.approx } as AppState);
    });
  }

  loadImage(url: string, placeholderImg: null | string = null) {
    this.setState({ placeholderImg } as AppState);
    loadImage(url, this.initializeImage.bind(this));
  }

  onDragOver(evt: React.DragEvent<HTMLElement> | DragEvent) {
    // without this, the drop event would not fire on the element!
    evt.preventDefault();

    if (!this.state.hover && evt.dataTransfer !== null) {
      const types = evt.dataTransfer.types;
      const error =
        contains(types, 'text/uri-list') || contains(types, 'Files')
          ? ""
          : "The dragged object is not an image!";
      this.setState({ hover: true, error } as AppState);
    }
  }

  onDragLeave(evt: React.MouseEvent<HTMLElement>) {
    this.setState({ hover: false, error: "" } as AppState);
  }

  onDrop(evt: React.DragEvent<HTMLElement>) {
    this.setState({ hover: false } as AppState);
    evt.preventDefault();

    const files = evt.dataTransfer.files;
    if (files && files.length > 0) {
      this.onFileChosen(files[0]);
    } else if (contains(evt.dataTransfer.types, 'text/uri-list')) {
      this.loadImage(evt.dataTransfer.getData('text/uri-list'));
    }
  }

  onFileChosen(file: File) {
    if (!file.type.match(/^image\/.*/)) {
      const error = "The chosen file is not an image! Try another file ...";
      this.setState({ error } as AppState);
      return;
    }
    this.setState({ error: "" } as AppState);
    const reader = new FileReader();
    reader.onload = (evt: Event) => {
      const target = evt.target as EventTarget & { result: string };
      this.loadImage(target.result);
    };
    reader.readAsDataURL(file);
  }

  onUpdateSvs(numSvs: number) {
    this.setState({ numSvs: numSvs } as AppState);
  }

  onChangeSvs(numSvs: number) {
    window.setTimeout(() => {
      this.refs.svdView.refreshImageData();
    }, 400);
  }

  clickShowSvs(evt: React.MouseEvent<HTMLElement>) {
    evt.preventDefault();
    this.setState({ showSvs: !this.state.showSvs } as AppState);
  }

  clickHoverToSeeOriginal(evt: React.MouseEvent<HTMLElement>) {
    evt.preventDefault();
    this.setState({ hoverToSeeOriginal: !this.state.hoverToSeeOriginal } as AppState);
  }

  onClickGallery(img: FullGalleryImageDesc) {
    if (img.quiz) {
      this.setState({ numSvs: 1 } as AppState);
    }
    this.loadImage(img.url);
  }

  onScrollGallery(slideNum: number) {
    const guessingPage = galleryShowsGuessingPage(slideNum);
    const transition = this.state.guessingPage !== guessingPage;
    if (transition) {
      this.setState({
        guessingPage,
        hoverToSeeOriginal: !guessingPage
      } as AppState);
    }
  }

  render() {
    const w = this.state.width, h = this.state.height;
    const {img, placeholderImg, numSvs} = this.state;

    let infoBar: null | string | JSX.Element = null;
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

    const imageContainerStyle = {
      width:  w + 240,
      height: h - 20
    };

    const dropTarget = (
      <div className={'drop-target ' + (this.state.error ? '' : 'active')}
           onDragOver={this.onDragOver.bind(this)}
           onDragLeave={this.onDragLeave.bind(this)}
           onDrop={this.onDrop.bind(this)} />
    );

    let mainImageView: null | React.Component<any, any> | JSX.Element = null;
    let maxSvs: number;
    if (this.state.svds && img) {
      mainImageView = <SVDView ref="svdView"
                               svds={this.state.svds} numSvs={numSvs}
                               width={w} height={h} img={img}
                               hoverToSeeOriginal={this.state.hoverToSeeOriginal} />;
      maxSvs = this.state.svds.red.d;
    } else { // the SVDs have not been computed yet
      maxSvs = 1;
      if (placeholderImg) {
        mainImageView = <img width={w} height={h} src={placeholderImg} />;
      } else if (img) {
        mainImageView = <Placeholder width={w} height={h} img={img} />;
      }
    }

    const compressedSize = h*numSvs + numSvs + numSvs*w;
    const stats = (
      <div className="stats" style={{ left: w + 20 }}>
        <table>
          <tbody>
            <tr>
              <th className="label">Image size</th>
              <td>{w} &times; {h}</td>
            </tr>
            <tr>
              <th className="label">#pixels</th>
              <td>= {w*h}</td>
            </tr>
          </tbody>
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
             href="#" onClick={this.clickShowSvs.bind(this)}>
            Show singular values
          </a>
        </p>
        <p className="hint">
          <a className={'toggle-hover-original ' + (this.state.hoverToSeeOriginal ? 'active' : '')}
             href="#" onClick={this.clickHoverToSeeOriginal.bind(this)}>
            <span className="check-box">
              {this.state.hoverToSeeOriginal
                ? <span>☑</span>
                : <span>☐</span>}
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
          {mainImageView ? mainImageView : ""}
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
                      onUpdate={this.onUpdateSvs.bind(this)}
                      onChange={this.onChangeSvs.bind(this)}
                      max={Math.min(w,h)} />
          </div>
          <p>
            {this.state.guessingPage
              ? "How many singular values do you need to recognize the subject of these pictures?"
              : "Change the number of singular values using the slider. Click on one of these images to compress it:"}
          </p>
          <Gallery ref="gallery"
            onClick={this.onClickGallery.bind(this)}
            onScroll={this.onScrollGallery.bind(this)} />
          <p>
            <span className="valign">You can compress your own images by using the</span>
            <FileInputField onChange={this.onFileChosen.bind(this)} label="file picker" />
            <span className="valign">or by dropping them on this page.</span>
          </p>
        </div>
      </div>
    );
  }

}

ReactDOM.render(<App />, document.getElementById('app'));
