/*globals describe,it*/
/*jshint -W030 */

var git = require('../lib/git')
  , chai   = require('chai')  
  , expect = chai.expect
  , cluster = require('cluster')
  , tmp = require('tmp')
  , fs  = require('fs')
;

describe("git library", function() {
    it("gets git config", function(done) {
        git.getConfig()
            .then(function(config) {
                expect(config.email).to.not.be.empty;
                done();
            })
            .catch(function(err) {
                done(err);
            })
        ;
    });

    it("finds git root when in repo", function(done) {
        git.getRepo('.')
            .then(function(repo) {
                expect(repo).to.not.be.empty;
                done();
            })
            .catch(done)
            ;
    });

    it("returns null when not in repo", function(done) {
        git.getRepo('/tmp')
            .then(function(repo) {
                expect(repo).to.be.empty;
                done();
            })
            .catch(done)
        ;
    });

    it("checks and creates git repo", function(done) {
        tmp.dir(function(err, path, cleanupCallback) {
            if (err) throw err;

            git
              .getOrCreateRepo(path)
              .then(function() {
                  expect(fs.existsSync(path + '/.git')).to.be.truthy;
                  done();
              }, done.bind(null, 'Failed creating repo ' + path)
            );
        });
    });

    it("fails when there is no remote", function(done) {
        tmp.dir(function(err, path, cleanupCallback) {
            if (err) throw err;

            git
              .getOrCreateRepo(path)
              .then(function() {
                  expect(fs.existsSync(path + '/.git')).to.be.truthy;
              }, done.bind(null, 'Failed creating repo ' + path))
              .then(function() {
                  return git.getRemote(path+'/.git', 'origin').then(function() {
                    done('Unexpected remote');
                  }, done.bind(null, null));
              })
              .catch(done)
            ;
        });
    });

    it("adds a remote and discovers it", function(done) {
        tmp.dir(function(err, path, cleanupCallback) {
            if (err) throw err;

            git
              .getOrCreateRepo(path)
              .then(git.getOrCreateRemote.bind(git, path, 'origin', 'git@git.com'))
              .then(git.getRemote.bind(git,path,'origin'))
              .then(done)
            ;
        });
    });

    it("succeeds on initial commit", function(done) {
        tmp.dir(function(err, path, cleanupCallback) {
            if (err) throw err;

            fs.writeFileSync(path+'/tst.txt', 'HELLO WORLD');

            git
              .getOrCreateRepo(path)
              .then(git.initialCommit.bind(git, path))
              .then(done)
            ;
        });
    });
});
