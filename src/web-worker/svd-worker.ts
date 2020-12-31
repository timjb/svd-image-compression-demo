import { SvdResult } from "svd-image-compression-worker";
import * as protocol from "../shared/svd-worker-protocol";

const APPROX_NUM_SINGULAR_VALUES = 50;

let input: null | {
  a: Float64Array;
  m: number;
  n: number;
} = null;

let approxStruct: SvdResult | undefined = undefined;
let fullStruct: SvdResult | undefined = undefined;

function svd(a: Float64Array, m: number, n: number, approx: boolean): void {
  const d = approx ? Math.min(Math.min(m, n), APPROX_NUM_SINGULAR_VALUES) : Math.min(m, n);

  import("svd-image-compression-worker").then(
    (wasm) => {
      if (approx) {
        approxStruct?.free();
      } else {
        fullStruct?.free();
      }

      const svdStruct = approx ? wasm.svd_simple_approx(a, m, n, d) : wasm.svd(a, m, n);

      if (approx) {
        approxStruct = svdStruct;
      } else {
        fullStruct = svdStruct;
      }

      const arr_u = svdStruct.u();
      const arr_s = svdStruct.singular_values();
      const arr_vt = svdStruct.v_t();

      const svdMessage: protocol.WorkerRes = { u: arr_u, s: arr_s, vt: arr_vt, d, m, n };
      postMessage(svdMessage);
    },
    (e) => {
      console.log("Could not load WASM module! Error: ", e);
    },
  );
}

onmessage = (event: MessageEvent): void => {
  const data = event.data as protocol.WorkerReq;
  if (data.msg === "set-input") {
    input = { a: new Float64Array(data.a), m: data.m, n: data.n };
  } else if (data.msg === "compute-svd") {
    if (!input) {
      throw new Error("set-input must come first!");
    }
    svd(input.a, input.m, input.n, data.approx);
  } else {
    throw new Error("unrecognized command!");
  }
};
