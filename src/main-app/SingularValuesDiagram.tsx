import { HoverCanvasView, HoverCanvasViewState, HoverCanvasViewProps } from "./HoverCanvasView";
import { RGB } from "./rgb";

export interface SingularValuesDiagramProps extends HoverCanvasViewProps {
  singularValues: RGB<Float64Array>;
  numSvs: number;
}

export class SingularValuesDiagram extends HoverCanvasView<
  SingularValuesDiagramProps,
  HoverCanvasViewState
> {
  constructor(props: SingularValuesDiagramProps) {
    super(props);
    this.state = { hover: false };
  }
  paint(ctx: CanvasRenderingContext2D): void {
    const w = this.props.width,
      h = this.props.height;
    if (!ctx) {
      return;
    }
    const hover = this.state.hover;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = hover ? "rgb(90, 90, 90)" : "rgba(90, 90, 90, 0.35)";
    ctx.fillRect(0, 0, w, h);
    const redSvs = this.props.singularValues.red;
    const greenSvs = this.props.singularValues.green;
    const blueSvs = this.props.singularValues.blue;
    const norm = (redSvs[5] + greenSvs[5] + blueSvs[5]) / (3 * h);
    const numSvs = this.props.numSvs;
    const d = redSvs.length;
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    for (let i = 0; i < d; i++) {
      const redV = Math.round(redSvs[i] / norm);
      const greenV = Math.round(greenSvs[i] / norm);
      const blueV = Math.round(blueSvs[i] / norm);
      const b = i < numSvs ? 30 : 0; // bonus
      for (let j = 0; j < h; j++) {
        const k = ((h - j) * w + i) * 4;
        data[k] = (j < redV ? 225 : 100) + b;
        data[k + 1] = (j < greenV ? 225 : 100) + b;
        data[k + 2] = (j < blueV ? 225 : 100) + b;
        data[k + 3] = hover ? 255 : (data[k] + data[k + 1] + data[k + 2]) / 3;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }
}
