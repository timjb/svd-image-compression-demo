#include <stdlib.h>
#include "f2c.h"
#include "clapack.h"

#define MIN(X, Y) (((X) < (Y)) ? (X) : (Y))
#define MAX(X, Y) (((X) < (Y)) ? (Y) : (X))

/*
int dgesvd_(char *jobu, char *jobvt, integer *m, integer *n, 
  doublereal *a, integer *lda, doublereal *s, doublereal *u, integer *
  ldu, doublereal *vt, integer *ldvt, doublereal *work, integer *lwork, 
  integer *info);
*/

int svd_simple (int m, int n, double* a, double* u, double* s, double* vt) {
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
  dgesvd_(&job, &job, &lm, &ln, a, &lm, s, u, &lm, vt, &lk, work, &lwork_len, &info);

  free(work);
  return (int) info;
}
