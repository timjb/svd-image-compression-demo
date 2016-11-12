var gulp = require("gulp");
var browserify = require("browserify");
var source = require('vinyl-source-stream');
var tsify = require("tsify");
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var buffer = require('vinyl-buffer');

gulp.task("default", [
  "copy-react",
  "copy-slick-assets",
  "copy-nouislider-assets",
  "compile-main-app",
  "compile-web-worker"
]);

gulp.task("copy-react", function () {
  return gulp.src([
    "node_modules/react/dist/react.min.js",
    "node_modules/react-dom/dist/react-dom.min.js"
  ]).pipe(gulp.dest("build"));
});

gulp.task("copy-slick-assets", function () {
  const copyCss =
    gulp.src("node_modules/slick-carousel/slick/{slick,slick-theme}.css")
    .pipe(gulp.dest("build"));
  const copyFonts =
    gulp.src("node_modules/slick-carousel/slick/fonts/slick.*")
    .pipe(gulp.dest("build/fonts"));
  return [copyCss, copyFonts];
});

gulp.task("copy-nouislider-assets", function () {
  return gulp.src("node_modules/nouislider/distribute/nouislider.min.css")
    .pipe(gulp.dest("build"));
});

gulp.task("compile-main-app", function () {
  return browserify({
      basedir: 'src/main-app',
      debug: true,
      entries: ['app.tsx'],
      cache: {},
      packageCache: {}
  })
  .external(['react', 'react-dom'])
  .plugin(tsify)
  .bundle()
  .pipe(source('app.js'))
  .pipe(buffer())
  .pipe(sourcemaps.init({ loadMaps: true }))
  .pipe(uglify())
  .pipe(sourcemaps.write('./'))
  .pipe(gulp.dest("build"));
});

gulp.task("compile-web-worker", function () {
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
});