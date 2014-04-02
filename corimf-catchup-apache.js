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
* This is a script to catch up corimf to have the content from the Apache repos
* for $BASE_BRANCH. $BASE_BRANCH is not expected to already exist locally or in
* corimf, this will create it if necessary. Since $BRANCH typically is an ESR
* branch (i.e., "3.1.0esr"), that won't exist in the Apache repos, so to avoid
* playing with the variable of $BASE we'll use another variable named
* $BASE_BRANCH. This script will not create any new IBM tags, it just propogates
* tags that already exist in the Apache repos.
*/
var shelljs = require('shelljs'),
	settings = require('./corimf-settings.js'),
	tmp = require('temporary'),
	tests = require('./corimf-tests');

console.log('MASTER_ORIGIN = ' + settings.MASTER_ORIGIN);
console.log('REMOTE_ORIGIN = ' + settings.REMOTE_ORIGIN);
console.log('BASE_BRANCH = ' + settings.BASE_BRANCH);
console.log('PREV TAG = ' + settings.PREV_TAG);
console.log('...');
console.log('...');

var allRepos = settings.PLATFORM_REPOS.concat([settings.PLUGINS, settings.OTHER_REPOS]);

tests.checkAboveGitRepo();
tests.checkMajorVersionNum();
tests.checkReposExist(allRepos);
tests.checkRemoteExists(allRepos, settings.REMOTE_ORIGIN);
tests.checkRemoteExists(allRepos, settings.MASTER_ORIGIN);
tests.pullAndFetchTags(allRepos);

console.log('Updating ' + settings.BASE_BRANCH + ' from ' + settings.MASTER_ORIGIN + ' to ' + settings.REMOTE_ORIGIN + '...');
if (settings.BASE_BRANCH == 'master') {
	console.log('Getting latest development branches...');
	tests.catchUp(settings.PLATFORM_REPOS.concat(settings.OTHER_REPOS), settings.BASE_BRANCH);

	tests.catchUP(settings.PLUGINS, 'dev');
} else {
	console.log('Getting branch ' + settings.BASE_BRANCH + ' for platform repos...');
	tests.catchUp(settings.PLATFORM_REPOS, settings.BASE_BRANCH);
	
	console.log('Getting latest production branch for plugin and other repos...');
	tests.catchUp(settings.PLUGINS.concat(settings.OTHER_REPOS), 'master');
}

console.log('All tasks complete.');