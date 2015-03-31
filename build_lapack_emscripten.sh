#!/bin/sh

set -e

CC="emcc -Wall"

# compile f2c libraries
for file in $( ls CLAPACK/F2CLIBS/libf2c | grep "\\.c\$" ); do
  $CC -D INTEGER_STAR_8 -I CLAPACK/F2CLIBS/libf2c -c CLAPACK/F2CLIBS/libf2c/$file -o "build/`basename $file .c`.bc"
done

# compile BLAS
for file in $( ls CLAPACK/BLAS/SRC | grep "\\.c\$" ); do
  $CC -I CLAPACK/INCLUDE -c CLAPACK/BLAS/SRC/$file -o "build/`basename $file .c`.bc"
done

# compile CLAPACK
for file in $( ls CLAPACK/SRC | grep "\\.c\$" ); do
  $CC -I CLAPACK/INCLUDE -c CLAPACK/SRC/$file -o "build/`basename $file .c`.bc"
done

# compile CLAPACK/INSTALL
#for file in $( ls CLAPACK/INSTALL | grep "\\.c\$" ); do
#  $CC -I CLAPACK/INCLUDE -c CLAPACK/INSTALL/$file -o "build/`basename $file .c`.bc"
#done

$CC -I CLAPACK/INCLUDE -c CLAPACK/INSTALL/dlamch.c -o build/dlamch.bc

rm build/main.bc

$CC -I CLAPACK/INCLUDE -c jsapi.c -o build/jsapi.bc

# build clapack.js
$CC -O3 build/*.bc -o build/clapack.js -s TOTAL_MEMORY=24000000 -s EXPORTED_FUNCTIONS="['_svd_simple']"
