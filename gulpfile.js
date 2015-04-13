var gulp = require('gulp')
var uglify = require('gulp-uglifyjs')
var meta = require('./package.json')
var watch = require('gulp-watch')
var concat = require('gulp-concat')

gulp.task('watch', function () {
    watch(['lib/*.js', 'pagelet.js'], function () {
        gulp.start('default')
    })
});

gulp.task('default', function() {
    return gulp.src(['wrapper/before.js', 'lib/const.js','lib/utils.js', 'lib/loader.js', 
                    'lib/loader.js', 'lib/router.js', 'pagelet.js', 'wrapper/after.js'])
        .pipe(concat({path: 'pagelet.js'}))
        .pipe(gulp.dest('dist/'))
        .pipe(gulp.dest('test/'))
        .pipe(uglify('pagelet.min.js', {
            mangle: true,
            compress: true
        }))
        .pipe(gulp.dest('dist/'))
});
