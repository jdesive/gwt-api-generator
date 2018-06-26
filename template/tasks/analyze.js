"use strict";
const gulp = require('gulp');
const map = require('map-stream');
const global = require('./global-variables');
const {Analyzer, FsUrlLoader, PackageUrlResolver, generateAnalysis} = require('polymer-analyzer');
const gutil = require('gulp-util');
const fs = require('fs-extra');

require('minimist')(process.argv.slice(2));

gulp.task('analyze', ['clean:target', 'pre-analyze'], function () {
    return gulp.src([global.bowerDir + "*/*.html",
        // vaadin elements
        global.bowerDir + "*/vaadin-*/vaadin-*.html",
        // ignore all demo.html, index.html and metadata.html files
        "!" + global.bowerDir + "*/*demo.html",
        "!" + global.bowerDir + "*/*index.html",
        "!" + global.bowerDir + "*/*metadata.html",
        // includes a set of js files only, and some do not exist
        "!" + global.bowerDir + "*/*web-animations.html",
        // Not useful in gwt and also has spurious event names
        "!" + global.bowerDir + "*/*iron-jsonp-library.html",
        //
        "!" + global.bowerDir + "*/iron-doc*.html",
    ])
        .pipe(map(function (file, cb) {
            const fileLocation = file.relative.split('\\');
            const fileDir = fileLocation[0];
            const comFile = fileLocation[1];

            const rootDir = file.base + fileDir + "\\";
            const analyzer = new Analyzer({
                urlLoader: new FsUrlLoader(rootDir),
                urlResolver: new PackageUrlResolver({packageDir: rootDir}),
            });

            gutil.log("Analyzing: ", file.relative);
            analyzer.analyze([comFile]).then(function (analysis) {
                const [element] = analysis.getFeatures({
                    kind: 'element',
                    id: comFile.split('.')[0],
                    externalPackages: true,
                    excludeBackreferences: false
                });
                const [behavior] = analysis.getFeatures({
                    kind: 'behavior',
                    externalPackages: true,
                    excludeBackreferences: false
                });

                if (element) {
                    //gutil.log("\tFound element " + element.tagName);
                    element.path = file.relative.replace(/\\/, '/');
                    element.name = element.tagName;
                    element.type = 'element';
                    const bowerFile = file.base + element.path.split("/")[0] + "/bower.json";
                    const bowerFileContent = fs.readFileSync(bowerFile);
                    element.bowerData = bowerFileContent ? JSON.parse(bowerFileContent) : {};
                    parsed.push(element);
                }

                if (behavior) {
                    //gutil.log("\tFound behavior " + behavior.className);
                    behavior.path = file.relative.replace(/\\/, '/');
                    behavior.name = behavior.className;
                    behavior.type = 'behavior';
                    const bowerFile = file.base + behavior.path.split("/")[0] + "/bower.json";
                    const bowerFileContent = fs.readFileSync(bowerFile);
                    behavior.bowerData = bowerFileContent ? JSON.parse(bowerFileContent) : {};
                    parsed.push(behavior);
                }
                cb(null, file);
            })['catch'](function (e) {
                gutil.log(e.stack);
                cb(null, file);
            });
        }));
});