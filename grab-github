#!/usr/bin/ruby

require 'cgi'
require 'dalli'
require 'json'
require 'fileutils'
require 'uri'

args = {}
ARGV.each do |arg|
  k, v = arg.split('=')
  args[k] = v or ""
end

skip_clone    = args["--skip-clone"]
skip_pull     = args["--skip-pull"]
skip_populate = args["--skip-populate"] # Populate the memcached/couchbase server.

orgs = ['couchbase', 'couchbaselabs', 'blevesearch']
orgs = (args['--orgs'] or "").split(',') if args.include?('--orgs')

# ------------------------------------------------------

# Clone and pull repositories.

orgs.each do |org|
  # TODO: What about private repos?

  p "curl https://api.github.com/orgs/#{org}/repos"
  repos = %x"curl https://api.github.com/orgs/#{org}/repos"

  j = JSON.parse(repos)

  j.each do |repo|
    url = repo['clone_url']  # Ex: "https://github.com/couchbase/sigar.git".
    dir = "./data/github/#{CGI.escape(url)}"
    if not File.exists?(dir + '/.git') and not skip_clone
      p "git clone #{url} #{dir}"
      %x"git clone #{url} #{dir}"
    end
    if File.exists?(dir + '/.git') and not skip_pull
      p "cd #{dir} && git pull"
      %x"cd #{dir} && git pull"
    end
  end
end

# For each repository, grab the logs.

Dir.glob("./data/github/*") do |dir|
  url = CGI.unescape(File.basename(dir)) # Ex: "https://github.com/couchbase/sigar.git".
  p url

  url_base = url.sub(/\.git$/, '')       # Ex: "https://github.com/couchbase/sigar".
  p url_base

  p "cd #{dir} && git log"
  lines = %x"cd #{dir} && git log --date-order --format=fuller --parents"

  # The otp repo has some non-UTF-8 chars in it that would otherwise lead
  # to error of "`split': invalid byte sequence in UTF-8 (ArgumentError)".
  commits = lines.force_encoding("iso-8859-1").split(/^commit /)
  commits.each do |commit|
    p commit
    unless commit.empty?
      doc = {}
      hdr, msg = commit.split(/\n\n/)
      fields = hdr.split(/\n/)
      fields.each do |field_val|
        field, val = field_val.split(': ')
        if val
          doc[field] = val.strip
        else
          commitId, parentId = field.split(' ')
          doc["CommitId"] = commitId
          doc["ParentId"] = parentId
        end
      end
      doc["Message"] = msg.strip
      p doc
    end
  end
end
