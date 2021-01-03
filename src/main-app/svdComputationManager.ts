import SvdWorker from "worker-loader!../web-worker/svd-worker";
import {
  makeComputeLowRankApproximationReq,
  makeComputeSvdReq,
  WorkerRes,
  WorkerResType,
} from "../shared/svd-worker-protocol";
import { createRGB, RGB, rgbAp, rgbMap, rgbPromiseAll } from "./rgb";

class SvdWorkerManager {
  private worker: Worker;
  private nextMessageHandlers: ((res: WorkerRes) => void)[] = [];

  constructor() {
    this.worker = this.createWorker();
  }

  private createWorker(): Worker {
    const worker = new SvdWorker();
    worker.onmessage = (event) => {
      this.onMessage(event);
    };
    return worker;
  }

  onMessage(event: MessageEvent) {
    if (this.nextMessageHandlers.length > 0) {
      this.nextMessageHandlers.shift()?.(event.data as WorkerRes);
    }
  }

  computeSvd(m: number, n: number, channel: Float64Array, approx: boolean): Promise<Float64Array> {
    const buffer = channel.buffer;
    if (this.nextMessageHandlers.length > 0) {
      // currently computing something
      this.worker.onmessage = () => {
        // do nothing
      };
      this.worker.terminate();
      this.worker = this.createWorker();
      this.nextMessageHandlers = [];
    }
    this.worker.postMessage(makeComputeSvdReq({ a: buffer, m: m, n: n, approx }), [buffer]);
    return new Promise((resolve, reject) => {
      this.nextMessageHandlers.push((res) => {
        if (res.msg !== WorkerResType.SINGULAR_VALUES) {
          return reject(
            new Error(
              `expected to get response of type '${WorkerResType.SINGULAR_VALUES}' from worker!`,
            ),
          );
        }
        resolve(res.singularValues);
      });
    });
  }

  computeLowRankApproximation(rank: number): Promise<Float64Array> {
    return new Promise((resolve, reject) => {
      this.nextMessageHandlers.push((res) => {
        if (res.msg !== WorkerResType.LOW_RANK_APPROXIMATION) {
          return reject(
            new Error(
              `expected to get response of type '${WorkerResType.LOW_RANK_APPROXIMATION}' from worker!`,
            ),
          );
        }
        resolve(res.lowRankApproximation);
      });
      this.worker.postMessage(makeComputeLowRankApproximationReq(rank));
    });
  }
}

export interface SvdInfo {
  isApproximation: boolean;
  singularValues: RGB<Float64Array>;
  lowRankApproximation: RGB<Float64Array>;
}

export class SvdComputationManager {
  private approxWorkerManagers: RGB<SvdWorkerManager>;
  private exactWorkerManagers: RGB<SvdWorkerManager>;
  private requestedRank = 0;
  private approximateResult: Pick<SvdInfo, "singularValues"> | undefined = undefined;
  private exactResult:
    | (Pick<SvdInfo, "singularValues"> & {
        computedLowRankApproximation: boolean;
        currentlyComputingLowRankApproximation: boolean;
      })
    | undefined = undefined;

  constructor(private onUpdate: (info: SvdInfo) => void) {
    this.approxWorkerManagers = createRGB(() => new SvdWorkerManager());
    this.exactWorkerManagers = createRGB(() => new SvdWorkerManager());
  }

  computeSvd(m: number, n: number, channels: RGB<Float64Array>): void {
    this.approximateResult = undefined;
    this.exactResult = undefined;

    const singularValuesApproxPromises = rgbAp(
      (workerManager, channel) => workerManager.computeSvd(m, n, Float64Array.from(channel), true),
      this.approxWorkerManagers,
      channels,
    );
    rgbPromiseAll(singularValuesApproxPromises).then((singularValues) => {
      this.approximateResult = { singularValues };
      this.setRank(this.requestedRank);
    });

    const singularValuesExactPromises = rgbAp(
      (workerManager, channel) => workerManager.computeSvd(m, n, channel, false),
      this.exactWorkerManagers,
      channels,
    );
    rgbPromiseAll(singularValuesExactPromises).then((singularValues) => {
      this.exactResult = {
        singularValues,
        computedLowRankApproximation: false,
        currentlyComputingLowRankApproximation: false,
      };
      this.setRank(this.requestedRank);
    });
  }

  private computeLowRankApproximation(
    workerManagers: RGB<SvdWorkerManager>,
    rank: number,
  ): Promise<RGB<Float64Array>> {
    const promises = rgbMap(
      (workerManager) => workerManager.computeLowRankApproximation(rank),
      workerManagers,
    );
    return rgbPromiseAll(promises);
  }

  setRank(rank: number): void {
    this.requestedRank = rank;
    if (this.exactResult !== undefined) {
      if (this.exactResult.currentlyComputingLowRankApproximation) {
        return;
      }
      this.exactResult = { ...this.exactResult, currentlyComputingLowRankApproximation: true };
      this.computeLowRankApproximation(this.exactWorkerManagers, rank).then(
        (lowRankApproximation) => {
          if (this.exactResult !== undefined) {
            this.exactResult = {
              ...this.exactResult,
              computedLowRankApproximation: true,
              currentlyComputingLowRankApproximation: false,
            };
            this.onUpdate({
              isApproximation: false,
              lowRankApproximation,
              singularValues: this.exactResult.singularValues,
            });
            if (this.requestedRank !== rank) {
              this.setRank(this.requestedRank);
            }
          }
        },
      );
    } else if (this.approximateResult !== undefined) {
      this.computeLowRankApproximation(this.approxWorkerManagers, rank).then(
        (lowRankApproximation) => {
          if (
            this.approximateResult !== undefined &&
            (this.exactResult === undefined || !this.exactResult.computedLowRankApproximation)
          ) {
            this.onUpdate({
              isApproximation: true,
              lowRankApproximation,
              singularValues: this.approximateResult.singularValues,
            });
          }
        },
      );
    }
  }
}
