#include <stdlib.h>
#include <stdio.h>
#include "svdlib.h"
#include "svdutil.h"

DMat createDMat (double* data, int rows, int cols) {
  int i;
  DMat D = (DMat) malloc(sizeof(struct dmat));
  if (!D) {perror("svdNewDMat"); return NULL;}
  D->rows = rows;
  D->cols = cols;

  D->value = (double **) malloc(rows * sizeof(double *));
  if (!D->value) {SAFE_FREE(D); return NULL;}

  D->value[0] = data;
  for (i = 1; i < rows; i++) D->value[i] = D->value[i-1] + cols;
  return D;
}

/*
// Row-major dense matrix.  Rows are consecutive vectors. //
struct dmat {
  long rows;
  long cols;
  double **value; // Accessed by [row][col]. Free value[0] and value to free.//
};
*/

long     dmatGetRows  (DMat p) { return p->rows; }
long     dmatGetCols  (DMat p) { return p->cols; }
double** dmatGetValue (DMat p) { return p->value; }

/*
struct svdrec {
  int d;      // Dimensionality (rank) //
  DMat Ut;    // Transpose of left singular vectors. (d by m)
              // The vectors are the rows of Ut. //
  double *S;  // Array of singular values. (length d) //
  DMat Vt;    // Transpose of right singular vectors. (d by n)
              // The vectors are the rows of Vt. //
};
*/

int     svdrecGetD  (SVDRec p) { return p->d; }
DMat    svdrecGetUt (SVDRec p) { return p->Ut; }
double* svdrecGetS  (SVDRec p) { return p->S; }
DMat    svdrecGetVt (SVDRec p) { return p->Vt; }