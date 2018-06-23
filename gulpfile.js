"use strict";
const args = require('minimist')(process.argv.slice(2));
const gulp = require('gulp');
const bower = require('gulp-bower');
const map = require('map-stream');
const fs = require('fs-extra');
const globalVar = require('./template/tasks/global-variables');
const gutil = require('gulp-util');
const _ = require('lodash');
const runSequence = require('run-sequence');
const hyd = require("hydrolysis");
const {Analyzer, FSUrlLoader, generateAnalysis} = require('polymer-analyzer');
const jsonfile = require('jsonfile');
const StreamFromArray = require('stream-from-array');
const rename = require("gulp-rename");

const libDir = __dirname + '/lib/';
const tplDir = __dirname + '/template/';

const helpers = require(tplDir + "helpers");

require('require-dir')(tplDir + 'tasks');
require('marked');

// Using global because if we try to pass it to templates via the helper or any object
// we need to call merge which makes a copy of the structure per template slowing down
// the performance.
global.parsed = []; // we store all parsed objects so as we can iterate or find behaviors

gulp.task('clean:target', function () {
  fs.removeSync(globalVar.clientDir + 'element');
  fs.removeSync(globalVar.clientDir + 'widget');
});

gulp.task('clean:resources', function () {
  fs.removeSync(globalVar.publicDir);
});

gulp.task('clean', ['clean:target', 'clean:resources']);

gulp.task('bower:configure', ['clean:resources'], function (done) {
  jsonfile.readFile('.bowerrc', function (err, obj) {
    if (!err) {
      fs.copySync('.bowerrc', globalVar.publicDir + '/.bowerrc');
      if(obj.directory) {
        globalVar.bowerDir = globalVar.publicDir + '/' + obj.directory + '/';
      }
    }
    done();
  });
});

gulp.task('bower:install', ['clean', 'bower:configure'], function () {
  if (globalVar.bowerPackages) {
    return bower({ cmd: 'install', cwd: globalVar.publicDir, interactive: true }, [globalVar.bowerPackages]);
  } else {
    gutil.log('No --package provided. Using package(s) from bower_components folder.');
    return gulp.src('./bower_components/**/*', {base: '.'}).pipe(gulp.dest(globalVar.publicDir));
  }
});

gulp.task('parse', ['analyze'], function (cb) {
    global.parsed.forEach(function (item) {
        if (!helpers.isBehavior(item) && item.behaviors && item.behaviors.length) {
            item.behaviors.forEach(function (name) {
                const nestedBehaviors = helpers.getNestedBehaviors(item, name);
                item.properties = _.union(item.properties, nestedBehaviors.properties);

                // merge events
                if (nestedBehaviors.events && nestedBehaviors.events.length) {
                    nestedBehaviors.events.forEach(function (event) {
                        const notDuplicate = _.filter(item.events, function (e) {
                            return e.name === event.name;
                        }).length === 0;
                        if (notDuplicate) {
                            item.events.push(event);
                        }
                    });
                }
            });
        }
        const unwantedProps = ['root', 'rootPath', 'importPath', '$'];
        const props = [];
        if (item.properties) {
            item.properties.forEach(function (prop) {
                if (!unwantedProps.includes(prop.name) && prop.privacy === "public") {
                    props.push(prop);
                }
            });
        }
        item.properties = props;
    });
    cb();
});

gulp.task('analyze', ['clean:target', 'pre-analyze'], function() {
  return gulp.src([globalVar.bowerDir + "*/*.html",
    // vaadin elements
    globalVar.bowerDir + "*/vaadin-*/vaadin-*.html",
    // ignore all demo.html, index.html and metadata.html files
    "!" + globalVar.bowerDir + "*/*demo.html",
    "!" + globalVar.bowerDir + "*/*index.html",
    "!" + globalVar.bowerDir + "*/*metadata.html",
    // includes a set of js files only, and some do not exist
    "!" + globalVar.bowerDir + "*/*web-animations.html",
    // Not useful in gwt and also has spurious event names
    "!" + globalVar.bowerDir + "*/*iron-jsonp-library.html",
    // 
    "!" + globalVar.bowerDir + "*/iron-doc*.html",
    ])
    .pipe(map(function(file, cb) {

        const analyzer = new Analyzer({
            urlLoader: new FSUrlLoader('bower_components/')
        });

        analyzer.analyze([file.relative]).then((analysis) => {
           const result = generateAnalysis(analysis, '');
           const jsonArray = _.union(result.elements, result.behaviors);
           jsonArray.forEach(function (item) {
              const path = file.relative.replace(/\\/, '/');
              if(item.name) {
                  item.path = path;

                  const bowerFile = file.base + path.split("/")[0] + "/bower.json";
                  const bowerFileContent = fs.readFileSync(bowerFile);
                  item.bowerData = bowerFileContent ? JSON.parse(bowerFileContent) : {};

                  global.parsed.push(item);
              }
           });
           cb(null, file);
        })
        ['catch'](function(e){
            gutil.log(e.stack);
            cb(null, file);
        });
    }));
});

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
    obj.bowerData && obj.bowerData.name || obj.path.replace(/.*\/+(.+)\/+[^\/]+/, '$1') || name;
  //  Then we take the first part before first dash
  prefix = prefix.split('-')[0].replace(/\./g,'');

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

  gutil.log("Generating: ", targetFile);
  const tpl = _.template(fs.readFileSync(tplDir + template + '.template'));
  fs.writeFileSync(targetFile, new Buffer(tpl(_.merge({}, null, obj, helpers))));
}

gulp.task('generate:elements', ['parse'], function() {
  return StreamFromArray(global.parsed,{objectMode: true})
   .on('data', function(item) {
     if (helpers.isBehavior(item)) {
       parseTemplate('Behavior', item, item.name, '', '');
     } else {
       parseTemplate('Element', item, item.name, '', 'Element');
     }
   });
});

gulp.task('generate:events', ['parse'], function() {
  return StreamFromArray(global.parsed,{objectMode: true})
   .on('data', function(item) {
      if (item.events) {
        item.events.forEach(function(event) {
          event.bowerData = item.bowerData;
          event.name = event.name.replace(/\s.*$/,'');
          parseTemplate('ElementEvent', event, event.name, 'event/', 'Event');
        });
      }
   });
});

gulp.task('generate:widgets', ['parse'], function() {
  return StreamFromArray(global.parsed,{objectMode: true})
   .on('data', function(item) {
      if (!helpers.isBehavior(item)) {
        parseTemplate('Widget', item, item.name, 'widget/', '');
      }
   });
});

gulp.task('generate:widget-events', ['parse'], function() {
  return StreamFromArray(global.parsed,{objectMode: true})
   .on('data', function(item) {
      if (item.events) {
        item.events.forEach(function(event) {
          event.bowerData = item.bowerData;
          event.name = event.name.replace(/\s.*$/,'');
          parseTemplate('WidgetEvent', event, event.name, 'widget/event/', 'Event');
          parseTemplate('WidgetEventHandler', event, event.name, 'widget/event/', 'EventHandler');
        });
      }
   });
});

gulp.task('generate:gwt-module', function () {
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

gulp.task('generate', ['generate:elements-all', 'generate:widgets-all', 'generate:gwt-module'], function() {
  gutil.log('Done.');
});

gulp.task('copy:lib', function() {
  if (!args.excludeLib) {
    return gulp.src(libDir + '**')
      .pipe(gulp.dest(globalVar.clientDirBase));
  }
});

gulp.task('copy:pom', function() {
  const tpl = _.template(fs.readFileSync(tplDir + "pom.template"));
  const pom = globalVar.currentDir + "pom.xml";

  // Try to get some configuration from a package.json
  // otherwise use default values
  const pkgFile = globalVar.currentDir + 'package.json';
  globalVar.pkg = {};
  try {
    const pkgContent = fs.readFileSync(pkgFile);
    globalVar.pkg = JSON.parse(pkgContent);
  } catch(ignore) {
  }
  globalVar.pkg.pom = globalVar.pkg.pom || {};
  globalVar.pkg.pom.version = args.version || globalVar.pkg.pom.version || globalVar.pkg.version;

  // Ugly hack to allow mvn variables trough templates
  globalVar.project = {
      basedir: "${project.basedir}"
  };

  fs.ensureFileSync(pom);
  fs.writeFileSync(pom, new Buffer(tpl(_.merge({}, null, globalVar, helpers))));
});

gulp.task('default', function(){
  if(args.pom) {
    runSequence('clean', 'bower:install', 'generate', 'copy:lib', 'copy:pom');
  } else {
    runSequence('clean', 'bower:install', 'generate', 'copy:lib');
  }
});
