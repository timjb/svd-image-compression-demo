import protocol = require('../shared/svd-worker-protocol');
import types = require('../shared/types');

function start(): Worker { return new Worker('build/svd-worker.js'); }

interface WorkerState {
  computingSvd: boolean;
  worker: Worker;
  onmessage: (event: MessageEvent) => void;
  approxSvd: null | types.SVD64;
  fullSvd: null | types.SVD64;
}

function initWorker(): WorkerState {
  const s: WorkerState = {
    computingSvd: false,
    worker: start(),
    onmessage: () => { /* do nothing */ },
    approxSvd: null,
    fullSvd: null
  };
  s.worker.onmessage = (res): void => {
    s.onmessage(res);
  };
  return s;
}

let state: types.RGB<WorkerState> = {
  red: initWorker(),
  green: initWorker(),
  blue: initWorker()
};

export function computeSvds(
  m: number, n: number, channels: types.RGB<Float64Array>,
  callback: (res: types.SVDs64 & { approx: boolean }) => void
): void {
  /* It would be great if the web worker API allowed one to simply abort the
      current task a worker is executing by e.g. throwing an exception in the
      worker. With this, all the initialization and memory allocation of
      Emscripten associated with a complete restart could be avoided. */

  function helper(mkColorLens: <X>() => types.Lens<types.RGB<X>, X>): void {
    const workerStateLens = mkColorLens<WorkerState>();
    let s = workerStateLens.get(state);
    if (s.computingSvd) {
      s.worker.terminate();
      s = initWorker();
      state = workerStateLens.set(state, s);
    } else {
      s.computingSvd = true;
    }
    const buffer = mkColorLens<Float64Array>().get(channels).buffer;
    s.worker.postMessage(protocol.makeSetInputReq({ a: buffer, m: m, n: n }), [buffer]);
    s.onmessage = (msg): void => {
      s.approxSvd = msg.data as protocol.WorkerRes;
      if (state.red.approxSvd && state.green.approxSvd && state.blue.approxSvd) {
        callback({
          red: state.red.approxSvd,
          green: state.green.approxSvd,
          blue: state.blue.approxSvd,
          approx: true
        });
      }
      s.onmessage = (msg): void => {
        s.fullSvd = msg.data;
        s.computingSvd = false;
        if (state.red.fullSvd && state.green.fullSvd && state.blue.fullSvd) {
          callback({
            red: state.red.fullSvd,
            green: state.green.fullSvd,
            blue: state.blue.fullSvd,
            approx: false
          });
        }
      };
      s.worker.postMessage(protocol.makeComputeSVDReq({ approx: false }));
    };
    s.worker.postMessage(protocol.makeComputeSVDReq({ approx: true }));
  }

  helper(types.mkRedLens);
  helper(types.mkGreenLens);
  helper(types.mkBlueLens);
}
