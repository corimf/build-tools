#!/usr/bin/env perl

use strict;
use warnings;
use lib 'tools/perllib';
use HTML::TreeBuilder;
use HTML::Element;
use File::Copy::Recursive qw(dircopy);
use File::Find::Rule;
use File::Copy;
use File::Path;

my $numArgs = $#ARGV + 1;
if ($numArgs != 1)
{
    print "Usage: mobilespec-for-worklight.pl <cordova version>";
    exit;
}

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
my $destination = "mobilespec-for-worklight";
dircopy($source, $destination);



# parse main html page and edit
my $root = HTML::TreeBuilder->new;
$root->parse_file("$destination/index.html") || die $!;

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
open(OUT, ">$destination/index.html") || die $!;
print OUT $root->as_HTML;
close(OUT);
$root->delete;



if ($ARGV[0] >= 3.0)
{
    # change path for cordova.js in cordova-incl.js
    my $file = "$destination/cordova-incl.js";
    open(IN, $file) || die $!;
    my @lines = <IN>;
    close IN;
    open(OUT, ">$destination/cordova-incl.js") || die $!;
    foreach my $line (@lines)
    {
        $line =~ s/cordova.js/worklight\/cordova.js/g;
        print OUT $line;
    }
    close OUT;
}
else
{
    # add wlclient/js/cordova.js path in child html pages
    my @files = File::Find::Rule->file()
                                ->name("*.html")
                                ->in($destination);

    foreach my $file (@files)
    {
        if (!($file eq "$destination/index.html"))
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
    move("$destination/index.html", "$destination/Mobilespec.html");
}

rmtree([ "$destination/createmobilespec" ]);
