var git         = require('nodegit')
  , fs          = require('fs')
  , path        = require('path')
  , Promise     = require('promise')
  , configtools = require('./config')
  , child_process = require('child_process')
  , pexists = Promise.denodeify(fs.exists)
;


function callIfFunction(fn, params) {
    if(fn instanceof Function) {
        if(!Array.isArray(params)) {
            params = [params];
        }
        fn.apply(null, params);
    }
}
function pVal() {
    var rawargs = arguments
        , myargs = Object.keys(arguments).map(function(k) {
            return rawargs[k];
        })
        ;
    return new Promise(function(success) {
        if(myargs.length === 1) {
            success(myargs[0]);
        } else {
            success(myargs);
        }
    });
}
function findGitRoot(dir, callback) {
    var curr = path.resolve(dir)
        , test = path.resolve(curr, './.git')
        , next = path.resolve(curr, '..')
        ;
    if(curr === '/') {
        callIfFunction(callback, null);
        return null;
    }
    return pexists(test).then(function(isGit) {
        //denodify works oddly somewhere.  This gets the rejection
        return findGitRoot(next, callback);
    }, function(err) {
        //...and this gets the success (err=true).  Weird.
        callIfFunction(callback, curr);;
        return curr;
    });
}
module.exports = {
    getConfig: function(callback) {
        var config
            , name
            , email
            ;
        return git.Config.openDefault()
            .then(function(cfg) {
                config = cfg;
                return config.getString('user.email');
            })
            .then(function(e) {
                email = e;
                return config.getString('user.name');
            })
            .then(function(n) {
                name = n;
                var data = { email: email, name: name };
                callIfFunction(callback, data);
                return pVal(data);
            })
            ;
    },
    //Can be used either as a promise or as a callback
    getRepo: function(dir, callback) {
        dir = path.resolve(dir);
        return git.Repository.open(dir)
            .then(function(repo) {
                callIfFunction(callback, repo);
                return pVal(repo);
            }, function() {
                callIfFunction(callback, null);
                return pVal(null);
            });
    },
    getOrCreateRepo: function(dir, callback) {
        dir = path.resolve(dir);
        return this.getRepo(dir)
            .then(function(repo) {
                if(repo) {
                    return pVal(null);
                }
                return git.Repository.init(path.resolve(dir, '.git'), 0)
                    .then(function(repo) {
                        console.log('Created repo in', dir);
                        callIfFunction(callback, repo);
                        return pVal(repo);
                    }, function(err) {
                        console.log('Failed creating repo:', err);
                        callIfFunction(callback, null);
                        return pVal(null);
                    });
            });
    },
    getRemote: function(dir, name, callback) {
        dir = path.resolve(dir);
        return this.getRepo(dir)
            .then(function(repo) {
                if(!repo) {
                    callIfFunction(callback, [null, null]);
                    return pVal(null, null);
                }
                return repo.getRemote(name)
                    .then(function(remote) {
                        callIfFunction(callback, [remote, repo]);
                        return pVal(remote, repo);
                    }, function() {
                        callIfFunction(callback, [null, repo]);
                        return pVal(null, repo);
                    });
            });
    },
    getOrCreateRemote: function(dir, name, uri, callback) {
        dir = path.resolve(dir);
        return this.getRemote(dir, name)
            .then(function(results) {
                var remote = results[0]
                    , repo = results[1];
                if(remote) {
                    callIfFunction(callback, [remote, repo]);
                    return pVal(remote, repo);
                }
                if(repo) {
                    remote = git.Remote.create(repo, name, uri);
                    callIfFunction(callback, [remote, repo]);
                    return pVal(remote, repo);
                }
                callIfFunction(callback, [null, null]);
                return pVal(null, null);
            });
    },
    initialCommit: function(dir) {
        //http://librelist.com/browser//libgit2/2011/2/19/initing-a-repository-adding-files-to-the-index-and-committing/#d94ce8df18ff0202ce904180286a4a85
        dir = path.resolve(dir);
        var repo
            , userData
            , index
            , objectID
            ;
        return this.getConfig()
            .then(function(ud) {
                userData = ud;
                return findGitRoot(dir);
            })
            .then(function(gitRoot) {
                if(!gitRoot) {
                    console.log('Not in git!');
                } else {
                    return git.Repository.open(gitRoot);
                }
            })
            //Get the repo...we WANT failures here, so don't use our wrapper
            .then(function(r) {
                repo = r;
                return repo.openIndex();
            })
            //Load up the repo's index
            .then(function(indexResult) {
                index = indexResult;
                return index.read(1); //Make sure we have everything in the file system
            })
            //Push all matching files in
            .then(function() {
                return index.addAll();
            })
            //Write our changes to the index and get the new oID generated
            .then(function() {
                index.entries().forEach(function(entry) {
                    console.log('Added', entry.path);
                });
                index.write();
                return index.writeTree();
            })
            //Find our HEAD
            .then(function(oid) {
                objectID = oid; //We need this for the commit
                return git.Reference.nameToId(repo, "HEAD");
            })
            //...and the commit it's at
            .then(function(head) {
                return repo.getCommit(head);
            }, function(err) {
                //1st commit
                return null;
            })
            //Finally, create a new commit with the current HEAD as the parent
            .then(function(parent) {
                var now = new Date()
                    , author = git.Signature.now(userData.name, userData.email)
                    , committer = git.Signature.now('Dexter CLI', 'cli@rundexter.com')
                    , parents = (parent) ? [parent] : []
                    ;
                return repo.createCommit("HEAD", author, committer, "Initial clone of the Dexter module skeleton", objectID, parents);
            })
            .then(function(commit) {
                console.log('Created initial commit', commit);
            }, function(err) {
                console.log('Failed creating commit:', err);
            })
            .catch(function(err) {
                console.error('Failed adding files:', err);
            })
            ;

    },
    pushToDexter: function(dir) {
        var repo
            , remote
            ;
        return findGitRoot(dir)
            .then(function(gitRoot) {
                var proc = child_process.spawn(
                    'git',
                    ['push', 'dexter', 'master'],
                    { stdio: [process.stdin, process.stdout, process.stderr, 'pipe'] }
                );
            });
    },
    pushToDexterWithLib: function(dir) {
        var repo
            , remote
            ;
        return findGitRoot(dir)
            .then(function(gitRoot) {
                if(!gitRoot) {
                    console.log('Not in git!');
                } else {
                    return git.Repository.open(gitRoot);
                }
            }, function(err) {
                console.log('Unrooted:', err);
            })
            .then(function(repoResult) {
                repo = repoResult;
                return git.Remote.lookup(repo, 'dexter');
            }, function(err) {
                console.error('Could not open repo:', err);
            })
            .then(function(remoteResult) {
                remote = remoteResult;

                remote.setCallbacks({
                    credentials: function(url, user) {
                        return git.Cred.sshKeyFromAgent(user);
                    }
                });
                return remote.connect(git.Enums.DIRECTION.PUSH);
            }, function(err) {
                console.error('Could not open remote:', err);
            })
            .then(function() {
                return remote.push(
                    ["refs/heads/master:refs/heads/master"],
                    null,
                    repo.defaultSignature(),
                    "Push to master"
                );
            }, function(err) {
                console.error('Could not connect to remote:', err);
            })
            .then(function(pushNumber) {
                return pushNumber;
            }, function(err) {
                console.error('Push failed:', err);
            });
    }
};
