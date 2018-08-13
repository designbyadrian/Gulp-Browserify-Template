var gulp        = require('gulp'),
    sass        = require('gulp-sass'),
    cssmin      = require('gulp-cssnano'),
    prefix      = require('gulp-autoprefixer'),
    plumber     = require('gulp-plumber'),
    rename      = require('gulp-rename'),
    notify      = require('gulp-notify'),
    sassLint    = require('gulp-sass-lint'),
    sourcemaps  = require('gulp-sourcemaps'),
    browserify  = require('browserify')
    watchify    = require('watchify'),
    babelify    = require('babelify'),
    source      = require('vinyl-source-stream'),
    buffer      = require('vinyl-buffer'),
    merge       = require('utils-merge'),
    uglify      = require('gulp-uglify'),
    // Temporary solution until gulp 4
    // https://github.com/gulpjs/gulp/issues/355
    runSequence = require('run-sequence'),
    webserver   = require('gulp-webserver'),
    gutil       = require('gulp-util'),
    chalk       = require('chalk');

/* Options */

var babelOptions = {
  presets: ['env']
};

var sassOptions = {
  outputStyle: 'expanded'
};

var prefixerOptions = {
  browsers: ['last 2 versions']
};

/* Misc */

var onError = function(err) {
  console.log("ee", err);
  if (err.fileName) {
    // regular error
    gutil.log(chalk.red(err.name)
      + ': '
      + chalk.yellow(err.fileName.replace(__dirname + '/src/js/', ''))
      + ': '
      + 'Line '
      + chalk.magenta(err.lineNumber)
      + ' & '
      + 'Column '
      + chalk.magenta(err.columnNumber || err.column)
      + ': '
      + chalk.blue(err.description))
  } else {
    // browserify error..
    gutil.log(chalk.red(err.name)
      + ': '
      + chalk.yellow(err.message))
  }

  notify({
    title:    "Gulp",
    message:  "Error: <%= error.message %>",
    sound:    "Basso",
    emitError: false,
  }).write(err);

  this.emit('end');
};

gulp.task('webserver', function() {
  gulp.src('dist')
  .pipe(webserver({
    livereload: true,
    directoryListing: false,
    open: true
  }));
});

/* JavaScript */

gulp.task('watchify', function () {
  var args = merge(watchify.args, { debug: true })
  var bundler = watchify(browserify('./src/js/index.js', args)).transform(babelify, babelOptions)
  makeBundle(bundler)

  bundler.on('update', function () {
    makeBundle(bundler)
  })
})

function makeBundle(bundler) {
  return bundler.bundle()
  .on('error', onError)
  .pipe(source('script.js'))
  .pipe(buffer())
  .pipe(gulp.dest('dist'))
  .pipe(rename('script.min.js'))
  .pipe(sourcemaps.init({ loadMaps: true }))
  // capture sourcemaps from transforms
  .pipe(uglify())
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest('dist'))
}

gulp.task('browserify', function () {
  var bundler = browserify('./src/js/index.js', { debug: true }).transform(babelify, babelOptions)

  return makeBundle(bundler)
})

gulp.task('browserify-prod', function () {
  var bundler = browserify('./src/js/index.js').transform(babelify, babelOptions)

  return bundler.bundle()
    .on('error', onError)
    .pipe(source('script.js'))
    .pipe(buffer())
    .pipe(rename('script.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('dist'));
})

/* Stylesheets */

gulp.task('styles', function() {
  return gulp.src('src/style/style.sass')
  .pipe(plumber({errorHandler: onError}))
  .pipe(sourcemaps.init())
  .pipe(sass(sassOptions))
  .pipe(prefix(prefixerOptions))
  .pipe(rename('style.css'))
  .pipe(cssmin())
  .pipe(rename({ suffix: '.min' }))
  .pipe(gulp.dest('dist'));
});

gulp.task('sass-lint', function() {
  gulp.src('src/style/**/*.sass')
  .pipe(sassLint())
  .pipe(sassLint.format())
  .pipe(sassLint.failOnError());
});

/* Dev & Prod */

gulp.task('watch', function() {
  gulp.watch('src/style/**/*.sass', ['styles']);
});

gulp.task('default', function(done) {
  runSequence('styles', 'webserver', 'watch', 'watchify', done);
});

gulp.task('build', function(done) {
  runSequence('styles', 'browserify-prod', done);
});
