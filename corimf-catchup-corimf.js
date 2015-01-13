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
 
 //catchup-corimf is aimed to get locally the latest changes from corimf repository
var shelljs = require('shelljs'),
settings = require('./corimf-settings.js'),
tmp = require('temporary'),
tests = require('./corimf-tests');

try {
    fs = require('fs'),
    readline = require('readline'),
    shelljs = require('shelljs'),
    path = require('path');
    colors = require('colors');
} catch (e) {
    console.error('Missing module. Please run "npm install" from this directory:\n\t' +
        path.dirname(__dirname));
    process.exit(2);
}

var rl = readline.createInterface({
        input : process.stdin,
        output : process.stdout
    });

console.log('PLATFORM_REPO = ' + settings.PLATFORM_REPO);
console.log('REMOTE_ORIGIN = ' + settings.REMOTE_ORIGIN);
console.log('BRANCH = ' + settings.BRANCH);
console.log('NEW_TAG = ' + settings.NEW_TAG);
if (settings.SKIP_PLUGIN.length > 0)
    console.log('SKIP_PLUGIN = ' + settings.SKIP_PLUGIN);
if (settings.PROJECT_ONLY)
    console.log('****Caution, building project only****');
console.log();

rl.question("Hit ENTER to continue", function (enter) {

    var allRepos = (settings.PLATFORM_REPOS).concat((settings.PLUGINS).concat(settings.OTHER_REPOS))

    tests.checkAboveGitRepo();
    tests.checkMajorVersionNum();
    tests.checkReposExist(allRepos);
    tests.checkRemoteExists(allRepos, settings.REMOTE_ORIGIN);
    fullLocalCatchup(allRepos, settings.BRANCH);

    rl.on('close', function () {
        console.log("\n");
        rl.close();
        //Exit the program through reportStatus to clean up temp dir.
        tests.reportStatus(true);
    });
    //Close the readline stream and return success code of 0
    rl.close();
});

function fullLocalCatchup(repos, checkoutBranch) {
    var count = 0;
    console.log('Repositories count: ' + repos.length);
    repos.forEach(function (repo) {
        if (shelljs.test('-d', repo)) {
            shelljs.cd(repo);
            console.log('Checking out to ' + checkoutBranch.yellow + ' branch...');
            tests.reportStatus(shelljs.exec('git checkout ' + checkoutBranch, {
                    silent : false
                }).code == 0);
            console.log('Updating ' + repo.green + ' repository...');
            tests.reportStatus(shelljs.exec('git pull ' + settings.MASTER_ORIGIN, {
                    silent : false
                }).code == 0);
            count++;
            shelljs.cd('..');
        }
    });
    console.log(count + " repositories updated");
}
