import { RGB } from "./rgb";

export function imageDataToPixels(imageData: ImageData): RGB<Float64Array> {
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
