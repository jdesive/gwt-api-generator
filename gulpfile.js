"use strict";
const args = require('minimist')(process.argv.slice(2));
const gulp = require('gulp');
const runSequence = require('run-sequence');

global.libDir = __dirname + '/lib/';
global.tplDir = __dirname + '/template/';

require('require-dir')(tplDir + 'tasks');
require('marked');

// Using global because if we try to pass it to templates via the helper or any object
// we need to call merge which makes a copy of the structure per template slowing down
// the performance.
global.parsed = []; // we store all parsed objects so as we can iterate or find behaviors

/**
 * Workflow: (Top Down)
 *  - default
 *      - clean:target
 *      - clean:resources
 *  - clean
 *  - bower:install
 *  - bower:configure
 *                      - pre-analyze
 *                  - analyze
 *              - parse
 *          - genrate:elements
 *          - generate:events
 *      - generate:elements-all
 *  - generate
 *          - generate:widgets
 *          - generate:widget-events
 *      - generate:widgets-all
 *      - generate:gwt-module
 */

gulp.task('default', function () {
    runSequence('clean', 'bower:install', 'generate', 'copy:lib', 'copy:pom');
});
