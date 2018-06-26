"use strict";
const gulp = require('gulp');
const helpers = require('../helpers');
const _ = require('lodash');

require('minimist')(process.argv.slice(2));

gulp.task('parse', ['analyze'], function (cb) {
    parsed.forEach(function (item) {
        if (item.type === 'element') {
            // Element
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
        } else if(item.type === 'behavior') {
            // Behavior
            item.behaviorAssignments.forEach(function (name) {
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
        // We don't want to wrap any private api
        helpers.removePrivateApi(item.properties, 'name');
    });
    cb();
});