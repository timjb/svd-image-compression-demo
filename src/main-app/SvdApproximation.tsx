import { HoverCanvasView, HoverCanvasViewState, HoverCanvasViewProps } from "./HoverCanvasView";
import { RGB } from "./rgb";

export interface SvdApproximationProps extends HoverCanvasViewProps {
  hoverToSeeOriginal: boolean;
  img: HTMLImageElement;
  lowRankApproximation: RGB<Float64Array>;
}

export class SvdApproximation extends HoverCanvasView<SvdApproximationProps, HoverCanvasViewState> {
  private imageData: null | ImageData = null;
  constructor(props: SvdApproximationProps) {
    super(props);
    this.state = { hover: false };
  }
  shouldComponentUpdate(nextProps: SvdApproximationProps): boolean {
    if (nextProps.width !== this.props.width || nextProps.height !== this.props.height) {
      // invalidate cached image data
      this.imageData = null;
    }
    return true;
  }
  paint(ctx: CanvasRenderingContext2D): void {
    const n = this.props.width,
      m = this.props.height;
    if (!ctx) {
      return;
    }
    if (this.state.hover && this.props.hoverToSeeOriginal) {
      ctx.drawImage(this.props.img, 0, 0, n, m);
    } else {
      if (!this.imageData) {
        // storing image data saves ~10ms
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, n, m);
        this.imageData = ctx.getImageData(0, 0, n, m);
      }
      const data = this.imageData.data;
      const { red, green, blue } = this.props.lowRankApproximation;
      let j = 0;
      for (let y = 0; y < m; y++) {
        for (let x = 0; x < n; x++) {
          const l = m * x + y;
          data[j] = red[l];
          data[j + 1] = green[l];
          data[j + 2] = blue[l];
          j += 4;
        }
      }
      ctx.putImageData(this.imageData, 0, 0);
    }
  }
}
