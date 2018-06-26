"use strict";
const rename = require("gulp-rename");
const gutil = require('gulp-util');
const gulp = require('gulp');
const fs = require('fs-extra');
const globalVar = require('./global-variables');
const helpers = require('../helpers');
const _ = require('lodash');

require('minimist')(process.argv.slice(2));

// Parse a template and generates a .java file.
// template: file in the templates folder
// obj:      context object for the template
// name:     name of the item parsed
// dir:      folder relative to the client folder to write the file
// suffix:   extra suffix for the name
function parseTemplate(template, obj, name, dir, suffix) {
    const className = helpers.camelCase(name) + suffix;
    // If there is a base .java file we extend it.
    const classBase = helpers.camelCase(name) + suffix + "Base";

    // We have to compute the appropriate name-space for the component.
    let prefix =
        // For events we prefer the first word of the name if they are standard ones.
        /^Event/.test(suffix) && /^(polymer|iron|paper|neon)-/.test(name) ? name :
            // Otherwise we try the name from its bower.json, then the sub-folder name in
            // bower_components, and finally from its name.
            obj.bowerData && obj.bowerData.name || obj.path.replace(/.*\/+(.+)\/+[^\/]+/, '$1') || name;
    //  Then we take the first part before first dash
    prefix = prefix.split('-')[0].replace(/\./g, '');

    obj.ns = globalVar.ns + '.' + prefix;

    const targetPath = globalVar.clientDir + prefix + '/' + dir;
    const targetFile = targetPath + className + ".java";
    fs.ensureFileSync(targetFile);

    let baseFile = libDir + globalVar.nspath + '/' + prefix + '/' + dir + classBase + ".java";
    if (!fs.existsSync(baseFile)) {
        baseFile = './lib/' + globalVar.nspath + '/' + prefix + '/' + dir + classBase + ".java";
    }
    if (fs.existsSync(baseFile)) {
        obj.base = classBase;
        gutil.log("Copying: ", baseFile);
        fs.copySync(baseFile, targetPath + classBase + ".java");
    } else {
        obj.base = '';
    }

    gutil.log("Generating " + obj.type + ": ", targetFile);
    const tpl = _.template(fs.readFileSync(tplDir + template + '.template'));
    fs.writeFileSync(targetFile.replace(/\/\//, "\\"), new Buffer(tpl(_.merge({}, null, obj, helpers))));
}

gulp.task('generate:elements', ['parse'], function () {
    parsed.forEach( function (item) {
        if (item.type === 'behavior') {
            parseTemplate('Behavior', item, item.name, '', '');
        } else {
            parseTemplate('Element', item, item.name, '', 'Element');
        }
    });
    return parsed;
});

gulp.task('generate:events', ['parse'], function () {
    parsed.forEach(function (item) {
        if (item.events) {
            item.events.forEach(function (event) {
                event.bowerData = item.bowerData;
                event.name = event.name.replace(/\s.*$/, '');
                event.type = 'element event';
                parseTemplate('ElementEvent', event, event.name, 'event/', 'Event');
            });
        }
    });
    return parsed;
});

gulp.task('generate:widgets', ['parse'], function () {
    parsed.forEach(function (item) {
        if (!helpers.isBehavior(item)) {
            item.type = 'widget';
            parseTemplate('Widget', item, item.name, 'widget/', '');
        }
    });
    return parsed;
});

gulp.task('generate:widget-events', ['parse'], function () {
    parsed.forEach(function (item) {
        if (item.events) {
            item.events.forEach(function (event) {
                event.bowerData = item.bowerData;
                event.name = event.name.replace(/\s.*$/, '');
                event.type = 'event';
                parseTemplate('WidgetEvent', event, event.name, 'widget/event/', 'Event');
                event.type = 'event handler';
                parseTemplate('WidgetEventHandler', event, event.name, 'widget/event/', 'EventHandler');
            });
        }
    });
    return parsed;
});

gulp.task('generate:gwt-module', function () {
    gutil.log("Generating gwt-module...");
    if (globalVar.moduleName !== 'Elements' || globalVar.ns !== 'com.vaadin.polymer') {
        const dest = globalVar.publicDir.replace(/[^\/]+\/?$/, '');
        gutil.log("Generating Module: " + dest + globalVar.moduleName + ".gwt.xml");
        return gulp.src(tplDir + "GwtModule.template")
            .pipe(rename(globalVar.moduleName + ".gwt.xml"))
            .pipe(gulp.dest(dest));
    }
});

gulp.task('generate:elements-all', ['generate:elements', 'generate:events']);

gulp.task('generate:widgets-all', ['generate:widgets', 'generate:widget-events']);

gulp.task('generate', ['generate:elements-all', 'generate:widgets-all', 'generate:gwt-module'], function () {
    gutil.log('Done.');
});