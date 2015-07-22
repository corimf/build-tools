var settings = require('./corimf-settings.js'),
    tests = require('./corimf-tests');

try {
    fs = require('fs'),
    shelljs = require('shelljs'),
    path = require('path');
    colors = require('colors');
} catch (e) {
    console.error('Missing module. Please run "npm install" from this directory:\n\t' +
        path.dirname(__dirname));
    process.exit(2);
}
    
console.log('BRANCH = ' + settings.BRANCH);
    
var allRepos = (settings.PLATFORM_REPOS).concat(settings.OTHER_REPOS);

tests.checkAboveGitRepo();
installProduction(allRepos, settings.BRANCH);

function installProduction(repos, checkoutBranch) {
    repos.forEach(function(repo) {
        if (shelljs.test('-d', repo)) {
            console.log(repo + ':');
            shelljs.cd(repo);
            console.log('npm install --production');
            tests.reportStatus(shelljs.exec('npm install --production', {
                    silent : false
                }).code == 0);
            shelljs.cd('..');
        }
    });
}