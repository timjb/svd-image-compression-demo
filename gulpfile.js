var gulp = require("gulp");
var browserify = require("browserify");
var source = require('vinyl-source-stream');
var tsify = require("tsify");
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var buffer = require('vinyl-buffer');

function copyReact () {
  return gulp.src([
    "node_modules/react/umd/react.production.min.js",
    "node_modules/react-dom/umd/react-dom.production.min.js"
  ]).pipe(gulp.dest("build"));
}

function copySlickCss () {
  return gulp.src("node_modules/slick-carousel/slick/{slick,slick-theme}.css")
    .pipe(gulp.dest("build"));
}

function copySlickFonts () {
  return gulp.src("node_modules/slick-carousel/slick/fonts/slick.*")
    .pipe(gulp.dest("build/fonts"));
}

const copySlickAssets = gulp.parallel(copySlickCss, copySlickFonts);

function copyNoUiSliderAssets () {
  return gulp.src("node_modules/nouislider/distribute/nouislider.min.css")
    .pipe(gulp.dest("build"));
}

function compileMainApp () {
  return browserify({
      basedir: 'src/main-app',
      debug: true,
      entries: ['index.tsx'],
      cache: {},
      packageCache: {}
  })
  .external(['react', 'react-dom'])
  .plugin(tsify)
  .bundle()
  .pipe(source('index.js'))
  .pipe(buffer())
  .pipe(sourcemaps.init({ loadMaps: true }))
  .pipe(uglify())
  .pipe(sourcemaps.write('./'))
  .pipe(gulp.dest("build"));
}

function compileWebWorker () {
  return browserify({
      basedir: 'src/web-worker',
      debug: true,
      entries: ['svd-worker.ts'],
      cache: {},
      packageCache: {}
  })
  .plugin(tsify)
  .bundle()
  .pipe(source('svd-worker.js'))
  .pipe(buffer())
  .pipe(sourcemaps.init({ loadMaps: true }))
  .pipe(uglify())
  .pipe(sourcemaps.write('./'))
  .pipe(gulp.dest("build"));
}

// TODO: clean step
exports.default = gulp.parallel(
  copyReact,
  copySlickAssets,
  copyNoUiSliderAssets,
  compileMainApp,
  compileWebWorker
);
