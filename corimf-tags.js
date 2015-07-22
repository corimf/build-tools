#!/usr/bin/env node
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

 This is a script to tag all the repos when a fix is generated. Since
 generally only about 1 repo gets touched for a fix, it will save time
 to automate the tagging of the rest of them. This script assumes that
 all the repos have the fix checked in, and are in the desired state
 (because you would already be in the desired state immediately after 
 testing your fix). 
*/

var tests, settings, fs, readline, shelljs, path, DONE = true;
try {
    tests = require('./corimf-tests.js');
    settings = require('./corimf-settings.js');
} catch (e) {
    console.error("Missing needed script files. Please make sure you have corimf-tests.js, corimf-settings.js in the build tools directory");
    process.exit(2);
}

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
      input: process.stdin,
      output: process.stdout
    });

    console.log('PLATFORM_REPO = ' + settings.PLATFORM_REPO);
    console.log('REMOTE_ORIGIN = ' + settings.REMOTE_ORIGIN);
    console.log('BRANCH = ' + settings.BRANCH);
    console.log('NEW_TAG = ' + settings.NEW_TAG);
    if(settings.SKIP_PLUGIN.length > 0)
        console.log('SKIP_PLUGIN = ' + settings.SKIP_PLUGIN);
    if(settings.PROJECT_ONLY)
        console.log('****Caution, building project only****');
    console.log();

    rl.question("Hit ENTER to continue", function(enter) {
        tests.checkAboveGitRepo();
        tests.checkMajorVersionNum();
        tests.checkReposExist(settings.PLUGINS);
        //fullCatchLocal((settings.PLATFORM_REPOS).concat((settings.PLUGINS).concat(settings.OTHER_REPOS)), settings.BRANCH);
        tagAndPush((settings.PLATFORM_REPOS).concat((settings.PLUGINS).concat(settings.OTHER_REPOS)), settings.NEW_TAG)
        //If the user hits ctrl-c the script terminates
    rl.on('close', function() {
        console.log("\n");
        rl.close();
        //Exit the program through reportStatus to clean up temp dir.
        tests.reportStatus(true);
    });
    //Close the readline stream and return success code of 0
    rl.close();
    });
    
    
function fullCatchLocal(repos, checkoutBranch){
    var count=0;
    console.log('Repositories count: '+ repos.length);
    repos.forEach(function( repo){
        if(shelljs.test('-d', repo)){
        shelljs.cd(repo);
        console.log('Checking out to ' +checkoutBranch.blue+ ' branch...');
        tests.reportStatus(shelljs.exec('git checkout ' + checkoutBranch, {silent:false}).code == 0);
        console.log('Updating ' +repo.green+ ' repository...');
        tests.reportStatus(shelljs.exec('git pull ' + settings.MASTER_ORIGIN, {silent:false}).code == 0);
        count++;
        shelljs.cd('..');
        }
    });
    console.log(count+" repositories updated");
}

function tagAndPush(repos, tag){
    var count=0;
    console.log('Repositories count: '+ repos.length);
    repos.forEach(function(repo){
        shelljs.cd(repo);
        console.log('Setting tag '+tag.blue+ ' to ' +repo.green+ ' repository...');
        //Deletes the tag: tests.reportStatus(shelljs.exec('git tag -d ' + tag, {silent:false}).code == 0);
        tests.reportStatus(shelljs.exec('git tag ' + tag, {silent:false}).code == 0);
        console.log('Pushing tag: ' +tag.blue+' to '+ repo.green +' based in branch: '+settings.BRANCH.bold+ ' to remote: '+ settings.MASTER_ORIGIN.bold +' ...');
        //Deletes the tag remotely tests.reportStatus(shelljs.exec('git push --delete ' + settings.MASTER_ORIGIN + ' ' +tag, {silent:false}).code == 0);
        tests.reportStatus(shelljs.exec('git push ' + settings.MASTER_ORIGIN + ' ' +tag, {silent:false}).code == 0);
        count++;
        shelljs.cd('..');
    });
    console.log(count+" repositories updated");
}
