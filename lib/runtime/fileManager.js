var _ = require('lodash')
    , dropbox = require('dropbox')
    , providers = {}
;
providers.dropbox = {
    client: null
    , init: function(creds) {
        if(!providers.dropbox.client) {
            providers.dropbox.client = new dropbox.Client({
                token: creds.access_token
            })
        }
    }
    , get: function(fileptr, creds, callback) {
        providers.dropbox.init(creds);
        providers.dropbox.client.readFile(fileptr.path, {
            arrayBuffer: true
        }, function(error, arrayBuffer) {
            if(error) {
                return callback(error, null);
            }
            var buffer = new Buffer(arrayBuffer.byteLength)
                , data = new Uint8Array(arrayBuffer)
            ;
            data.forEach(function(datum, idx) {
                buffer[idx] = datum;
            });
            callback(null, buffer);
        });
    }
};

var Files = function(parser, logger) {
    this.parser = parser;
    this.logger = logger;
}
_.extend(Files.prototype, {
    get: function(fileptr, callback) {
        var src = fileptr.source;
        return providers[src].get(fileptr, this.parser.provider(src).credentials(), callback);
    }
});
Files.isFile = function(data) {
    return _.isObject(data) && data.source
        && data.path && data.size
        && data.created && data.modified
    ;
}
module.exports = {
    Files: Files
    , factory: function(parser, logger) {
        return new Files(parser, logger);
    }
};
