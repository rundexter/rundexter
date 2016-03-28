var q = require('q')
    , utils = require('./utils')
    , configtools = require('./config')
    , account = require('./account')
    , fs = require('fs')
    , path = require('path')
    , child_process = require('child_process')
    , NAME_STATUS = {
        AVAILABLE: 0,
        OWNED_BY_USER: 1,
        UNAVAILABLE: 100
    }
    ;
function cleanOutput(str) {
    return str.trim().replace(/[\r\n\t]/g, ' ');
}
module.exports = {
    NAME_STATUS: NAME_STATUS
    , isDexterPackage: function(dir) {
        return q.allSettled([
            q.nfcall(fs.exists, this.getMetaFilename(dir))
            , q.nfcall(fs.exists, this.getPackageFilename(dir))
        ]).then(function(results) {
            var valid = true;
            results.forEach(function(result) {
                //nfcall is bad with fs functions.  Look at the reason.
                if(result.reason === undefined) {
                    valid = false;
                }
            });
            return valid;
        });
    }
    , getMetaFilename: function(dir) {
        dir = dir || '.';
        return path.resolve(dir, './meta.json');
    }
    , getMetaData: function(dir) {
        return q.nfcall(utils.getJsonFile, this.getMetaFilename(dir));
    }
    , getPackageFilename: function(dir) {
        dir = dir || '.';
        return path.resolve(dir, './package.json');
    }
    , getPackageData: function(dir) {
        return q.nfcall(utils.getJsonFile, this.getPackageFilename(dir));
    }
    , getFixtureEnvFilename: function(dir) {
        dir = dir || '.';
        return path.resolve(dir, './fixtures/env.js');
    }
    , getFixtureEnvData: function(dir) {
        return q.nfcall(utils.getStringFile, this.getFixtureEnvFilename(dir));
    }
    , getPackageName: function(dir) {
        var def = q.defer();
        this.getPackageData(dir).then(function(data) {
            if(data && data.name) {
                def.resolve(data.name);
            } else {
                def.reject(new Error('No package name found'));
            }
        });
        return def.promise;
    }
    , doesNotExist: function(dest) {
        var def = q.defer();

        fs.stat(dest, function(err, stats) {
            if(err) return def.resolve();

            return def.reject('directory exists');
        });

        return def.promise;
    }
    , getRepoNamespace: function(packageName) {
        return account.me().then(function(accountData) {
            return accountData.data.username + '/' + packageName;
        });
    }
    , getDexterName: function(packageName) {
        return account.me().then(function(accountData) {
            return accountData.data.username + '-' + packageName;
        });
    }
    , isNameAvailable: function(packageName, callback) {
        var d = q.defer();
        //{ stdio: [process.stdin, process.stdout, process.stderr, 'pipe'] }
        this.getRepoNamespace(packageName).then(function(repoName) {
            child_process.execFile(
                'ssh',
                ['-p', configtools.git.port, 'git@' + configtools.git.machineName, 'module_exists', repoName],
                { },
                function(err, stdout, stderr) {
                    stdout = cleanOutput(stdout);
                    stderr = cleanOutput(stderr);
                    var errData = stdout;
                    if(stdout && stderr) errData += ' : ';
                    if(stderr) errData += stderr;
                    //Technically, since all the info is on stdout, we don't need to 
                    //  check for an error, but it might make sense to remember there's
                    //  a nonzero exit code in the future.
                    if(!err) {
                        switch(stdout) {
                            case 'owned':
                                d.resolve(NAME_STATUS.OWNED_BY_USER);
                                break;
                            case 'available':
                                d.resolve(NAME_STATUS.AVAILABLE);
                                break;
                            default:
                                d.reject('Unknown success response: ' + errData);
                                break;
                        }
                        //Name is available
                    } else {
                        //Name isn't available
                        switch(stdout) {
                            case 'unauthorized':
                                d.resolve(NAME_STATUS.UNAVAILABLE);
                                break;
                            default:
                                d.reject('Unknown error response: ' + errData);
                                break;
                        }
                    }
                }
            );
        });
        d.promise.nodeify(callback);
        return d.promise;    
    }
    , assertPublishable: function(package) {
        if(!package.repository) {
            throw "package.json > repository attribute required";
        } else if(package.repository.type != 'git') {
            throw "package.json > repository.type must be git";
        } else if(!package.repository.url) {
            throw "package.json > repository.url required";
        }
    }
    , installDependencies: function(dir) {
        return q.nfcall(child_process.execFile, 
            'npm',
            ['install'], 
            {}
        ).then(function(stdout, stderr) {
            console.log(stdout.join('').trim());
        });
    }
};
