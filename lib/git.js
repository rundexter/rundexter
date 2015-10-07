var fs          = require('fs')
  , path        = require('path')
  , spawn       = require('child_process').spawn
  , account     = require('./account')
  , q           = require('q')
;

function runCmd(cmd, args, quiet) {
    quiet = quiet || false;
    var deferred = q.defer()
      , proc = spawn(
        cmd,
        args,
        { stdio: quiet ? [process.stdin, 'pipe'] : [process.stdin, process.stdout, process.stderr, 'pipe'] }
    );

    proc.on('close', function(code) {
        return code
           ? deferred.reject(code)
           : deferred.resolve();
    });

    return deferred.promise;
}

function doesExist(path) {
  try {
      fs.statSync(path);
      return true;
  } catch(err) {
      return !(err && err.code === 'ENOENT');
  }
}

function callIfFunction(fn, params) {
    if(fn instanceof Function) {
        if(!Array.isArray(params)) {
            params = [params];
        }
        fn.apply(null, params);
    }
}
function findGitRoot(dir) {
    var curr = path.resolve(dir)
      , test = path.resolve(curr, './.git')
      , next = path.resolve(curr, '..')
    ;

    if(curr === '/') {
        return q.when(null);
    }

    if(doesExist(test))
        return q.when(curr);

    return q.when(findGitRoot(next));
}

module.exports = {
    getConfig: function(callback) {
        return account.me()
           .then(function(result) {
              return {
                   email: result.data.email
                   , name: result.data.name
                   , username: result.data.username
              };
           })
        ;
    },
    getRepo: function(dir) {
       return findGitRoot(dir || '.');
    },
    getOrCreateRepo: function(dir, callback) {
        dir = path.resolve(dir);
        return runCmd('git', ['init', dir]);
    },
    getRemote: function(dir, name, callback) {
        dir = path.resolve(dir);
        return runCmd('git', ['-C', dir, 'config','--get','remote.'+name+'.url']);
    },
    getOrCreateRemote: function(dir, name, uri, callback) {
        dir = path.resolve(dir);
        return this.getRemote(dir, name)
            .fail(function() {
                console.log('Adding remote');
                return runCmd('git', ['-C', dir, 'remote','add',name,uri]);
            });
    },
    initialCommit: function(dir) {
        dir = path.resolve(dir);
        return runCmd('git', ['-C', dir, 'add', '-A', dir])
           .then(runCmd.bind(null, 'git', ['-C', dir, 'commit', '-a','-m','Initial commit']))
           .catch(function() {
             console.error('Error on initial commit');
           });
    },
    checkIfClean: function(dir) {
        var gitRoot;
        //c/o http://stackoverflow.com/a/3879077
        return this.getRepo(dir)
            //Update the index
            .then(function(root) {
                gitRoot = root;
                return runCmd('git', ['update-index', '-q', '--ignore-submodules', '--refresh', gitRoot], true);
            })
            //Fail on unstaged changes
            .then(function() {
                return runCmd('git', ['diff-files', '--quiet', '--ignore-submodules', '--', gitRoot], true);
            })
            //Fail on uncomitted changes
            .then(function() {
                return runCmd('git', ['diff-index', '--cached', '--quiet', 'HEAD', '--ignore-submodules', '--', gitRoot], true);
            })
            //If we got this far, success
            .then(function() {
                return true;
            })
            //Otherwise, there's stuff waiting
            .catch(function(e) {
                return false;
            })
        ;
    },
    pushToDexter: function(dir) {
        var self = this
            , gitRoot;
        return findGitRoot(dir)
            .then(function(root) {
                gitRoot = root;
                return self.checkIfClean(gitRoot);
            })
            .then(function(isClean) {
                if(!isClean) {
                    console.error('!!! Warning - it looks like you have uncommitted changes.  Did you mean to git commit first?');
                }
                var proc = spawn(
                    'git',
                    ['push', 'dexter', 'master'],
                    { stdio: [process.stdin, process.stdout, process.stderr, 'pipe'] }
                );
            });
    }
};
