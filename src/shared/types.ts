interface BaseSVD<ArrayType> {
  d: number;
  m: number;
  n: number;
  u: ArrayType;
  s: ArrayType;
  vt: ArrayType;
}

export interface Lens<S, A> {
  get: (s: S) => A;
  set: (s: S, a: A) => S;
}

export interface RGB<X> {
  red: X;
  green: X;
  blue: X;
}

export function mkRedLens<X>(): Lens<RGB<X>, X> {
  return {
    get: ({ red }): X => red,
    set: ({ green, blue }, red): RGB<X> => ({ red, green, blue }),
  };
}

export function mkGreenLens<X>(): Lens<RGB<X>, X> {
  return {
    get: ({ green }): X => green,
    set: ({ red, blue }, green): RGB<X> => ({ red, green, blue }),
  };
}

export function mkBlueLens<X>(): Lens<RGB<X>, X> {
  return {
    get: ({ blue }): X => blue,
    set: ({ red, green }, blue): RGB<X> => ({ red, green, blue }),
  };
}

export type SVD = BaseSVD<Float32Array>;
export type SVD64 = BaseSVD<Float64Array>;

export type SVDs = RGB<SVD>;
export type SVDs64 = RGB<SVD64>;
