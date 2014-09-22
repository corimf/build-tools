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
} catch (e) {
    console.error('Missing module. Please run "npm install" from this directory:\n\t' +
        path.dirname(__dirname));
    process.exit(2);
}

/* platform = platform build is targeted for
    repos = list of repos
    tmpDir = temporary directory that holds SNAPSHOT of deliverable before it is zipped
    unzip = boolean flag to determine if unzip command can be used
*/
var execOutput, platform, repos, tmpDir, unzip = false;

// Set up readline to prompt for user input
var rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

var DisplayScriptInformation = function(scriptWorkflow) {
    PreliminaryTests();

    console.log('PLATFORM_REPO = ' + settings.PLATFORM_REPO);
    console.log('REMOTE_ORIGIN = ' + settings.REMOTE_ORIGIN);
    console.log('BRANCH = ' + settings.BRANCH);
    console.log('NEW_TAG = ' + settings.NEW_TAG);
    console.log('PROJECT_ONLY = ' + settings.PROJECT_ONLY);
    console.log('MOBILESPEC = ' + settings.MOBILESPEC);
    if(settings.SKIP_PLUGIN.length > 0)
        console.log('SKIP_PLUGIN = ' + settings.SKIP_PLUGIN);
    if(settings.PROJECT_ONLY)
        console.log('****Caution, building project only****');
    console.log();

    rl.question("Hit ENTER to continue", function(enter) {
        scriptWorkflow();

    //If the user hits ctrl-c the script terminates
    rl.on('close', function() {
        console.log("\n");
        rl.close();
        //Exit the program through reportStatus to clean up temp dir.
        reportStatus(DONE);
    });
    //Close the readline stream and return success code of 0
    rl.close();
    });
}

var SetPlatform = function(pf) {
    platform = pf;
}

var DisplayBuildInformation = function() {

    console.log('Running ' + platform.toUpperCase() + ' Cordova build of corimf:');
    datetime = new Date();
    console.log(' Date: ' + datetime.toDateString());
    console.log(' Remote origin: ' + settings.REMOTE_ORIGIN);
    console.log(' Branch: ' + settings.BRANCH);
    console.log(' New Tag: ' + settings.NEW_TAG);
    if(settings.SKIP_PLUGIN.length > 0)
        console.log(' Skip Plugin: ' + settings.SKIP_PLUGIN);
    console.log();
};

var RunPreliminaryTests = function(platformSpecificCode) {
    console.log('Checking if temporary directory ".temp" already exists');
    reportStatus(!shelljs.test('-d', '.temp'));

    console.log('Creating temporary directory: .temp');
    shelljs.mkdir('.temp');
    tmpDir = shelljs.pwd() + path.sep + '.temp';

    tests.checkAboveGitRepo();
    tests.checkMajorVersionNum();
    tests.checkReposExist(settings.PLUGINS);

    repos = settings.PLUGINS.concat(settings.PLATFORM_REPO);
    if (settings.PLUGMAN_REPO.length > 0)
        repos = repos.concat(settings.PLUGMAN_REPO);

    // If not building project only, git-archive the branch that is desired
    if(!settings.PROJECT_ONLY) {
        console.log('Creating archive of: ' + settings.BRANCH + ' for platform and plugins...');
        for (var i = 0; i < repos.length; i++) {
            console.log(repos[i] + ': ');
            shelljs.cd(repos[i]);
            var archiveCommand = 'git archive --format=zip ' + '-o ' + tmpDir + path.sep + repos[i] + '.zip ' + settings.REMOTE_ORIGIN + '/' + settings.BRANCH;
            reportStatus((execOutput = shelljs.exec(archiveCommand, {silent:false})).code == 0, execOutput.output);
            shelljs.cd('..');
        }
    }

    //tests.pullAndFetchTags(repos);

    console.log('Checking that the platform and plugins have the tag ' + settings.NEW_TAG + '...');
    for (var i = 0; i < repos.length; i++) {
        console.log(repos[i] + ': ');
        shelljs.cd(repos[i]);
        reportStatus((execOutput = shelljs.exec('git rev-parse ' + settings.NEW_TAG, {silent:true})).code == 0, execOutput.output);
        shelljs.cd('..');
    }

    console.log('Checking that the platform and plugins are checked out at the tag ' + settings.NEW_TAG);
    // If building project only, git-archive the specific tag desired
    if(settings.PROJECT_ONLY) {
        for (var i = 0; i< repos.length; i++) {
            console.log(repos[i] + ': ');
            shelljs.cd(repos[i]);
            var archiveCommand = 'git archive --format=zip ' + '-o ' + tmpDir + path.sep + repos[i] + '.zip ' + settings.NEW_TAG;
            reportStatus((execOutput = shelljs.exec(archiveCommand)).code == 0, execOutput.output);
            shelljs.cd('..');
        }
    }
    // If not building project only, make sure that the branch matches the latest tag in Git
    else {
        for (var i = 0; i < repos.length; i++) {
            console.log(repos[i] + ': ');
            shelljs.cd(repos[i]);
            var actual = shelljs.exec('git rev-parse ' + settings.BRANCH, {silent:true});
            reportStatus(actual.code == 0, actual.output);
            var desired = shelljs.exec('git rev-parse ' + settings.NEW_TAG, {silent:true});
            reportStatus(desired.code == 0, desired.output);
            reportStatus(actual.output.trim() === desired.output.trim(), "Branch hash doesn't match latest tag hash");
            shelljs.cd('..');
        }
    }

    console.log("Un-zipping archived repos in temp dir");
    var cwd = shelljs.pwd();
    shelljs.cd(tmpDir);
    for (var i = 0; i< repos.length; i++) {
        console.log('Unzipping: ' + repos[i]);
        shelljs.mkdir(repos[i]);
        shelljs.cd(repos[i]);
        if(unzip == true) {
            reportStatus((execOutput = shelljs.exec('unzip ' + tmpDir + path.sep + repos[i] + '.zip', {silent:true})).code == 0, execOutput.output);
        }
        else {
            reportStatus((execOutput = shelljs.exec('7z x ' + tmpDir + path.sep + repos[i] + '.zip', {silent:true})).code == 0, execOutput.output);
        }
        shelljs.cd('..');
    }
    // npm install in cordova-plugman before cd'ing back into main directory where script was ran
    if (settings.PLUGINS.length > 0) {
        console.log('Loading pre-reqs for plugman...');
        shelljs.cd(settings.PLUGMAN_REPO);
        if(shelljs.test('-d', 'node_modules')) {
            execOutput = shelljs.rm('-rf', 'node_modules');
        }
        reportStatus((execOutput = shelljs.exec('npm install', {silent:true})).code == 0, execOutput.output);
        shelljs.cd('..');
    }

    shelljs.cd(cwd);

    // Android has code that must be run before build starts
    if(platform === 'android')
        platformSpecificCode();

    return DONE;
};

var BuildProject = function(platformSpecificCode) {
    var pathCorimf = shelljs.pwd();
    var PROJECT_DIR = 'example-' + platform + '-' + settings.NEW_TAG;
    var SNAPSHOT_DIR = 'forgsa-' + platform + '-' + settings.NEW_TAG;
    var MOBILESPEC_DIR = 'mobilespec-' + platform + '-' + settings.NEW_TAG;
    var PROJECT_NAME = platform === "wp8" ? 'WPCordovaClassLib' : 'EXAMPLE';
    var pathProject = pathCorimf + path.sep + PROJECT_DIR;
    var pathSnapshot = tmpDir + path.sep + SNAPSHOT_DIR;

    console.log('Checking that project ' + PROJECT_DIR + ' does not exist yet...');
    reportStatus(!shelljs.test('-d', PROJECT_DIR));

    if(!settings.PROJECT_ONLY) {
        console.log('Checking that snapshot dir ' + SNAPSHOT_DIR + ' does not exist yet...');
        reportStatus(!shelljs.test('-d', tmpDir + path.sep + SNAPSHOT_DIR));
    }

    var execPath = platform === "wp8" ? path.join(pathCorimf, 'cordova-' + platform, 'wp8', 'bin', 'create') : path.join(pathCorimf, 'cordova-' + platform, 'bin', 'create');
    var cmd = execPath + ' ' + PROJECT_DIR + ' com.example ' + PROJECT_NAME;
    console.log('Creating a new ' + platform.toUpperCase() + ' Project...');
    console.log('Running: \n' + cmd);
    tests.reportStatus(shelljs.exec(cmd, {silent : false}).code == 0);

    console.log('Installing plugins into project...');
    for (var i = 0; i < settings.PLUGINS.length; i++) {
        var pathPlugman = path.join(tmpDir, settings.PLUGMAN_REPO, 'main.js');
        var execCommand = 'node ' + pathPlugman  + ' --debug install --platform ' + platform + ' --project ' + pathProject + ' --plugin ' + tmpDir + path.sep + settings.PLUGINS[i];
        reportStatus((execOutput = shelljs.exec(execCommand, {silent:true})).code == 0, execOutput.output);
    }

    //build mobilespec
    if(settings.MOBILESPEC) {
        var WWW_DIR;
        if (platform == "ios")
            WWW_DIR = '/www';
        else if(platform == "android")
            WWW_DIR = '/assets/www';

        console.log('Creating mobilespec...');
        console.log('Checking that project ' + MOBILESPEC_DIR + ' does not exist yet...');
        reportStatus(!shelljs.test('-d', MOBILESPEC_DIR));

        shelljs.cp('-R', path.join(PROJECT_DIR, '/*'), MOBILESPEC_DIR);
        shelljs.cp('-Rf', 'cordova-mobile-spec/*', path.join(MOBILESPEC_DIR, WWW_DIR));
    }

    //Execute platform specific code to populate SNAPSHOT_DIR, moving needed files & directories into SNAPSHOT_DIR
    var dataPassingObject = {
        "SNAPSHOT_DIR":tmpDir + path.sep + SNAPSHOT_DIR,
        "PROJECT_DIR":PROJECT_DIR,
        "MOBILESPEC_DIR":MOBILESPEC_DIR,
        "PROJECT_NAME":PROJECT_NAME
    };
    platformSpecificCode(dataPassingObject);

    if(!settings.PROJECT_ONLY) {
        //get the IBM-MODIFICATIONS.txt
        shelljs.mkdir(path.join(tmpDir, SNAPSHOT_DIR, 'modifications'));
        for (var i = 0; i < repos.length; i++) {
           if (shelljs.test('-f', path.join(repos[i], 'IBM-MODIFICATIONS.txt'))) {
                var src = path.join(repos[i], 'IBM-MODIFICATIONS.txt');
                var dest = tmpDir + path.sep + SNAPSHOT_DIR + path.sep + 'modifications' + path.sep + repos[i] + '.IBM-MODIFICATIONS.txt';
               shelljs.cp(src, dest);
            }
        }

        if(unzip == true) {
            // Zipping up folder for WL team
            console.log("Zipping snapshot content as " + SNAPSHOT_DIR + ".zip...");
            var cwd = shelljs.pwd();
            var unzipFile = cwd + path.sep + SNAPSHOT_DIR + '.zip';
            shelljs.cd(tmpDir);
            reportStatus(shelljs.exec('zip -r ' + unzipFile + ' .' + path.sep + SNAPSHOT_DIR, {silent:true}).code == 0);
            shelljs.cd(cwd);
        }
    }

    RemoveTempDir();
    console.log('All building complete.');

    return DONE;
};

var reportStatus = function(testStatus, testOutput) {
    if(testStatus == 0) {
        console.log("ERROR: \n");
        if(testOutput != undefined)
            console.log(testOutput);
        RemoveTempDir();
        shelljs.exit(1);
    }
};

//Reads all files from a location and stores the file paths into the provided array.
//Usage eg: var wwwList = [];
//wwwList = getAllFiles(path.join(shelljs.pwd(), 'cordova-android'), wwwList);
var getAllFiles = function (dirPath, fileTree) {
    var arrayList = fs.readdirSync(dirPath);
    arrayList.forEach(function (file) {
        var pathFile = path.join(dirPath, file);
        if (fs.statSync(pathFile).isDirectory()) {
            getAllFiles(pathFile, fileTree);
        } else {
            fileTree.push(pathFile);
            console.log(pathFile);
        }
    });
    return fileTree;
};

function RemoveTempDir() {
    if(tmpDir) {
        shelljs.rm('-rf', tmpDir)
        if(shelljs.test('-d', tmpDir))
            console.log("Error removing temporary directory '.temp'");
    }
}

function PreliminaryTests() {
console.log("Checking for unzip command");
    if(shelljs.exec('unzip', {silent:true}).code == 0)
        unzip = true;
    else {
        console.log("Checking if 7zip is installed");
        reportStatus((execOutput = shelljs.exec('7za', {silent:true})).code != 0, execOutput.output);
    }
    if(shelljs.exec('ulimit', {silent:true}).code == 0)
    {
        console.log("Checking 'ulimit' size for file descriptors");
        var ulimitSize = Number(shelljs.exec('ulimit -n').output);
        if(ulimitSize < 4192)
            reportStatus(false, "'ulimit' size too small, please run command 'ulimit -n 4192' before running script");
    }

    var majorBranchNum = Number(settings.BRANCH.substring(0,3));
    console.log(majorBranchNum);
    if(majorBranchNum > 3.1 && settings.PROJECT_ONLY == false) {
        reportStatus(false, "Cannot build full deliverable for branches above 3.1 using this script, please either set PROJECT_ONLY to true in settings or use other script");
    }
}

exports.SetPlatform = SetPlatform;
exports.DisplayScriptInformation = DisplayScriptInformation;
exports.DisplayBuildInformation = DisplayBuildInformation;
exports.RunPreliminaryTests = RunPreliminaryTests;
exports.BuildProject = BuildProject;
exports.reportStatus = reportStatus;
exports.getAllFiles = getAllFiles;
