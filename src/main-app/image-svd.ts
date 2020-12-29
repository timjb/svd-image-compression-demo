import * as types from "../shared/types";

export function imageDataToPixels(imageData: ImageData): types.RGB<Float64Array> {
  const n = imageData.width,
    m = imageData.height;
  const red = new Float64Array(m * n);
  const green = new Float64Array(m * n);
  const blue = new Float64Array(m * n);
  let i = 0;
  for (let y = 0; y < m; y++) {
    for (let x = 0; x < n; x++) {
      const q = x * m + y;
      red[q] = imageData.data[i];
      green[q] = imageData.data[i + 1];
      blue[q] = imageData.data[i + 2];
      i += 4; // skip alpha value
    }
  }
  return { red: red, green: green, blue: blue };
}

// updates the image data to include (f=1) or exclude (f=-1)
// svs in range [l, u)
export function multiplySvds(
  svds: types.SVDs,
  products: types.RGB<Float64Array>,
  l: number,
  u: number,
  sign: number, // one of [1,-1]
): void {
  const timerName = "multiplySvds" + Math.round(Math.random() * 100);
  console.time(timerName);

  const redSvd = svds.red,
    greenSvd = svds.green,
    blueSvd = svds.blue;
  const { n, m, d } = redSvd;
  u = Math.min(u, d);
  const redU = redSvd.u,
    redVt = redSvd.vt,
    redS = redSvd.s;
  const greenU = greenSvd.u,
    greenVt = greenSvd.vt,
    greenS = greenSvd.s;
  const blueU = blueSvd.u,
    blueVt = blueSvd.vt,
    blueS = blueSvd.s;
  const redProd = products.red,
    greenProd = products.green,
    blueProd = products.blue;

  for (let y = 0; y < m; y++) {
    for (let x = 0; x < n; x++) {
      let r = 0,
        g = 0,
        b = 0;
      for (let k = u - 1; k >= l; k--) {
        r += redU[k * m + y] * redS[k] * redVt[x * d + k];
        g += greenU[k * m + y] * greenS[k] * greenVt[x * d + k];
        b += blueU[k * m + y] * blueS[k] * blueVt[x * d + k];
      }

      const i = y * n + x;
      redProd[i] += r * sign;
      greenProd[i] += g * sign;
      blueProd[i] += b * sign;
    }
  }

  console.timeEnd(timerName);
}
