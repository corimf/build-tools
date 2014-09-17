/* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*  http://www.apache.org/licenses/LICENSE-2.0D
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

var build, tests, settings, shelljs, path;

try {
    build = require('./corimf-build.js');
    tests = require('./corimf-tests.js');
    settings = require('./corimf-settings.js');
} catch (e) {
    console.error("Missing needed script files. Please make sure you have corimf-build.js, corimf-tests.js, corimf-settings.js");
    process.exit(2);
}
try {
    shelljs = require('shelljs'),
    path = require('path');
} catch (e) {
    console.error('Missing module. Please run "npm install" from this directory:\n\t' +
        path.dirname(__dirname));
    process.exit(2);
}

build.DisplayScriptInformation(function() {
    build.SetPlatform("ios");
    build.DisplayBuildInformation();
    tests.reportStatus(build.RunPreliminaryTests());
    tests.reportStatus(build.BuildProject(IOSBuildSpecifics));
});

//Takes as a arg a DataPassingObject
var IOSBuildSpecifics = function(DPO) {
    if(!settings.PROJECT_ONLY) {
        console.log('Creating snapshot content in ' + DPO.SNAPSHOT_DIR);
        shelljs.mkdir(DPO.SNAPSHOT_DIR);
        // Copy CORDOVA-LIB to snapshot directory
        CopyRetStatus(shelljs.cp('-R', settings.PLATFORM_REPO + path.sep + 'CordovaLib', DPO.SNAPSHOT_DIR));
        // Copy www folder over to snapshot direcotyr
        CopyRetStatus(shelljs.cp('-R', DPO.PROJECT_DIR + path.sep + 'www', DPO.SNAPSHOT_DIR));
        CopyRetStatus(shelljs.cp('-R', DPO.PROJECT_DIR + path.sep + DPO.PROJECT_NAME + path.sep + 'Classes', DPO.SNAPSHOT_DIR));
        CopyRetStatus(shelljs.cp('-R', DPO.PROJECT_DIR + path.sep + DPO.PROJECT_NAME + path.sep + 'Plugins', DPO.SNAPSHOT_DIR));
        CopyRetStatus(shelljs.cp('-R', DPO.PROJECT_DIR + path.sep + DPO.PROJECT_NAME + path.sep + 'Resources', DPO.SNAPSHOT_DIR));
        CopyRetStatus(shelljs.cp(DPO.PROJECT_DIR + path.sep + DPO.PROJECT_NAME + path.sep + 'config.xml', DPO.SNAPSHOT_DIR));
        CopyRetStatus(shelljs.cp(DPO.PROJECT_DIR + path.sep + DPO.PROJECT_NAME + path.sep + 'main.m', DPO.SNAPSHOT_DIR));
        // remove metadata files created by OSX Finder
        var cwd = shelljs.pwd();
        try {
            shelljs.cd(DPO.SNAPSHOT_DIR);
            var findDSStoreCode = find(DPO.SNAPSHOT_DIR).filter(function(file) { return file.match(/.*DS_Store.*/gi); });
            if(findDSStoreCode)
                for(var k in findDSStoreCode) {
                    shelljs.rm(k);
                }
            console.log(".DS_Store found and deleted");

            shelljs.cd(cwd);
        } catch (e) { shelljs.cd(cwd); } //File not found error, which isn't bad
    }
};

function CopyRetStatus() {
    if(shelljs.error())
        build.reportStatus(0, 'copy command failed');
}