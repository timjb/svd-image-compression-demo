# Use emscripten as a compiler
CC = emcc -Wall -O3

svd: Makefile build/svdlibc.js

build/svdlibc.js: Makefile build/jsapi.bc build/svdlib.bc build/svdutil.bc build/las2.bc
	${CC} build/jsapi.bc build/svdlib.bc build/svdutil.bc build/las2.bc \
	    -o build/svdlibc.js \
	    -s TOTAL_MEMORY=32000000 \
	    -s EXPORTED_FUNCTIONS="['_createDMat','_svdConvertDtoS','_svdFreeSMat','_svdLAS2A','_dmatGetRows','_dmatGetCols','_dmatGetValue','_svdrecGetD','_svdrecGetUt','_svdrecGetS','_svdrecGetVt','_svdFreeSVDRec']"
build/jsapi.bc: Makefile svdlib.h jsapi.c
	${CC} ${CFLAGS} -c jsapi.c -o build/jsapi.bc
build/svdlib.bc: Makefile svdlib.h svdlib.c
	${CC} ${CFLAGS} -c svdlib.c -o build/svdlib.bc
build/svdutil.bc: Makefile svdutil.c svdutil.h
	${CC} ${CFLAGS} -c svdutil.c -o build/svdutil.bc
build/las2.bc: Makefile las2.c svdlib.h svdutil.h
	${CC} ${CFLAGS} -c las2.c -o build/las2.bc
clean: 
	rm *.o
