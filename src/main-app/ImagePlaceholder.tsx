import * as React from "react";

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

export interface ImagePlaceholderProps {
  width: number;
  height: number;
  img: HTMLImageElement
}

export class ImagePlaceholder extends React.Component<ImagePlaceholderProps, {}> {
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
