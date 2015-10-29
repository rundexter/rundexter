/*globals describe,it,beforeEach,afterEach*/
/*jshint -W030 */

var git = require('../lib/git')
  , chai   = require('chai')  
  , expect = chai.expect
  , cluster = require('cluster')
  , tmp = require('tmp')
  , fs  = require('fs')
  , dexter = require('../bin/dexter')
;

var fs = require('fs');
var deleteFolderRecursive = function(path) {
  if( fs.existsSync(path) ) {
    fs.readdirSync(path).forEach(function(file,index){
      var curPath = path + "/" + file;
      if(fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};

describe("dexter create", function() {
    var old_dir;

    beforeEach(function() {
        deleteFolderRecursive('/tmp/__dexter_test_home');
        fs.mkdirSync('/tmp/__dexter_test_home');
        fs.mkdirSync('/tmp/__dexter_test_home/testProj');
        old_dir = process.cwd();
        process.chdir('/tmp/__dexter_test_home');
    });

    it("creates a subfolder", function(done) {
        this.timeout(20000);
        var root = '/tmp/__dexter_test_home';
        expect(fs.lstatSync(root).isDirectory(), 'root').to.be.truthy;
        process.chdir(root);
        dexter.exec('create', 'test module')
            .then(function() {
                expect(fs.lstatSync(root + '/test-module').isDirectory(), 'root').to.be.truthy;
                done();
            })
            .fail(function(err) {
                done('Module creation failed ' + err);
            })
        ;
    });

    it("fails if subfolder exists", function(done) {
        this.timeout(20000);
        var root = '/tmp/__dexter_test_home';
        expect(fs.lstatSync(root).isDirectory(), 'root').to.be.truthy;
        process.chdir(root);
        dexter.exec('create', 'testProj')
            .then(function() {
                done(new Error('succeeded creating a module even though the subfolder existed'));
            })
            .fail(function() {
                done();
            })
        ;
    });
});
