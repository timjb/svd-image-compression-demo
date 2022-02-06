import * as React from "react";
import { Gallery, FullGalleryImageDesc } from "./Gallery";
import * as imageSvd from "./image-svd";
import { SingularValuesSlider } from "./SingularValuesSlider";
import { FileInputField } from "./FileInputField";
import { SvdApproximation } from "./SvdApproximation";
import { SingularValuesDiagram } from "./SingularValuesDiagram";
import { ImagePlaceholder } from "./ImagePlaceholder";
import { SvdComputationManager, SvdInfo } from "./svdComputationManager";

function loadImage(src: string, callback: (img: HTMLImageElement) => void): void {
  const img = new Image();
  img.onload = (): void => {
    callback(img);
  };
  if (/^http/.test(src)) {
    console.log("cors");
    // absolute url: use CORS proxy http://crossorigin.me
    img.crossOrigin = "anonymous";
    img.src = "http://crossorigin.me/" + src;
  } else {
    // relative url: load directly
    img.src = src;
  }
}

function galleryShowsGuessingPage(slideNum: number): boolean {
  return slideNum === 10;
}

function getImageData(img: HTMLImageElement): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, img.width, img.height);
}

const firstImg = {
  w: 600,
  h: 402,
  src: "example-images/mountains_sea.jpg",
  approxSrc: "example-images/mountains_sea_5svs.jpg",
};

type Indexable<V> = {
  [key: number]: V;
  length: number;
};

function contains<V, L extends Indexable<V>>(list: L, el: V): boolean {
  for (let i = 0; i < list.length; i++) {
    if (list[i] === el) {
      return true;
    }
  }
  return false;
}

enum SvdStatus {
  CURRENTLY_COMPUTING = "CURRENTLY_COMPUTING",
  COMPUTED = "COMPUTED",
}

interface SvdStateCurrentlyComputing {
  status: SvdStatus.CURRENTLY_COMPUTING;
}

interface SvdStateComputed extends SvdInfo {
  status: SvdStatus.COMPUTED;
}

interface AppState {
  width: number;
  height: number;
  placeholderImg: null | string;
  numSvs: number;
  showSvs: boolean;
  error: string;
  hoverToSeeOriginal: boolean;
  guessingPage: boolean;
  hover: boolean;
  img: null | HTMLImageElement;
  svdState: SvdState;
}

type AppProps = Record<string, unknown>;

type SvdState = SvdStateCurrentlyComputing | SvdStateComputed;

export class App extends React.Component<AppProps, AppState> {
  private svdViewRef: React.RefObject<SvdApproximation>;
  private svdComputationManager: SvdComputationManager;

  constructor(props: AppProps) {
    super(props);
    this.state = {
      width: firstImg.w,
      height: firstImg.h,
      placeholderImg: firstImg.approxSrc,
      numSvs: 5,
      showSvs: false,
      error: "",
      hoverToSeeOriginal: true,
      guessingPage: false,
      hover: false,
      img: null,
      svdState: { status: SvdStatus.CURRENTLY_COMPUTING },
    };
    this.svdViewRef = React.createRef();
    this.svdComputationManager = new SvdComputationManager((svdInfo) => {
      this.setState({
        svdState: { status: SvdStatus.COMPUTED, ...svdInfo },
      });
    });
    this.svdComputationManager.setRank(this.state.numSvs);
  }

  componentDidMount(): void {
    window.ondragover = this.onDragOver.bind(this);
    this.loadImage(firstImg.src, firstImg.approxSrc);
  }

  initializeImage(img: HTMLImageElement): void {
    console.trace("initializeImage");
    const { width, height } = img;

    let imageData: ImageData;
    try {
      imageData = getImageData(img);
    } catch (exc) {
      if (exc instanceof Error && exc.message.match(/(tainted|cross-origin|insecure)/)) {
        return window.alert(
          "Due to browser limitations (cross-origin policy), it isn't possible use pictures dragged from other sites. You have to save the image locally before you can use it.",
        );
      }
      throw exc; // rethrow
    }

    if (width > 1000 || height > 1000) {
      const msg = "Your image is quite large. Computing the SVD may take a while. Continue?";
      if (!window.confirm(msg)) {
        return;
      }
    }

    const pxls = imageSvd.imageDataToPixels(imageData);
    this.setState({
      width,
      height,
      img,
      error: "",
      svdState: { status: SvdStatus.CURRENTLY_COMPUTING },
    } as AppState);
    this.svdComputationManager.computeSvd(height, width, pxls);
  }

  loadImage(url: string, placeholderImg: null | string = null): void {
    this.setState({ placeholderImg } as AppState);
    loadImage(url, this.initializeImage.bind(this));
  }

  onDragOver(evt: React.DragEvent<HTMLElement> | DragEvent): void {
    // without this, the drop event would not fire on the element!
    evt.preventDefault();

    if (!this.state.hover && evt.dataTransfer !== null) {
      const types = evt.dataTransfer.types;
      const error =
        contains(types, "text/uri-list") || contains(types, "Files")
          ? ""
          : "The dragged object is not an image!";
      this.setState({ hover: true, error } as AppState);
    }
  }

  onDragLeave(): void {
    this.setState({ hover: false, error: "" } as AppState);
  }

  onDrop(evt: React.DragEvent<HTMLElement>): void {
    this.setState({ hover: false } as AppState);
    evt.preventDefault();

    const files = evt.dataTransfer.files;
    if (files && files.length > 0) {
      this.onFileChosen(files[0]);
    } else if (contains(evt.dataTransfer.types, "text/uri-list")) {
      this.loadImage(evt.dataTransfer.getData("text/uri-list"));
    }
  }

  onFileChosen(file: File): void {
    if (!file.type.match(/^image\/.*/)) {
      const error = "The chosen file is not an image! Try another file ...";
      this.setState({ error } as AppState);
      return;
    }
    this.setState({ error: "" } as AppState);
    const reader = new FileReader();
    reader.onload = (evt: Event): void => {
      const target = evt.target as EventTarget & { result: string };
      this.loadImage(target.result);
    };
    reader.readAsDataURL(file);
  }

  onUpdateSvs(numSvs: number): void {
    this.svdComputationManager.setRank(numSvs);
    this.setState({ numSvs: numSvs } as AppState);
  }

  clickShowSvs(evt: React.MouseEvent<HTMLElement>): void {
    evt.preventDefault();
    this.setState({ showSvs: !this.state.showSvs } as AppState);
  }

  clickHoverToSeeOriginal(evt: React.MouseEvent<HTMLElement>): void {
    evt.preventDefault();
    this.setState({ hoverToSeeOriginal: !this.state.hoverToSeeOriginal } as AppState);
  }

  onClickGallery(img: FullGalleryImageDesc): void {
    if (img.quiz) {
      this.setState({ numSvs: 1 } as AppState);
    }
    this.loadImage(img.url);
  }

  onScrollGallery(slideNum: number): void {
    const guessingPage = galleryShowsGuessingPage(slideNum);
    const transition = this.state.guessingPage !== guessingPage;
    if (transition) {
      this.setState({
        guessingPage,
        hoverToSeeOriginal: !guessingPage,
      } as AppState);
    }
  }

  render(): JSX.Element {
    const w = this.state.width,
      h = this.state.height;
    const { img, placeholderImg, numSvs } = this.state;

    let infoBar: null | string | JSX.Element = null;
    if (this.state.error) {
      infoBar = this.state.error;
    } else if (this.state.hover) {
      infoBar = "Drop now!";
    } else if (this.state.svdState.status === SvdStatus.CURRENTLY_COMPUTING) {
      infoBar = <span>Please wait &hellip;</span>;
    } else if (this.state.svdState.isApproximation) {
      infoBar = (
        <span>
          Showing approximate SVD &nbsp;
          <img src="spinner.gif" width="16" height="16" />
          &nbsp; Computing precise result &hellip;
        </span>
      );
    }

    const imageContainerStyle = {
      width: w + 240,
      height: h - 20,
    };

    const dropTarget = (
      <div
        className={"drop-target " + (this.state.error ? "" : "active")}
        onDragOver={this.onDragOver.bind(this)}
        onDragLeave={this.onDragLeave.bind(this)}
        onDrop={this.onDrop.bind(this)}
      />
    );

    let mainImageView: null | React.Component | JSX.Element = null;
    let maxSvs: number;
    if (
      this.state.svdState.status === SvdStatus.COMPUTED &&
      this.state.svdState.lowRankApproximation !== undefined &&
      img
    ) {
      mainImageView = (
        <SvdApproximation
          ref={this.svdViewRef}
          lowRankApproximation={this.state.svdState.lowRankApproximation}
          width={w}
          height={h}
          img={img}
          hoverToSeeOriginal={this.state.hoverToSeeOriginal}
        />
      );
      maxSvs = this.state.svdState.singularValues.red.length;
    } else {
      // the SVDs have not been computed yet
      maxSvs = 1;
      if (placeholderImg) {
        mainImageView = <img width={w} height={h} src={placeholderImg} />;
      } else if (img) {
        mainImageView = <ImagePlaceholder width={w} height={h} img={img} />;
      }
    }

    const compressedSize = h * numSvs + numSvs + numSvs * w;
    const stats = (
      <div className="stats" style={{ left: w + 20 }}>
        <table>
          <tbody>
            <tr>
              <th className="label">Image size</th>
              <td>
                {w} &times; {h}
              </td>
            </tr>
            <tr>
              <th className="label">#pixels</th>
              <td>= {w * h}</td>
            </tr>
          </tbody>
        </table>
        <p>
          <span className="label">Uncompressed size</span>
          <br />
          proportional to number of pixels
        </p>
        <p>
          <span className="label">Compressed size</span>
          <br />
          approximately proportional to <br />
          {h}&thinsp;&times;&thinsp;{numSvs} + {numSvs} + {numSvs}&thinsp;&times;&thinsp;{w} <br />={" "}
          {compressedSize}
        </p>
        <p>
          <span className="label">Compression ratio</span>
          <br />
          {w * h} / {compressedSize} = {((w * h) / compressedSize).toFixed(2)}
        </p>
        <p>
          <a
            className={"button toggle-show-svs " + (this.state.showSvs ? "active" : "")}
            href="#"
            onClick={this.clickShowSvs.bind(this)}
          >
            Show singular values
          </a>
        </p>
        <p className="hint">
          <a
            className={"toggle-hover-original " + (this.state.hoverToSeeOriginal ? "active" : "")}
            href="#"
            onClick={this.clickHoverToSeeOriginal.bind(this)}
          >
            <span className="check-box">
              {this.state.hoverToSeeOriginal ? <span>☑</span> : <span>☐</span>}
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
          {this.state.svdState.status === SvdStatus.COMPUTED && this.state.showSvs ? (
            <SingularValuesDiagram
              singularValues={this.state.svdState.singularValues}
              numSvs={numSvs}
              width={w}
              height={h}
            />
          ) : (
            ""
          )}
          {infoBar ? <p className="info-bar">{infoBar}</p> : ""}
          {stats}
        </div>
        <div className="wrapper">
          <div className="options">
            <SingularValuesSlider
              value={numSvs}
              maxSvs={maxSvs}
              onUpdate={this.onUpdateSvs.bind(this)}
              max={Math.min(w, h)}
            />
          </div>
          <p>
            {this.state.guessingPage
              ? "How many singular values do you need to recognize the subject of these pictures?"
              : "Change the number of singular values using the slider. Click on one of these images to compress it:"}
          </p>
          <Gallery
            onClick={this.onClickGallery.bind(this)}
            onScroll={this.onScrollGallery.bind(this)}
          />
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
