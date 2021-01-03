export enum WorkerReqType {
  COMPUTE_SVD = "compute-svd",
  COMPUTE_LOW_RANK_APPROXIMATION = "compute-low-rank-approximation",
}

interface BaseReq<s extends WorkerReqType> {
  msg: s;
}

interface ComputeSvdArgs {
  m: number;
  n: number;
  a: ArrayBuffer;
  approx: boolean;
}

export type ComputeSvdReq = BaseReq<WorkerReqType.COMPUTE_SVD> & ComputeSvdArgs;

export function makeComputeSvdReq(args: ComputeSvdArgs): ComputeSvdReq {
  return {
    msg: WorkerReqType.COMPUTE_SVD,
    ...args,
  };
}

interface ComputeLowRankApproximationArgs {
  rank: number;
}

export type ComputeLowRankApproximationReq = BaseReq<WorkerReqType.COMPUTE_LOW_RANK_APPROXIMATION> &
  ComputeLowRankApproximationArgs;

export function makeComputeLowRankApproximationReq(rank: number): ComputeLowRankApproximationReq {
  return {
    msg: WorkerReqType.COMPUTE_LOW_RANK_APPROXIMATION,
    rank,
  };
}

export type WorkerReq = ComputeSvdReq | ComputeLowRankApproximationReq;

export enum WorkerResType {
  SINGULAR_VALUES = "SINGULAR-VALUES",
  LOW_RANK_APPROXIMATION = "LOW-RANK-APPROXIMATION",
}

interface BaseRes<s extends WorkerResType> {
  msg: s;
}

interface SingularValuesRes extends BaseRes<WorkerResType.SINGULAR_VALUES> {
  singularValues: Float64Array;
}

export function makeSingularValuesRes(singularValues: Float64Array): SingularValuesRes {
  return {
    msg: WorkerResType.SINGULAR_VALUES,
    singularValues,
  };
}

interface LowRankApproximationRes extends BaseRes<WorkerResType.LOW_RANK_APPROXIMATION> {
  lowRankApproximation: Float64Array;
}

export function makeLowRankApproximationRes(
  lowRankApproximation: Float64Array,
): LowRankApproximationRes {
  return {
    msg: WorkerResType.LOW_RANK_APPROXIMATION,
    lowRankApproximation,
  };
}

export type WorkerRes = SingularValuesRes | LowRankApproximationRes;
