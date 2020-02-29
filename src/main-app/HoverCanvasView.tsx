import * as React from "react";

export interface HoverCanvasViewProps {
  width: number;
  height: number;
}

export interface HoverCanvasViewState {
  hover: boolean;
}

export abstract class HoverCanvasView<
  P extends HoverCanvasViewProps,
  S extends HoverCanvasViewState
> extends React.Component<P, S> {
  private canvasRef: React.RefObject<HTMLCanvasElement>;
  constructor(props: P) {
    super(props);
    this.canvasRef = React.createRef();
  }
  abstract paint(ctx: CanvasRenderingContext2D): void;
  protected doPaint(): void {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const ctx = this.canvasRef.current!.getContext("2d")!;
    this.paint(ctx);
  }
  componentDidMount(): void {
    this.doPaint();
  }
  componentDidUpdate(): void {
    this.doPaint();
  }
  onMouseEnter(): void {
    this.setState({ hover: true });
  }
  onMouseOut(): void {
    this.setState({ hover: false });
  }
  render(): JSX.Element {
    return (
      <canvas
        ref={this.canvasRef}
        width={this.props.width}
        height={this.props.height}
        onMouseEnter={this.onMouseEnter.bind(this)}
        onMouseOut={this.onMouseOut.bind(this)}
      />
    );
  }
}
