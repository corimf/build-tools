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
********************************************************************************
* This is a script to hold otherwise duplicated code for various tests
* used in the build scripts.
*/

var shelljs = require('shelljs'),
	settings = require('./corimf-settings.js'),
	tmp = require('temporary');

var tmpFile;

function reportStatus(testStatus, errMessage) {
	if(testStatus == 0) {
		console.log("ERROR\n");
		if(errMessage != undefined)
			console.log(errMessage);

		if(tmpFile) {
			tmpFile.unlink();
		}
		shelljs.exit(1);
	}
}

function checkAboveGitRepo() {
	console.log('Checking that we are one dir above the git repo...');
	reportStatus(shelljs.test('-d', settings.PLATFORM_REPO));
}

function checkMajorVersionNum() {
	console.log('Checking major version number...');
	var major = settings.BASE_BRANCH.split('.')[0];
	reportStatus((major >= 2) && (major <= 3));
	console.log('major: ' + major);
	if (major >= 3) {
		console.log('Checking that the plugin count is ' + settings.PLUGIN_COUNT);
		reportStatus(settings.PLUGIN_COUNT == settings.PLUGINS.length);
	} else {
		console.log('Skipping all plugins since version is ' + major);
		settings.PLUGINS = [];
		settings.PLUGMAN_REPO = '';
	}
}

function checkReposExist(repos) {
	console.log('Checking that each repo exists...');
	for (var i = 0; i < repos.length; i++) {
		reportStatus(shelljs.test('-d', repos[i]));
	}

	if (settings.MOBILESPEC)
	{
		reportStatus(shelljs.test('-d', 'cordova-mobile-spec'));
	}
}

function checkRemoteExists(repos, remoteName) {
	console.log('Checking that ' + settings.REMOTE_ORIGIN + ' is a defined remote...');
	var tmpFile;
	for (var i = 0; i < repos.length; i++) {
		shelljs.cd(repos[i]);

		tmpFile = new tmp.File();
		tmpFile.writeFileSync(shelljs.exec('git remote', {silent:true}).output);
		reportStatus(shelljs.grep(remoteName, tmpFile.path).length > 0);
		tmpFile.unlink();

		shelljs.cd('..');
	}
}

function pullAndFetchTags(repos) {
	console.log('Syncing tags...');
	for (var i = 0; i < repos.length; i++) {
		shelljs.cd(repos[i]);
		reportStatus(shelljs.exec('git fetch --tags ' + settings.MASTER_ORIGIN, {silent:true}).code == 0);
		reportStatus(shelljs.exec('git push --tags ' + settings.REMOTE_ORIGIN, {silent:true}).code == 0);
		shelljs.cd('..');
	}
}

function catchUp(repos, checkoutBranch) {
	for (var i = 0; i < repos.length; i++) {
		shelljs.cd(repos[i]);
		console.log('Checking out ' + checkoutBranch + ' in ' + repos[i] + '...');
		reportStatus(shelljs.exec('git checkout ' + checkoutBranch + ' || git checkout -b ' + checkoutBranch + ' ' + settings.MASTER_ORIGIN + '/' + checkoutBranch, {silent:true}).code == 0);

		console.log('Catching up local ' + checkoutBranch + ' from ' + settings.MASTER_ORIGIN + '...');
		reportStatus(shelljs.exec('git pull ' + settings.MASTER_ORIGIN + ' ' + checkoutBranch, {silent:true}).code == 0);

		console.log('Catching up remote ' + checkoutBranch + ' at ' + settings.REMOTE_ORIGIN + '...');
		reportStatus(shelljs.exec('git push ' + settings.REMOTE_ORIGIN + ' ' + checkoutBranch, {silent:true}).code == 0);
		shelljs.cd('..');
	}
}

exports.checkAboveGitRepo = checkAboveGitRepo;
exports.checkMajorVersionNum = checkMajorVersionNum;
exports.checkReposExist = checkReposExist;
exports.checkRemoteExists = checkRemoteExists;
exports.pullAndFetchTags = pullAndFetchTags;
exports.catchUp = catchUp;
exports.tmpFile = tmpFile;
exports.reportStatus = reportStatus;