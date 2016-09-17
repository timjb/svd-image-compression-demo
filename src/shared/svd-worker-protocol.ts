import types = require('./types');

interface BaseReq<s> {
  msg: s
}

export interface SetInputArgs {
  m: number;
  n: number;
  a: ArrayBuffer;
}

export type SetInputReq = BaseReq<"set-input"> & SetInputArgs;

export function makeSetInputReq(args: SetInputArgs): SetInputReq {
  return {
    msg: "set-input",
    a: args.a,
    m: args.m,
    n: args.n
  };
}

interface ComputeSVDArgs {
    approx: boolean;
}

export type ComputeSVDReq = BaseReq<"compute-svd"> & ComputeSVDArgs;

export function makeComputeSVDReq(args: ComputeSVDArgs): ComputeSVDReq {
  return {
    msg: "compute-svd",
    approx: args.approx
  };
}

export type WorkerReq = SetInputReq | ComputeSVDReq;

export type SVDRes = types.SVD64;

export type WorkerRes = SVDRes;