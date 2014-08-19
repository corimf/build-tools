/* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements. See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership. The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License. You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied. See the License for the
* specific language governing permissions and limitations
* under the License.
*
********************************************************************************
* This is a script to get the repo version from the config.json file based on
* passed in parameters. First param should be the esr branch to get the 
* version from (i.e. "3.1.0esr"). The second param should be the repo you want
* (i.e. "cordova-plugin-file").
*/
var fs = require('fs');

var branch = process.argv[2];
var repo = process.argv[3];
var file = 'build-tools/config.json';

fs.readFile(file, function (err, data) {
	if (err) {
		console.log('Error ' + err);
		return;
	}

	data = JSON.parse(data);

	console.log(data[branch][repo]);
})
