"use strict";
const gulp = require('gulp');
const globalVar = require('./global-variables');
const args = require('minimist')(process.argv.slice(2));
const fs = require('fs-extra');

gulp.task('copy:lib', function () {
    if (!args.excludeLib) {
        return gulp.src(libDir + '**')
            .pipe(gulp.dest(globalVar.clientDirBase));
    }
});

gulp.task('copy:pom', function () {
    if (args.pom) {
        const tpl = _.template(fs.readFileSync(tplDir + "pom.template"));
        const pom = globalVar.currentDir + "pom.xml";

        // Try to get some configuration from a package.json
        // otherwise use default values
        const pkgFile = globalVar.currentDir + 'package.json';
        globalVar.pkg = {};
        try {
            const pkgContent = fs.readFileSync(pkgFile);
            globalVar.pkg = JSON.parse(pkgContent);
        } catch (ignore) {
        }
        globalVar.pkg.pom = globalVar.pkg.pom || {};
        globalVar.pkg.pom.version = args.version || globalVar.pkg.pom.version || globalVar.pkg.version;

        // Ugly hack to allow mvn variables trough templates
        globalVar.project = {
            basedir: "${project.basedir}"
        };

        fs.ensureFileSync(pom);
        fs.writeFileSync(pom, new Buffer(tpl(_.merge({}, null, globalVar, helpers))));
    }
});