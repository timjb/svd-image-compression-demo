import { SvdResult } from "svd-image-compression-worker";
import {
  makeLowRankApproximationRes,
  makeSingularValuesRes,
  WorkerReq,
  WorkerReqType,
} from "../shared/svd-worker-protocol";

const APPROX_NUM_SINGULAR_VALUES = 50;

let struct: SvdResult | undefined = undefined;

function svd(a: Float64Array, m: number, n: number, approx: boolean): void {
  const d = approx ? Math.min(Math.min(m, n), APPROX_NUM_SINGULAR_VALUES) : Math.min(m, n);

  import("svd-image-compression-worker").then(
    (wasm) => {
      wasm.set_panic_hook();
      struct?.free();
      const svdStruct = (struct = approx ? wasm.svd_simple_approx(a, m, n, d) : wasm.svd(a, m, n));
      const singularValues = svdStruct.singular_values();
      postMessage(makeSingularValuesRes(singularValues));
    },
    (e) => {
      console.log("Could not load WASM module! Error: ", e);
    },
  );
}

onmessage = (event: MessageEvent): void => {
  const data = event.data as WorkerReq;
  const type = data.msg;
  switch (data.msg) {
    case WorkerReqType.COMPUTE_SVD: {
      svd(new Float64Array(data.a), data.m, data.n, data.approx);
      break;
    }
    case WorkerReqType.COMPUTE_LOW_RANK_APPROXIMATION: {
      if (struct === undefined) {
        throw new Error(`'${WorkerReqType.COMPUTE_SVD}' must come first!`);
      }
      const lowRankApproximation = struct.compute_low_rank_approximation(data.rank);
      postMessage(makeLowRankApproximationRes(lowRankApproximation));
      break;
    }
    default:
      throw new Error(`unrecognized command '${type}'!`);
  }
};
