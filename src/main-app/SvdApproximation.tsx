import imageSvd = require('./image-svd');
import types = require('../shared/types');
import { HoverCanvasView, HoverCanvasViewState, HoverCanvasViewProps } from "./HoverCanvasView";

export interface SvdApproximationProps extends HoverCanvasViewProps {
  numSvs: number;
  hoverToSeeOriginal: boolean;
  img: HTMLImageElement;
  svds: types.SVDs;
}

export class SvdApproximation extends HoverCanvasView<SvdApproximationProps, HoverCanvasViewState> {
  private products: null | types.RGB<Float64Array> = null;
  private imageData: null | ImageData = null;
  private imageDataUpdates = 0;
  constructor(props: SvdApproximationProps) {
    super(props);
    this.state = { hover: false };
  }
  shouldComponentUpdate(nextProps: SvdApproximationProps): boolean {
    if (nextProps.svds !== this.props.svds) {
      // invalidate cached image data
      this.imageData = null;
      this.products = null;
    }
    else if (this.products && nextProps.numSvs !== this.props.numSvs) {
      // update cached image data
      if (nextProps.numSvs > this.props.numSvs) {
        this.imageDataUpdates++;
        imageSvd.multiplySvds(this.props.svds, this.products, this.props.numSvs, nextProps.numSvs, 1);
      }
      else if (this.props.numSvs - nextProps.numSvs < nextProps.numSvs) {
        this.imageDataUpdates++;
        imageSvd.multiplySvds(this.props.svds, this.products, nextProps.numSvs, this.props.numSvs, -1);
      }
      else {
        // it is cheaper to compute from scratch
        this.products = null;
      }
    }
    return true;
  }
  initProducts(): types.RGB<Float64Array> {
    const n = this.props.width, m = this.props.height;
    return {
      red: new Float64Array(m * n),
      green: new Float64Array(m * n),
      blue: new Float64Array(m * n)
    };
  }
  computeProductsFromScratch(): void {
    if (this.products) {
      imageSvd.multiplySvds(this.props.svds, this.products, 0, this.props.numSvs, 1);
      this.imageDataUpdates = 0;
    }
  }
  getProducts(): types.RGB<Float64Array> {
    if (this.products) {
      return this.products;
    }
    else {
      this.products = this.initProducts();
      this.computeProductsFromScratch();
      return this.products;
    }
  }
  refreshImageData(): void {
    if (this.imageDataUpdates >= 20) {
      this.computeProductsFromScratch();
      this.doPaint();
    }
  }
  paint(ctx: CanvasRenderingContext2D): void {
    const n = this.props.width, m = this.props.height;
    if (!ctx) {
      return;
    }
    if (this.state.hover && this.props.hoverToSeeOriginal) {
      ctx.drawImage(this.props.img, 0, 0, n, m);
    }
    else {
      if (!this.imageData) {
        // storing image data saves ~10ms
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, n, m);
        this.imageData = ctx.getImageData(0, 0, n, m);
      }
      const data = this.imageData.data;
      const { red, green, blue } = this.getProducts();
      for (let y = 0; y < m; y++) {
        for (let x = 0; x < n; x++) {
          const i = y * n + x, j = 4 * i;
          data[j] = red[i];
          data[j + 1] = green[i];
          data[j + 2] = blue[i];
        }
      }
      ctx.putImageData(this.imageData, 0, 0);
    }
  }
}
