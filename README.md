intrapop - quick hacks & scripts to populate a couchbase NoSQL
database with JSON data from some "intranet" systems.

Some of these intranet systems are actually out on the internet.

TODO list of possible systems to integrate...

* git commit messages
* gerrit
* jira
* techdocs
* blogs & CMS
* confluence (wiki)
* dropbox
* yammer
* couchbase's twitter/social-media streams
* CRM / support tickets
* email groups
* beer information
* whatever we can get our hands on

= Related links

To search couchbase codebases via opengrok, try: http://src.couchbase.org/source/

= Some ops hints

Need ports 8091 and 9090 opened...

  iptables -I INPUT 1 -p tcp --dport 8091 -j ACCEPT
  iptables -I INPUT 1 -p tcp --dport 9090 -j ACCEPT

And, at least ruby 1.9.3...

  From http://tecadmin.net/install-ruby-1-9-3-or-multiple-ruby-verson-on-centos-6-3-using-rvm/

  rvm use 1.9.3 --default

  gem install dalli
  gem install octokit
  gem install nokogiri

To get leveldb...

    git clone https://github.com/google/leveldb.git
    cd leveldb/
    make
    cp --preserve=links libleveldb.* /usr/local/lib
    cp -r include/leveldb /usr/local/include/
    ldconfig

Before staring cbft, use...

    export LD_LIBRARY_PATH=/usr/local/lib

When creating a bleve index in cbft, you can use a store that looks like...

    "store": {
      "kvStoreName": "leveldb"
    }

To start cbft...

  cd ~/go/src/github.com/couchbaselabs/cbft

  ./cbft -addr=10.5.3.31:9090 -cfgConnect=couchbase:http://cfg@localhost:8091 -server=http://localhost:8091
