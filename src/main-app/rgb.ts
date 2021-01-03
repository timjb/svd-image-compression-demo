export interface RGB<X> {
  red: X;
  green: X;
  blue: X;
}

export function createRGB<X>(createComponent: () => X): RGB<X> {
  return {
    red: createComponent(),
    green: createComponent(),
    blue: createComponent(),
  };
}

export function rgbMap<X, Y>(f: (x: X) => Y, xs: RGB<X>): RGB<Y> {
  return {
    red: f(xs.red),
    green: f(xs.green),
    blue: f(xs.blue),
  };
}

export function rgbAp<X, Y, Z>(f: (x: X, y: Y) => Z, xs: RGB<X>, ys: RGB<Y>): RGB<Z> {
  return {
    red: f(xs.red, ys.red),
    green: f(xs.green, ys.green),
    blue: f(xs.blue, ys.blue),
  };
}

function rgbToArray<X>({ red, green, blue }: RGB<X>): [X, X, X] {
  return [red, green, blue];
}

function arrayToRgb<X>([red, green, blue]: [X, X, X]): RGB<X> {
  return { red, green, blue };
}

export async function rgbPromiseAll<X>(promises: RGB<Promise<X>>): Promise<RGB<X>> {
  const resultsArray = await Promise.all(rgbToArray(promises));
  return arrayToRgb(resultsArray);
}
