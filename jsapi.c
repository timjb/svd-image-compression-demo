#include <stdlib.h>
#include <stdbool.h>
#include "f2c.h"
#include "clapack.h"
#include "blaswrap.h"

#define MIN(X, Y) (((X) < (Y)) ? (X) : (Y))
#define MAX(X, Y) (((X) < (Y)) ? (Y) : (X))

/*
  Computes the thin SVD of a (m,n)-matrix A.
  Assumes that U  is a buffer for a (m,k)-matrix,
               Vt is a buffer for a (k,n)-matrix,
               S  is an array of dimension k,
  where k = min(m,n).
*/
int svd_simple (int m, int n, double* A, double* U, double* S, double* Vt) {
  int k = MIN(m, n);
  integer lk = (integer) k;
  integer lm = (integer) m;
  integer ln = (integer) n;

  /* LWORK >= MAX(1,3*MIN(M,N)+MAX(M,N),5*MIN(M,N)). */
  int work_len = 1 + 2*MAX(3*k + MAX(m, n), 5*k);
  integer lwork_len = (integer) work_len;

  double *work = (double *) malloc(work_len * sizeof(double));

  char job = 'S';
  integer info;
  dgesvd_(&job, &job, &lm, &ln, A, &lm, S, U, &lm, Vt, &lk, work, &lwork_len, &info);

  free(work);
  return (int) info;
}

extern int dgemm_(char *, char *, integer *, integer *, integer *, doublereal *, doublereal *, integer *,
  doublereal *, integer *, doublereal *, doublereal *, integer *);

/*
  Multiply a full (m,k)-matrix A with a full (k,n)-matrix to get a (m,n)-matrix C.
  Optionally, the matrices can be transposed before multiplication by setting
  transA or transB to true.
  If transA is true, then A has to be a (k,m)-matrix.
  Similarly for transB.
*/
int matrix_mult_helper (int m, int k, int n, double *A, double *B, double *C, bool transA, bool transB) {
  integer lm = (integer) m;
  integer lk = (integer) k;
  integer ln = (integer) n;

  char trans   = 'T'; // transpose
  char noTrans = 'N'; // do not transpose the matrices before multiplying
  double alpha = 1;
  double beta = 0;
  return dgemm_(transA ? &trans : &noTrans, transB ? &trans : &noTrans,
                &lm, &ln, &lk, &alpha,
                A, transA ? &lk : &lm,
                B, transB ? &ln : &lk,
                &beta, C, &lm);
}

/*
  Multiply a full (m,k)-matrix A with a full (k,n)-matrix to get a (m,n)-matrix.
  /Allocates memory for the resulting matrix./
  Optionally, the matrices can be transposed before multiplication by setting
  transA or transB to true.
  If transA is true, then A has to be a (k,m)-matrix.
  Similarly for transB.
*/
double *matrix_mult (int m, int k, int n, double *A, double *B, bool transA, bool transB) {
  double *C = (double *) malloc(m * n * sizeof(double));
  matrix_mult_helper(m, k, n, A, B, C, transA, transB);
  return C;
}

/* Randomized algorithm that calculates the truncated SVD */
/* technique based on https://research.facebook.com/blog/294071574113354/fast-randomized-svd/ */
/* precondition: t <= MIN(m, n) */
int svd_simple_approx (int m, int n, int t, double* A, double* U, double* S, double* Vt) {
  int k = MIN(m, n);
  integer lm = (integer) m;
  integer lt = (integer) t;

  /* first, generate t vectors with normally distributed values */
  /* the vectors will be the column vectors in the (n, t)-matrix O */
  double *O = (double *) malloc(n * t * sizeof(double));
  integer idist = 3;
  integer iseed[4];
  iseed[0] = 42;
  iseed[3] = 23;
  integer size = (integer) n * t;
  dlarnv_(&idist, iseed, &size, O);

  /* compute the product Y = A O \in \R^{m \times t} */
  double *Y = matrix_mult(m, n, t, A, O, false, false);
  free(O);

  /* compute the QR composition of Y, Y = Q R */
  double *tau = (double *) malloc(k * sizeof(double));
  int work_len = 8 * t;
  integer lwork_len = (integer) work_len;
  double *work = (double *) malloc(work_len * sizeof(double));
  integer info;
  dgeqrf_(&lm, &lt, Y, &lm, tau, work, &lwork_len, &info);
  dorgqr_(&lm, &lt, &lt, Y, &lm, tau, work, &lwork_len, &info);
  free(tau);
  free(work);
  double *Q = Y; /* \in \R^{m \times t} */

  /* compute the product B = Q^T A \in \R^{t \times n} */
  double *B = matrix_mult(t, m, n, Q, A, true, false);

  /* compute the SVD of B */
  double *T = (double *) malloc(t * t * sizeof(double)); /* \in \R^{t \times t} */
  int ret = svd_simple(t, n, B, T, S, Vt);
  free(B);

  matrix_mult_helper(m, t, t, Q, T, U, false, false); 
  free(Q);
  free(T);

  return ret;
}