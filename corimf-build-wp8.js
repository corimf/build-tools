/* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*  http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*
*************************************************************************
* This is a script to automate build a 2.3.0 through 3.1.0 snapshot of WP8
* Cordova for delivery to a product team to integrate. The manual process for
* this is described in our wiki. It is assumed that the platform/plugman/plugin
* repos have already been tagged with settings.NEW_TAG.
*/
var settings = require('./corimf-settings.js'),
	tests = require('./corimf-tests.js'),
	shelljs = require('shelljs'),
	tmp = require('temporary');

console.log('PLATFORM_REPO = ' + settings.PLATFORM_REPO);
console.log('REMOTE_ORIGIN = ' + settings.REMOTE_ORIGIN);
console.log('BRANCH = ' + settings.BRANCH);
console.log('NEW_TAG = ' + settings.NEW_TAG);
console.log();

console.log('Running Windows Phone 8 Cordova build of corimf:');
datetime = new Date();
console.log(' Date: ' + datetime.toDateString());
console.log(' Remote origin: ' + settings.REMOTE_ORIGIN);
console.log(' Branch: ' + settings.BRANCH);
console.log(' New Tag: ' + settings.NEW_TAG);
console.log();

tests.checkAboveGitRepo();
tests.checkMajorVersionNum();
tests.checkReposExist(settings.PLUGINS);

var repos = settings.PLUGINS.concat(settings.PLATFORM_REPO);
if (settings.PLUGMAN_REPO.length > 0) repos = repos.concat(settings.PLUGMAN_REPO);

console.log('Checking that we are on the expected ESR branch ' + settings.BRANCH + ' for platform and plugins...');
for (var i = 0; i < repos.length; i++) {
	console.log(repos[i] + ': ');
	shelljs.cd(repos[i]);
	tests.tmpFile = new tmp.File();
	var file2 = new tmp.File();
	tests.tmpFile.writeFileSync(shelljs.exec('git status --porcelain -b').output);
	file2.writeFileSync(shelljs.grep('^##', tests.tmpFile.path));
	if (shelljs.grep(settings.BRANCH + '$', file2.path).length == 0) {
		tests.reportStatus(shelljs.exec('git checkout ' + settings.BRANCH, {silent:true}).code == 0);
	}
	shelljs.cd('..');
	tests.tmpFile.unlink();
	file2.unlink();
}

tests.pullAndFetchTags(repos);

console.log('Checking that the platform and plugins have the tag ' + settings.NEW_TAG + '...');
for (var i = 0; i < repos.length; i++) {
	console.log(repos[i] + ': ');
	shelljs.cd(repos[i]);
	tests.reportStatus(shelljs.exec('git rev-parse ' + settings.NEW_TAG, {silent:true}).code == 0);
	shelljs.cd('..');
}

console.log('Checking that the platform and plugins are checked out at the tag ' + settings.NEW_TAG);
for (var i = 0; i < repos.length; i++) {
	console.log(repos[i] + ': ');
	shelljs.cd(repos[i]);
	var actual = shelljs.exec('git log -1 --format=oneline', {silent:true});
	tests.reportStatus(actual.code == 0);
	var desired = shelljs.exec('git rev-parse ' + settings.NEW_TAG, {silent:true});
	tests.reportStatus(desired.code == 0);
	tests.reportStatus(actual.output.split(' ')[0] == desired.output.trim());
	shelljs.cd('..');
}

var pathCorimf = shelljs.pwd();
var PROJECT_DIR = 'example-wp8-' + settings.NEW_TAG;
var SNAPSHOT_DIR = 'forgsa-wp8-' + settings.NEW_TAG;
var pathProject = pathCorimf + '\\' + PROJECT_DIR;
var pathSnapshot = pathCorimf + '\\' + SNAPSHOT_DIR;

console.log('Checking that project ' + PROJECT_DIR + ' does not exist yet...');
tests.reportStatus(!shelljs.test('-d', PROJECT_DIR));

console.log('Checking that snapshot dir ' + SNAPSHOT_DIR + ' does not exist yet...');
tests.reportStatus(!shelljs.test('-d', SNAPSHOT_DIR));

console.log('Creating a new Windows Phone 8 Project...');
tests.reportStatus(shelljs.exec(pathCorimf + '\\cordova-wp8\\wp8\\bin\\create.bat ' + PROJECT_DIR + ' com.example Example'), {silent:true});

if (settings.PLUGINS.length > 0) {
	console.log('Loading pre-reqs for plugman...');
	shelljs.cd(settings.PLUGMAN_REPO);
	if(shelljs.test('-d', 'node_modules')) {
		shelljs.rm('-r', 'node_modules')
	}
	tests.reportStatus(shelljs.exec('npm install', {silent:true}).code == 0);
	shelljs.cd('..');
}

console.log('Installing plugins into project...');
for (var i = 0; i < settings.PLUGINS.length; i++) {
	var pathPlugman = pathCorimf + '\\' + settings.PLUGMAN_REPO + '\\main.js';

	tests.reportStatus(shelljs.exec('node ' + pathPlugman + ' --debug install -platform wp8 -project ' + pathProject + ' -plugin ' + pathCorimf + '\\' + settings.PLUGINS[i], {silent:true}).code == 0);
}

console.log('Building project in Release:AnyCPU mode...');
// wp8 create script does not name sln and csproj files appropriately, so rename them
shelljs.exec('mv CordovaWP8AppProj.csproj example.csproj', {silent:true});
shelljs.exec('mv CordovaWP8Solution.sln example.sln', {silent:true});

// build the sample project in Visual Studio
tests.reportStatus(shelljs.exec('msbuild ' + PROJECT_DIR + '/example.sln /p:Configuration=Release', {silent:true}).code == 0);

console.log('Creating snapshot content in ' + SNAPSHOT_DIR);
shelljs.mkdir(SNAPSHOT_DIR);

// grab the www folder and add it to the snapshot. Should contain cordova.js and
// the plugins
tests.reportStatus(shelljs.exec('cp -r ' + PROJECT_DIR + '/www ' + SNAPSHOT_DIR, {silent:true}).code == 0);

// get the dll from Bin/Release
tests.reportStatus(shelljs.exec('cp ' + PROJECT_DIR + '/Bin/Release/com.example.dll ' + SNAPSHOT_DIR, {silent:true}).code == 0);

// get the IBM-MODIFICATIONS.txt
shelljs.mkdir(SNAPSHOT_DIR + '/modifications');
for (var i = 0; i < repos.length; i++) {
	if (shelljs.test('-f', repos[i] + '/IBM-MODIFICATIONS.txt')) {
		tests.reportStatus(shelljs.exec('cp ' + repos[i] + '/IBM-MODIFICATIONS.txt ' + SNAPSHOT_DIR + '/modifications/' + repos[i] + '.IBM-MODIFICATIONS.txt'), {silent:true});
	}
}

console.log('Checking cordova.js file for PhoneGap variable...');
// the following line does not exist in the git repo, but must be included in the copy of
// cordova.js given to WL. Produce a reminder if this line is not present.
if (shelljs.grep('PhoneGap', SNAPSHOT_DIR + '/www/cordova.js').length == 0) {
	console.log('*************************************************************');
	console.log('NOTE: Please append the following line:');
	console.log('var PhoneGap = cordova;');
	console.log('to the cordova js file before uploading to gsa. Do not commit this change to the repo.');
	console.log('*************************************************************');
}

console.log('All building complete.');
// Note that the script does not yet zip the snapshot directory; this must be 
// done manually for windows compatibility.