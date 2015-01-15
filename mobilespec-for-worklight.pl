#!/usr/bin/env perl

use strict;
use warnings;
use lib 'build-tools/perllib';
use HTML::TreeBuilder;
use HTML::Element;
use File::Copy::Recursive qw(dircopy fcopy);
use File::Find::Rule;
use File::Copy;
use File::Path;
use File::Spec::Functions;
use JSON;

# takes in argument of file to be changed
sub changeCordovajsPath {
    my $file = $_[0];
    open(IN, $file) || die $!;
    my @lines = <IN>;
    close IN;
    open(OUT, ">$_[0]") || die $!;
    foreach my $line (@lines)
    {
        $line =~ s/cordova.js/worklight\/cordova.js/g;
        print OUT $line;
    }
    close OUT;
}

# prepend the necessary cordova.define()...
# takes in argument of file to be changed and module id
sub prependDefine {
    open (IN, $_[0]) || die $!;
    my @lines = <IN>;
    close IN;
    open(OUT, ">$_[0]") || die $!;
    print OUT "cordova.define(\"$_[1]\", function(require, exports, module) {";
    foreach my $line (@lines)
    {
        print OUT $line;
    }
    print OUT "});";
    close OUT;
}


my $numArgs = $#ARGV + 1;
if ($numArgs != 1)
{
    print "Usage: mobilespec-for-worklight.pl <cordova version>";
    exit;
}

my $destination = "mobilespec-for-worklight";

# old mobilespec
if ($ARGV[0] < 3.6)
{
    my $mainjs;
    if ($ARGV[0] < 3.0)
    {
        $mainjs = "Mobilespec.js";
    }
    else
    {
        $mainjs = "main.js";
    }


    # copy mobilespec www files into new directory
    my $source = "cordova-mobile-spec";
    dircopy($source, $destination);



    # parse main html page and edit
    my $root = HTML::TreeBuilder->new;
    $root->parse_file(catfile($destination, 'index.html')) || die $!;

    # delete cordova-incl script tag
    if ($ARGV[0] >= 3.0)
    {
        my $script_tag = $root->look_down('_tag', 'script', 'src', 'cordova-incl.js');
        $script_tag->delete;
    }

    # add necessary script tags from WL
    my $html_body = $root->find_by_tag_name('body');
    my $script1 = HTML::Element->new('script', 'src' => 'js/initOptions.js');
    my $script2 = HTML::Element->new('script', 'src' => "js/$mainjs");
    my $script3 = HTML::Element->new('script', 'src' => 'js/messages.js');
    $html_body->push_content($script1);
    $html_body->push_content($script2);
    $html_body->push_content($script3);

    # output changes to file
    open(OUT, ">${\catfile($destination, 'index.html')}") || die $!;
    print OUT $root->as_HTML;
    close(OUT);
    $root->delete;



    if ($ARGV[0] >= 3.0)
    {
        changeCordovajsPath(catfile($destination, 'cordova-incl.js'));
    }
    else
    {
        # add wlclient/js/cordova.js path in child html pages
        my @files = File::Find::Rule->file()
                                    ->name("*.html")
                                    ->in($destination);

        foreach my $file (@files)
        {
            if (!($file eq catfile($destination, 'index.html')))
            {
                open (IN, $file) || die $!;
                my @lines = <IN>;
                close IN;
                open(OUT, ">$file") || die $!;
                foreach my $line (@lines)
                {
                    print OUT $line;
                    my $temp = $line;
                    $line =~ s/cordova.js/wlclient\/js\/cordova.js/g;
                    if (!($temp eq $line))
                    {
                        print OUT $line;
                    }
                }
                close OUT;
            }
        }

        #rename the index.html file to Mobilespec.html
        move(catfile($destination, 'index.html'), catfile($destination, 'Mobilespec.html'));
    }

    rmtree([ catfile($destination, 'createmobilespec') ]);
}



# new plugin test framework
else
{
    my @plugins = ("battery-status", "camera", "contacts", "device", "device-motion", "device-orientation", "dialogs", "file", "file-transfer", "geolocation", "globalization", "inappbrowser", "media", "media-capture", "network-information", "splashscreen", "statusbar", "vibration");
    my @pluginInfo = ();

    # copy mobilespec www files
    dircopy(catfile('cordova-mobile-spec', 'www'), catfile($destination, 'common'));

    # copy plugin-test-framework assets and plugin-inappbrowser/tests/resources
    dircopy(catfile('cordova-plugin-test-framework', 'www', 'assets'), catfile($destination, 'common', 'cdvtests')) || die $!;
    dircopy(catfile('cordova-plugin-inappbrowser', 'tests', 'resources'), catfile($destination, 'common', 'cdvtests', 'iab-resources')) || die $!;

    # change path for cordova.js in cordova-incl.js and cdvtests/index.html
    changeCordovajsPath(catfile($destination, 'common', 'cordova-incl.js'));
    changeCordovajsPath(catfile($destination, 'common', 'cdvtests', 'index.html'));


    # parse main html page and edit
    my $root = HTML::TreeBuilder->new;
    $root->parse_file(catfile($destination, 'common', 'index.html')) || die $!;

    # delete cordova-incl script tag
    my $script_tag = $root->look_down('_tag', 'script', 'src', 'cordova-incl.js');
    $script_tag->delete;

    # add necessary script tags from WL
    my $html_body = $root->find_by_tag_name('body');
    my $script1 = HTML::Element->new('script', 'src' => 'js/initOptions.js');
    my $script2 = HTML::Element->new('script', 'src' => "js/main.js");
    my $script3 = HTML::Element->new('script', 'src' => 'js/messages.js');
    $html_body->push_content($script1);
    $html_body->push_content($script2);
    $html_body->push_content($script3);

    # output changes to file
    open(OUT, ">${\catfile($destination, 'common', 'index.html')}") || die $!;
    print OUT $root->as_HTML;
    close(OUT);
    $root->delete;


    # adding test plugins to worklight/plugins and worklight/cordova_plugins.js
    foreach my $plugin (@plugins)
    {
        my $src = catfile("cordova-plugin-$plugin", 'tests', 'tests.js');
        my $dest = catfile($destination, 'worklight', 'plugins', "org.apache.cordova.$plugin.tests", 'tests.js');
        my $id = "org.apache.cordova.$plugin.tests.tests";
        if (-e $src)
        {
            # copy the tests.js file
            fcopy($src, $dest) || die $!;
            
            # prepend the necessary cordova.define()...
            prependDefine($dest, $id);

            # create json object for registering in cordova_plugins.js
            my %pluginInfo = ('file'=>"plugins/org.apache.cordova.$plugin.tests/tests.js", 'id'=>$id);
            my $jsonObj = encode_json \%pluginInfo;
            push(@pluginInfo, $jsonObj);
        }
    }

    # add in plugin test framework
    my @files = ("jasmine_helpers", "main", "medic", "tests");
    foreach my $file (@files)
    {
        my $src = catfile('cordova-plugin-test-framework', 'www', "$file.js");
        my $dest = catfile($destination, 'worklight', 'plugins', 'org.apache.cordova.test-framework', 'www', "$file.js");
        my $id;

        fcopy($src, $dest) || die $!;

        if ($file eq "tests")
        {
            $id = "org.apache.cordova.test-framework.cdv$file";
        }
        else
        {
            $id = "org.apache.cordova.test-framework.$file";
        }

        # prepend the necessary cordova.define()...
        prependDefine($dest, $id);

        # create json object for registering in cordova_plugins.js
        my %pluginInfo = ('file'=>"plugins/org.apache.cordova.test-framework/www/$file.js", 'id'=>$id);
        my $jsonObj = encode_json \%pluginInfo;
        push(@pluginInfo, $jsonObj);
    }

    # write out plugin info to cordova_plugins.js
    open(OUT, ">${\catfile($destination, 'worklight', 'cordova_plugins.js')}") || die $!;
    foreach my $obj (@pluginInfo)
    {
        print OUT "$obj,\n";
    }
    close OUT;
}
