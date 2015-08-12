build-tools
===========

# Status

We have two sets of scripts. The bash scripts are the original ones and have
been run on multiple versions. But they only work on OSX/Linux. The JS scripts
are new and we are in the process of migrating to them.

When building a distribution for downstream consumption:

# Bash Scripts Execution

The examples below will be for the case of "3.4.0esr".

Note: [all] works on all releases

Note: [creation] versus [update] indicates which steps are applicable for
initial creation of an esr branch, versus making an update to an esr branch.
If neither of these notations are present, then the step applies to all
circumstances.

1. Create your own corimf-settings from the sample provided.
   Determine if cordova-lib should be in OTHER_REPOS (>=3.4.x)
1. [creation] Edit config.json to add the versions of each plugin and tool for
   this new esr release.
1. [all] Optional: run corimf-setup for initial setup a new workspace with new
   repos.
1. Run corimf-cron to verify that the cron job syncing git-wip-us.a.o with
   github.com/apache is running well.
1. Run corimf-catchup-apache to get your local repos and corimf up-to-date
   with the content and tags from the Apache repos. Run it with
   BASE_BRANCH=master if you are preparing to create a new ESR branch, or
   run it with BASE_BRANCH=3.4.x if you already have your 3.4.0esr branch.
   Though you may think this needs to get run only when creating a new esr
   branch, it also comes in handy when you want to cherry-pick from master.
1. [update] Run corimf-catchup to get your local repos up-to-date from corimf.
   It will checkout the desired branch for all the repos. This is important
   since more than one person is contributing fixes.
1. [creation] Run corimf-newver to create a new ESR branch from an existing
   Apache branch and put it on corimf. Set BASE_BRANCH=3.4.x before running.
1. [update] Make your changes to the ESR branch, commit them and push them to
   corimf.
1. [all] [update] Run corimf-check to sanity check everything. This needs to be
   run in the git repo that you updated ( for example 'cordova-ios').
1. [all] [update] Run corimf-tag to create a new "u" tag on the branch.
   This will also check out each repo on the desired branch. It will create
   and push only the tags that don't already exist.
1. [all] For versions 3.1.0esr and above, run corimf-show-plugin-versions to
   verify that the present versions of the plugins are what is desired (match
   what the platforms were tested against by the community) (also compare to
   build-tools/config.json)
1. Run corimf-snapshot to create a zip of each platform source.
   - Make sure the file IBM-RELEASE-NOTES.txt is populated and shows the
     files that have changed since the previous drop.
     NOTE: IBM-MODIFICATIONS.txt file does not exist until someone creates it
     at the first update to the repo
   - Then upload this content to GSA (in the 'src' dir)
1. For versions before 3.4.0, run the platform build scripts to build a snapshot
   with object code.
   - corimf-build-android.js (preferred) (see below)
   - corimf-build-android (deprecated)
1. For all versions, create a new HelloWorld project and mobile-spec project
   and upload to GSA in /projects/c/cordova/cordova-ESR-runtime-samples:
   - corimf-build-android.js

# JS Scripts Execution

## Creating ESR helloworld and mobilespec runtime samples

For the Cordova team, these scripts can be used to create runtime sample
projects to post to GSA for other teams to use when debugging issues.

For the integration team and others, these scripts can be used to create both a
standalone Cordova application to be used when isolating issues to/from Cordova
and a Cordova testing framework app (mobilespec) to quickly verify if there is
an issue in Cordova. As an alternative, you can simply download the posted
runtime sample projects on [GSA](https://rtpgsa.ibm.com/projects/c/cordova/cordova-ESR-runtime-samples/).

1. Create your own corimf-settings.js from the sample provided.
   - Set PROJECT_ONLY and MOBILESPEC to true if you only want to
   get the runtime sample projects.
   - Set BRANCH as the ESR branch you want to build from and
   NEW_TAG as the latest tag from that ESR branch, which can be
   found [here](https://w3-connections.ibm.com/wikis/home?lang=en-us#!/wiki/W9ae505f4bacb_461a_acbb_680b6ed21a7f/page/Extended%20Service%20Release%20%28ESR%29).
   - Set REMOTE_ORIGIN and BASE_BRANCH according to their description
   - If only building esr runtime projects, no other values need to
   be changed unless there are special circumstances you are trying
   to recreate, like skipping a plugin
1. Ensure you have all the repos on your machine at the same level
   as the build-tools directory and checked out at the latest tag
   that was specified in the settings file
1. Ensure you have the appropriate environment set up for whatever
   platform you will be building (Xcode, Android SDK, etc)
1. Run "node build-tools/corimf-build-PLATFORM.js"
   (i.e. node build-tools/corimf-build-ios.js). You will be prompted
   to confirm that all the settings are correct.
1. Once the script finishes running you will have a directory for the
   helloworld project (example-platform-tag) and the mobilespec project
   (mobilespec-platform-tag). Within those, you can use the command
   './cordova/run' to build and run the projects. Edit the www files
   as needed to debug an issue.

# Creating mobilespec for Worklight

To get mobilespec running inside a Worklight project, follow these steps:

## Old Mobilespec (< 3.6)
1. Ensure you have the cordova-mobile-spec repo cloned and checked out at the version you need.
1. Run "perl build-tools/mobilespec-for-worklight.pl <cordova version>", i.e. perl build-tools/mobilespec-for-worklight.pl 3.4
1. A directory 'mobilespec-for-worklight' will be created. Copy all of the files from that directory into the 'common' directory in your Worklight project. Allow the necessary files to be overwritten.
1. Copy the whitelist from mobilespec's config.xml to the config.xml in your Worklight project located in yourProject -> apps -> yourProject -> whatever platform -> native
1. For Android platform, copy the following permissions into the AndroidManifest.xml:

        <uses-permission android:name="android.permission.READ_CONTACTS" />
        <uses-permission android:name="android.permission.WRITE_CONTACTS" />
        <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
        <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
        <uses-permission android:name="android.permission.RECORD_AUDIO" />
        <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
        <uses-permission android:name="android.permission.READ_PHONE_STATE" />
        <uses-permission android:name="android.permission.RECORD_VIDEO" />
        <uses-permission android:name="android.permission.VIBRATE" />

## New Plugin Test Framework (3.6 >=)
1. Ensure you have cordova-mobile-spec, cordova-plugin-test-framework, and the plugin repos checked out at the version you need.
1. Run "perl build-tools/mobilespec-for-worklight.pl <cordova version>", i.e. perl build-tools/mobilespec-for-worklight.pl 3.6
1. A directory 'mobilespec-for-worklight' will be created.
1. Copy all of the files from mobilespec-for-worklight/common into the 'common' directory in your Worklight project. Allow the necessary files to be overwritten.
1. Copy all of the directories in mobilespec-for-worklight/worklight/plugins into the www/worklight/plugins directory in your native Worklight project. NOTE: You may need to change this directory to read-write in order to do this
1. Copy the JSON objects in mobilespec-for-worklight/worklight/cordova_plugins.js into the www/worklight/cordova_plugins.js file (in your native Worklight project) at the end of the plugins list that is already present. NOTE: You may need to change this file to read-write in order to do this
1. For Android platform, copy the following permissions into the AndroidManifest.xml:

        <uses-permission android:name="android.permission.READ_CONTACTS" />
        <uses-permission android:name="android.permission.WRITE_CONTACTS" />
        <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
        <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
        <uses-permission android:name="android.permission.RECORD_AUDIO" />
        <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
        <uses-permission android:name="android.permission.READ_PHONE_STATE" />
        <uses-permission android:name="android.permission.RECORD_VIDEO" />
        <uses-permission android:name="android.permission.VIBRATE" />
        
# Making Cordova Zip (4.1.2Cesr)
## Setup corimf-settings.js
1. Open corimf-settings-js.sample in a text editor.
1. Set the value of 'BRANCH' to '4.1.2Cesr'
1. Set the value of 'NEW_TAG' and 'PREV_TAG' to the latest two tags in WL7100*
1. Set the value of 'BASE_BRANCH' to '4.1.x'
1. Make sure 'PLUGIN_COUNT = 19' and the three lines below it are uncommented, while the five lines above it are commented out.
1. In 'PLATFORM_REPOS', delete all values except for 'cordova-android' and 'cordova-ios'
1. In 'OTHER_REPOS', delete all values except for 'cordova-cli'
1. Go to File in the Menu Bar and click Save As; filename is 'corimf-settings.js' and make sure to save as a JavaScript file.

## Making zip
1. In the cordova folder with all the repos, run the following scripts:
    1. node build-tools/corimf-catchup-corimf.js
    2. node build-tools/install-production.js
1. Make a zip folder called cordova.zip
1. Add the following repos to the zip: cordova-android, cordova-ios, cordova-cli, all of the plugins, ios-deploy, and ios-sim
