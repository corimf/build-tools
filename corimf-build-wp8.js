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
	shelljs.exec('mv CordovaWP8AppProj.csproj '+ DPO.PROJECT_NAME +'.csproj', {silent:true});
	shelljs.exec('mv CordovaWP8Solution.sln '+ DPO.PROJECT_NAME +'.sln', {silent:true});

	//build mobilespec in visual studio
	if (settings.MOBILESPEC)
	{
		//register www files
		addWWWForMobileSpec(DPO.MOBILESPEC_DIR, DPO.PROJECT_NAME+'.csproj');

		tests.reportStatus(shelljs.exec('msbuild' + ' ' + path.join(DPO.MOBILESPEC_DIR, DPO.PROJECT_NAME +'.sln') + ' ' +'/p:Configuration=Release', {silent:false}).code == 0);
	}

	// build the sample project in Visual Studio
	tests.reportStatus(shelljs.exec('msbuild' + ' ' + path.join(DPO.PROJECT_DIR, DPO.PROJECT_NAME +'.sln') + ' ' +'/p:Configuration=Release', {silent:false}).code == 0);
	if(!settings.PROJECT_ONLY) {
		console.log('Creating snapshot content in ' + DPO.SNAPSHOT_DIR);
		shelljs.mkdir(DPO.SNAPSHOT_DIR);

		// grab the www folder and add it to the snapshot. Should contain cordova.js and
		// the plugins

		tests.reportStatus(shelljs.cp('-Rf', path.join(DPO.PROJECT_DIR,'www'), DPO.SNAPSHOT_DIR));

		// get the dll from Bin/Release
		tests.reportStatus(shelljs.cp('-Rf', path.join(DPO.PROJECT_DIR,'Bin', 'Release',DPO.PROJECT_NAME +'.dll'), DPO.SNAPSHOT_DIR));

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

function addWWWForMobileSpec(projDir, projName) {
	//parse elementtree
	var content = fs.readFileSync(path.join(projDir, projName), 'utf-8');
	if (content) {
		content = content.substring(content.indexOf('<'));
	}
	var elementTree = new et.ElementTree(et.XML(content));

	//get all files in www dir and add them to element tree
	var wwwList = [], baseDir = path.join(shelljs.pwd(), projDir, 'www');
	wwwList = build.getAllFiles(baseDir, wwwList, baseDir+path.sep);
	wwwList.forEach(function(fileName) {
		//Set leading www folder for relative path
        fileName= path.join('www', fileName);
		//if file is not already in xml then add it
		if (!fileExists(elementTree, fileName))
			addFile(elementTree, fileName);
	});

	//write the element tree to the xml file
	fs.writeFileSync(path.join(projDir, projName), elementTree.write({indent:4}), 'utf-8');
}

function addFile(tree, relPath) {
	var item = new et.Element('ItemGroup');
	var newElem = new et.Element('Content');
	newElem.attrib.Include = relPath;
	item.append(newElem);

	tree.getroot().append(item);
}

function fileExists(tree, relPath) {
	var exists = false;

	tree.findall('ItemGroup').forEach(function(group) {
		var filesToRemove = group.findall('Content').filter(function(item) {
			if(!item.attrib.Include)
				return false;

			else
				return item.attrib.Include == relPath;
		});

		if (filesToRemove.length > 0)
			exists = true;
	});

	return exists;
}
