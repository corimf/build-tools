/*
# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#  http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
#

###############################################################################
# Use the -e option so the script will fail on the first non-zero return code.

# This is a script to automate building a 2.3.0 thru 3.1.0 snapshot of Android
# Cordova for delivery to a product team to integrate. It also automates building
# a runtime sample project and mobilespec for 2.3.0 thru 3.4.0. The manual process for
# this is described in our wiki. It is assumed that the platform/plugman/plugin
# repos have already been tagged with NEW_TAG. If you are just doing a test
# build and not creating a snapshot for product integration, you can get around
# the NEW_TAG check by setting it to "HEAD" in your corimf-settings file.
 */

var build, tests, settings, shelljs, path, fs;

try {
    build = require('./corimf-build.js'),
    tests = require('./corimf-tests.js'),
    settings = require('./corimf-settings.js'),
    path = require('path'),
    shelljs = require('shelljs');
    fs = require ('fs');
} catch (e) {
    console.error('Missing module. Please run "npm install" from this directory:\n\t' +
        path.dirname(__dirname));
    process.exit(2);
}
tests.reportStatus(!build.DisplayScriptInformation(function () {
        build.SetPlatform("android");
        build.DisplayBuildInformation();
        tests.reportStatus(build.RunPreliminaryTests(AndroidPreBuildSpecifics));
        tests.reportStatus(build.BuildProject(AndroidBuildSpecifics));
    }));

// Callback function that is called from corimf-build.js RunPreliminaryTests()
var AndroidPreBuildSpecifics = function () {
    console.log("Checking that we are using compiler for Java 5 or 6, not 7...");
    var VERSION = (shelljs.exec('javac -version 2>&1 | cut -f2 -d.', {
            silent : true
        }).output).replace(/(\r\n|\n|\r)/gm, "");
    if (VERSION >= 5) {
        console.log("Java version " + VERSION + " fully compatible");
        if (settings.BRANCH == "2.6.0esr") {
            console.log("Updating platform to use API 17...");
            tests.reportStatus(shelljs.exec('android update project -p ' + settings.PLATFORM_REPO + path.sep + 'framework -t android-17', {
                    silent : true
                }).code == 0);
            // Work around annoying bug in the bin/build script that assumes API 17
            // is the latest you have installed.
            /*
            console.log("Checking that API 17 is the most recent SDK installed...");
            var API_LEVEL = tests.reportStatus(shelljs.exec("`android list targets | grep 'API level:' | tail -n1 | cut -f2 -d: | tr -d ' '", {
                        silent : true
                    }).code == 0);
            if (API_LEVEL != "17") {
                console.log("Sorry, you need to uninstall the SDK for API $API_LEVEL");
                console.log("  or temporarily disable it by moving it to another directory, because it is");
                console.log("  preventing API 17 from being the most recent API installed.");
                console.log('  (i.e., move $SDK_HOME/sdk/platforms/android-18 $SDK_HOME/sdk/disabled-platforms/android-18 and make sure you have "Android SDK Build Tools" for v17 installed.');
                process.exit(code == 1);
            }
            */
        }

        console.log("Rebuilding the cordova.jar...");
        shelljs.cd(settings.PLATFORM_REPO);
        console.log(process.cwd());
        shelljs.cd('framework');
        console.log(process.cwd());
        tests.reportStatus(shelljs.exec('ant clean', {
                silent : false
            }).code === 0);
        var status = shelljs.exec('ant jar', {silent : false});
        tests.reportStatus(status.code == 0);
        shelljs.cd('..');
        shelljs.cd('..');
        
    } else {
        console.log("Java version " + VERSION + " not compatible");
        shelljs.exit(2);
    }
    return true;
},

// Callback function that is called from with corimf-build.js BuildProject()
AndroidBuildSpecifics = function (DPO) {
    var majorBranchNum = Number(settings.BRANCH.substring(0,3));

    //build mobilespec project
    if (settings.MOBILESPEC) {
        console.log("Building the project (apk) for mobilespec...");
        shelljs.cd(DPO.MOBILESPEC_DIR);
        if (majorBranchNum > 3.1)
        {
            tests.reportStatus(shelljs.exec(path.join('cordova','build'), {
                    silent : true
                }).code == 0);
        }
        else
        {
            tests.reportStatus(shelljs.exec('ant debug', {
                    silent : true
                }).code == 0);
        }
        shelljs.cd('..');
    }

    //build example project
    console.log("Building the project (apk)...");
    shelljs.cd(DPO.PROJECT_DIR);
    if(majorBranchNum > 3.1 && settings.PROJECT_ONLY) {
        tests.reportStatus(shelljs.exec(path.join('cordova','build'), {
            silent : true
        }).code == 0);
    }
    else{
    tests.reportStatus(shelljs.exec('ant debug', {
            silent : true
        }).code == 0);

        if (majorBranchNum > 2.6)
        {
            // capture the plugins in a jar for Worklight as a convenience
            tests.reportStatus(shelljs.exec('jar cvf cordova_plugins.jar -C bin/classes org/apache/cordova', {
                    silent : true
                }).code == 0);
        }
     }
    shelljs.cd('..');
    if (!settings.PROJECT_ONLY) {
        console.log("Creating snapshot content in " + DPO.SNAPSHOT_DIR);
        shelljs.mkdir(DPO.SNAPSHOT_DIR);
        // get the original platform project. Not really needed perhaps.
        tests.reportStatus(shelljs.cp('-Rf', path.join('cordova-android', 'framework') , path.join(DPO.SNAPSHOT_DIR, 'framework')));
        if (shelljs.test('-d', path.join(DPO.SNAPSHOT_DIR,'framework','test'))) {
            // don't need test artifacts
            tests.reportStatus(shelljs.rm('-Rf', path.join(DPO.SNAPSHOT_DIR, 'framework','test')));
        }

        // get the example project, which includes cordova.jar and cordova.js.
        tests.reportStatus(shelljs.cp('-Rf',DPO.PROJECT_DIR , path.join(DPO.SNAPSHOT_DIR, 'example')));
        if (shelljs.test('-d', path.join(DPO.SNAPSHOT_DIR,'example','assets','www','spec'))) {
            // don't need test artifacts
            tests.reportStatus(shelljs.rm('-Rf', path.join(DPO.SNAPSHOT_DIR, 'example','assets','www','spec')));
        }
    }
    return true;
};
