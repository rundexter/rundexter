var fs          = require('fs')
  , path        = require('path')
  , spawn       = require('child_process').spawn
  , account     = require('./account')
  , q           = require('q')
;

function runCmd(cmd, args) {
    var deferred = q.defer()
      , proc = spawn(
        cmd,
        args,
        { stdio: [process.stdin, process.stdout, process.stderr, 'pipe'] }
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
                console.log('adding remote');
                return runCmd('git', ['-C', dir, 'remote','add',name,uri]);
            });
    },
    initialCommit: function(dir) {
        dir = path.resolve(dir);
        console.log(dir+'/.git');
        return runCmd('git', ['-C', dir, 'add', '-A', dir])
           .then(runCmd.bind(null, 'git', ['-C', dir, 'commit', '-a','-m','Initial commit']))
           .catch(function() {
             console.error('Error on initial commit');
           });
    },
    pushToDexter: function(dir) {
        var repo
            , remote
            ;
        return findGitRoot(dir)
            .then(function(gitRoot) {
                var proc = spawn(
                    'git',
                    ['push', 'dexter', 'master'],
                    { stdio: [process.stdin, process.stdout, process.stderr, 'pipe'] }
                );
            });
    }
};
