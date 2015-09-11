var netrcreader = require('netrc')
    , netrc = null
    , fs = require('fs')
    , join = require('path').join
    , EOL = require('os').EOL
    , configtools = require('./config')
    , homepath
    , filename
    ;

//The netrc module doesn't expose the filename it constructs.
//For consistency, we'll build it and pass it in so we can get
//  at it later on.
function loadNetrcFile() {
    filename = join(configtools.getUserHome(), '.netrc');
    netrc = netrcreader(filename);
}
loadNetrcFile();

module.exports = {
    getPassword: function() {
        try {
            return netrc[configtools.api.machineName].password;
        } catch(e) {
            if(configtools.isDev) {
                console.log('Failed to extract netrc password for', configtools.api.machineName, ':', e);
            }
            return null;
        }
    }
    , write: function(login, password) {
        var tmpName = filename + '.dexter-new'
            , backupName = filename + '.dexter-old'
            , oldContents = ''
            , newFile = fs.openSync(tmpName, 'w', 0600)
            , skipping = false
            ;
        if(fs.existsSync(filename)) {
            oldContents = fs.readFileSync(filename, { encoding: 'utf8' });
        }
        oldContents.split("\n").forEach(function(line) {
            if(line.trim() === '') {
                return;
            }
            line = line.replace(/[\s\n\r]*$/, '');
            //The magic happens when a line starts with "machine "
            if(line.match(/^\s*machine /)) {
                if(skipping) {
                    skipping = false;
                }
                //We're in our territory if the line ends with our name
                skipping = line.match(new RegExp(configtools.api.machineName + '\s*$'));
            }
            if(!skipping) {
                fs.writeSync(newFile, line + EOL);
            }
        });
        fs.writeSync(newFile, 'machine ' + configtools.api.machineName + EOL);
        fs.writeSync(newFile, '  login ' + login + EOL);
        fs.writeSync(newFile, '  password ' + password + EOL);
        fs.closeSync(newFile);
        if(fs.existsSync(filename)) {
            fs.renameSync(filename, backupName);
        }
        fs.renameSync(tmpName, filename);
        //Reload netrc in case we need it again
        loadNetrcFile();
    }
};
