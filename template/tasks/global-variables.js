"use strict";
const args = require('minimist')(process.argv.slice(2));

const ns = args.groupId || 'com.vaadin.polymer';
const nspath = ns.replace(/\./g,'/');
const currentDir = process.cwd() + '/';

const clientDirBase = currentDir + (args.javaDir || 'src/main/java/').replace(/,+$/, '');
const publicDirBase = currentDir + (args.resourcesDir || 'src/main/resources/').replace(/,+$/, '');

const clientDir = clientDirBase + '/' + nspath + '/';
const publicDir = publicDirBase + '/' + nspath + '/public/';

module.exports = {
  ns: ns,
  nspath: nspath,
  artifactId: args.artifactId || 'gwt-polymer-elements',
  moduleName: args.moduleName || 'Elements',
  currentDir: currentDir,
  clientDirBase: clientDirBase,
  publicDirBase: publicDirBase,
  clientDir: clientDir,
  publicDir: publicDir,
  bowerDir: publicDir + 'bower_components/',
  bowerPackages: args.package ? args.package.split(/[, ]+/) : null
};



