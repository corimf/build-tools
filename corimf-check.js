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
* This is a script to automate checks and tasks for our Cordova ESR 
* release process. It runs sanity checks and helps us get our git repos
* loaded correctly. It should be invoked inside the repo that has a fix.
* Note that corimf-settings.js should first be updated.
*/

var shelljs = require('shelljs'),
	settings = require('./corimf-settings.js'),
	tmp = require('temporary'),
	fs = require('fs'),
	crypto = require('crypto');

console.log('PLATFORM_REPO = ' + settings.PLATFORM_REPO);
console.log('REMOTE_ORIGIN = ' + settings.REMOTE_ORIGIN);
console.log('BRANCH = ' + settings.BRANCH);
console.log('NEW TAG = ' + settings.NEW_TAG);
console.log('PREV TAG = ' + settings.PREV_TAG);
console.log('...');
console.log('...');

function reportStatus(rc) {
	if(rc == 0) {
		console.log("TEST FAILED");
		shelljs.exit(1);
	} else {
		console.log('Success');
	}
}

var result, file1, file2;

console.log('Checking that this is being run in a git repo...');
file1 = new tmp.File();
file1.writeFileSync(shelljs.exec('git status --porcelain -b', {silent:true}).output);
file2 = new tmp.File();
file2.writeFileSync(shelljs.grep('^##', file1.path));
result = shelljs.grep('esr$', file2.path);
reportStatus(result != null);
file1.unlink();
file2.unlink();

console.log('Checking that we are on the expected ESR branch ' + settings.BRANCH + '...');
file1 = new tmp.File();
file2 = new tmp.File();
file1.writeFileSync(shelljs.exec('git status --porcelain -b', {silent:true}).output);
file2.writeFileSync(shelljs.grep('^##', file1.path));
reportStatus(shelljs.grep(settings.BRANCH, file2.path).length > 0);
file1.unlink();
file2.unlink();

console.log('Doing a pull from ' + settings.REMOTE_ORIGIN + ' to make sure we are up-to-date...');
reportStatus(shelljs.exec('git pull ' + settings.REMOTE_ORIGIN + ' ' + settings.BRANCH, {silent:true}).code == 0);

console.log('Fetching all the tags from ' + settings.REMOTE_ORIGIN + ' to make sure we are up-to-date...');
reportStatus(shelljs.exec('git fetch --tags ' + settings.REMOTE_ORIGIN, {silent:true}).code == 0);

console.log('Checking that the IBM-MODIFICATIONS.txt file exists...');
reportStatus(shelljs.test('-e', './IBM-MODIFICATIONS.txt'));

console.log('Checking that there are no untracked files...');
file1 = new tmp.File();
file1.writeFileSync(shelljs.exec('git status --porcelain --untracked-files=all', {silent:true}).output);
reportStatus(shelljs.grep('^\\?\\?', file1.path).length == 0);
file1.unlink();

console.log('Checking that there are no uncommited additions...');
file1 = new tmp.File();
file1.writeFileSync(shelljs.exec('git status --porcelain', {silent:true}).output);
reportStatus(shelljs.grep('^A ', file1.path).length == 0);
file1.unlink();

console.log('Checking that there is a change to the IBM-MODIFICATIONS.txt file since the previous tag ' + settings.PREV_TAG);
result = shelljs.exec('git log --format=oneline ' + settings.PREV_TAG + '.. IBM-MODIFICATIONS.txt', {silent:true});
reportStatus((result.code == 0) && (result.output.length > 0));

console.log('Checking that the new tag ends in uNUM...');
file1 = new tmp.File();
file1.writeFileSync(settings.NEW_TAG);
reportStatus(shelljs.grep('u[0-9]\{1,\}$', file1.path).length > 0);
file1.unlink();

console.log('Checking that the new tag is present in the local repo...');
reportStatus(shelljs.exec('git rev-parse --verify ' + settings.NEW_TAG, {silent:true}).code == 0);

console.log('Checking that there are no commits in the local repo past the new tag...');
reportStatus(shelljs.exec('git log --format=oneline ' + settings.NEW_TAG + '..', {silent:false}).output.length == 0);

console.log('Checking that the local commits are in the remote repo...');
reportStatus(shelljs.exec('git diff --shortstat ' + settings.REMOTE_ORIGIN + '/' + settings.BRANCH, {silent:true}).output.length == 0);

console.log('Checking that the local tag is in the remote repo...');
reportStatus(shelljs.exec('git ls-remote --tags ' + settings.REMOTE_ORIGIN + ' ' + settings.NEW_TAG, {silent:true}).output.length > 0);

console.log('Checking that the hash of the local tag is the same as the remote...');
var local = shelljs.exec('git rev-parse ' + settings.NEW_TAG + ' | cut -f1', {silent:true}).output;
var remote = shelljs.exec('git ls-remote --tags ' + settings.REMOTE_ORIGIN + ' ' + settings.NEW_TAG + ' | cut -f1', {silent:true}).output;
reportStatus(local == remote);

console.log('All tests complete.');