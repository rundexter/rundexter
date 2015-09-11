var path = require('path')
  , fs   = require('fs')
;
module.exports = {
    slugify: function(text) {
        return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
    }
    , getStringFile: function(file, callback) {
        fs.readFile(file, 'utf8', function(err, configData) {
            if(err) {
                callback(null, null);
            } else {
                callback(null, configData);
            }
        });
    }
    , getJsonFile: function(file, callback) {
        fs.readFile(file, 'utf8', function(err, configData) {
            var config;
            if(err) {
                config = {};
            } else {
                try {
                    config = JSON.parse(configData);
                } catch(e) {
                    config = {};
                }
            }

            callback(null, config);
        });
    }
    , streamToString: function(cb) {
        var content = '';
        process.stdin.resume();
        process.stdin.setEncoding('utf-8');
        process.stdin.on('data', function(buf) { content += buf.toString(); });
        process.stdin.on('end', function() {
            cb(content);
        });
    }
}
