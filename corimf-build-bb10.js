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
var build = require('./corimf-build.js'),
settings = require('./corimf-settings.js'),
tests = require('./corimf-tests.js'),
shelljs = require('shelljs'),
et = require('elementtree'),
fs = require('fs'),
path = require('path');

tests.reportStatus(!build.DisplayScriptInformation(function () {
        build.SetPlatform("blackberry10");
        build.DisplayBuildInformation();
        tests.reportStatus(build.RunPreliminaryTests());
        tests.reportStatus(build.BuildProject(BB10BuildSpecifics));
    }));

//Callback function that is called from corimf-build.js
var BB10BuildSpecifics = function (DPO) {

    //BB10 handles a config.xml file in its www folder, which it gets overridden by the one on www mobilspec, that contents the whitelist information.
    //Let's bring back that file from the example project before build.
    tests.reportStatus(shelljs.cp('-Rf', path.join(DPO.PROJECT_DIR, 'www', 'config.xml'), path.join(DPO.MOBILESPEC_DIR, 'www', 'config.xml')));
    console.log("Building Blackberry 10 example project...");
    shelljs.cd(DPO.PROJECT_DIR);
    //Locate node folder in local environment and define it as CORDOVA_NODE, 3.1.0 only works with local on Windows
    tests.reportStatus(shelljs.exec(path.join('cordova', 'build'), {
            silent : false
        }).code == 0);
    shelljs.cd("..");
    if (settings.MOBILESPEC) {
        console.log("Building Blackberry 10 MobileSpec project...");
        shelljs.cd(DPO.MOBILESPEC_DIR);
        tests.reportStatus(shelljs.exec(path.join('cordova', 'build'), {
                silent : false
            }).code == 0);
    }
    var majorBranchNum = Number(settings.BRANCH.substring(0, 3));
    shelljs.cd("..");
    if (!settings.PROJECT_ONLY && majorBranchNum <= 3.1) {
        //Add code for content deliverable
        shelljs.mkdir(DPO.SNAPSHOT_DIR);
        tests.reportStatus(shelljs.cp('-Rf', path.join(DPO.PROJECT_DIR, 'www', '*'), path.join(DPO.SNAPSHOT_DIR, 'www')));
        tests.reportStatus(shelljs.cp('-Rf', path.join(DPO.PROJECT_DIR, 'cordova', 'plugins', '*'), path.join(DPO.SNAPSHOT_DIR, 'plugins')));

        if (shelljs.test('-d', path.join(DPO.SNAPSHOT_DIR, 'www', 'spec'))) {
            // don't need test artifacts
            tests.reportStatus(shelljs.rm('-Rf', path.join(DPO.SNAPSHOT_DIR, 'www', 'spec')));
        }
    }
    return true;
};