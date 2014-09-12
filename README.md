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
1. [update] Run corimf-catchup to get your local repos up-to-date from corimf,
   if more than one person is contributing to a single fix.
1. [creation] Run corimf-newver to create a new ESR branch from an existing
   Apache branch and put it on corimf. Set BASE_BRANCH=3.4.x before running.
1. [update] Make your changes to the ESR branch, commit them and push them to
   corimf.
1. [all] [update] Run corimf-check to sanity check everything. This needs to be
   run in the git repo that you updated ( for example 'cordova-ios').
1. [all] Run corimf-show-plugin-versions to verify that the present versions of
   the plugins are what is desired (match what the platforms were tested
   against by the community)
1. [all] [update] Run corimf-tag to create a new "u" tag on the branch
1. Run corimf-snapshot to create a zip of each platform source.
   - Make sure the file IBM-RELEASE-NOTES.txt is populated and shows the
     files that have changed since the previous drop. NOTE: IBM-MODIFICATIONS.txt
     file does not exist until someone creates it at the first update to the repo
1. For versions before 3.4.0, run the platform build scripts
   - corimf-build-android

# JS Scripts Execution

TBD
