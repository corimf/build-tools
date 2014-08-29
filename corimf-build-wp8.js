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
    path = require('path');

tests.reportStatus(!build.DisplayScriptInformation(function() {
    build.SetPlatform("wp8");
    build.DisplayBuildInformation();
    tests.reportStatus(build.RunPreliminaryTests());
    tests.reportStatus(build.BuildProject(WP8BuildSpecifics));
}));

//Callback function that is called from corimf-build.js
var WP8BuildSpecifics = function(DPO) {
	console.log('Building project in Release:AnyCPU mode...');
	// wp8 create script does not name sln and csproj files appropriately, so rename them
	shelljs.exec('mv CordovaWP8AppProj.csproj example.csproj', {silent:true});
	shelljs.exec('mv CordovaWP8Solution.sln example.sln', {silent:true});

	// build the sample project in Visual Studio
	tests.reportStatus(shelljs.exec('msbuild' + ' ' + path.join(DPO.PROJECT_DIR, 'example.sln') + ' ' +'/p:Configuration=Release', {silent:true}).code == 0);
	if(!settings.PROJECT_ONLY) {
		console.log('Creating snapshot content in ' + DPO.SNAPSHOT_DIR);
		shelljs.mkdir(DPO.SNAPSHOT_DIR);

		// grab the www folder and add it to the snapshot. Should contain cordova.js and
		// the plugins

		tests.reportStatus(shelljs.cp('-Rf', path.join(DPO.PROJECT_DIR,'www'), DPO.SNAPSHOT_DIR));

		// get the dll from Bin/Release
		tests.reportStatus(shelljs.cp('-Rf', path.join(DPO.PROJECT_DIR,'Bin', 'Release', 'com.example.dll'), DPO.SNAPSHOT_DIR));

		console.log('Checking cordova.js file for PhoneGap variable...');
		// the following line does not exist in the git repo, but must be included in the copy of
		// cordova.js given to WL. Produce a reminder if this line is not present.
		if (shelljs.grep('PhoneGap', path.join(DPO.PROJECT_DIR, 'www', 'cordova.js')).length == 0) {
			console.log('*************************************************************');
			console.log('NOTE: Please append the following line:');
			console.log('var PhoneGap = cordova;');
			console.log('to the cordova js file before uploading to gsa. Do not commit this change to the repo.');
			console.log('*************************************************************');
		}
	}
    return true;
	// Note that the script does not yet zip the snapshot directory; this must be
	// done manually for windows compatibility.
}
