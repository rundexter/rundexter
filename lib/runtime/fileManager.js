var _ = require('lodash')
    , providers = {}
    , q = require('q')
;
providers.dropbox = {
    client: null
    , init: function(creds) {
        if(!providers.dropbox.client) {
            var dropbox;
            try {
                dropbox = require('dropbox');
            } catch(e) {
                throw new Error('npm install dropbox in order to run this fixture');
            }
            providers.dropbox.client = new dropbox.Client({
                token: creds.access_token
            });
        }
        return providers.dropbox.client;
    }
    , get: function(fileptr, creds, callback) {
        var deferred = q.defer();
        providers.dropbox.init(creds).readFile(fileptr.path, {
            arrayBuffer: true
        }, function(error, arrayBuffer) {
            if(error) {
                return deferred.reject(error);
            }
            var buffer = new Buffer(arrayBuffer.byteLength)
                , data = new Uint8Array(arrayBuffer)
            ;
            _.each(data, function(datum, idx) {
                buffer[idx] = datum;
            });
            deferred.resolve(buffer);
        });
        deferred.promise.nodeify(callback);
        return deferred.promise;
    }
    , put: function(path, source, creds, callback) {
        var deferred = q.defer()
            , self = this
        ;
        Files.sourceToBuffer(source)
            .then(function(buffer) {
                providers.dropbox.init(creds).writeFile(path, buffer, {
                    noOverwrite: true
                }, function(error, ref) {
                    if(error) {
                        return deferred.reject(error);
                    }
                    deferred.resolve(providers.dropbox.buildPointer(ref));
                });
            })
        ;
        deferred.promise.nodeify(callback);
        return deferred.promise;
    }
    , buildPointer: function(meta) {
        return {
            source: 'dropbox'
            , size: meta.bytes
            , path: meta.path
            , id: meta.path
            , created: null
            , modified: meta.modified
        };
    }
};
providers.glacier = {
    client: null
    , valut: null
    , getCredentials: function(parser) {
        var stepPrefix = parser.step().config('id') + '_';
        return {
            accessKeyId: parser.environment(stepPrefix + 'AWS_GLACIER_ACCESS_KEY_ID', parser.environment('AWS_GLACIER_ACCESS_KEY_ID'))
            , secretAccessKey: parser.environment(stepPrefix + 'AWS_GLACIER_ACCESS_KEY_SECRET', parser.environment('AWS_GLACIER_ACCESS_KEY_SECRET'))
            , region: parser.environment(stepPrefix + 'AWS_GLACIER_REGION', parser.environment('AWS_GLACIER_REGION'))
            , vault: parser.environment(stepPrefix + 'AWS_GLACIER_VAULT', parser.environment('AWS_GLACIER_VAULT'))
        }
    }
    , init: function(creds) {
        var toUse = null;
        if(!providers.glacier.client) {
            var AWS;
            try {
                AWS = require('AWS');
            } catch(e) {
                throw new Error('npm install aws-sdk in order to run this fixture');
            }
            toUse = _.cloneDeep(creds);
            providers.glacier.vault = toUse.vault;
            delete toUse.valut;
            providers.glacier.client = new AWS.Glacier(toUse);
        }
        return providers.glacier.client;
    }
    , get: function(fileptr, creds, callback) {
        throw new Error('Cannot retrieve Glacier archives through the Dexter file tools');
    }
    , put: function(path, source, creds, callback) {
        var deferred = q.defer()
            , self = this
        ;
        Files.streamOrBuffer(source)
            .then(function(streamOrBuffer) {
                return q.ninvoke(providers.glacier.init(creds), 'uploadArchive', {
                    accountId: '-',
                    vaultName: providers.glacier.vault,
                    body: streamOrBuffer
                });
            })
            .then(function(response) {
                console.log('Response', response);
                deferred.resolve(providers.glacier.buildPointer(response));
            })
            .fail(function(err) {
                console.log('Reject', reject);
                deferred.reject(err);
            })
        ;
        deferred.promise.nodeify(callback);
        return deferred.promise;
    }
    , buildPointer: function(meta) {
        return {
            source: 'glacier'
            , size: null
            , path: meta.location
            , id: meta.archiveId
            , created: null
            , modified: null
        };
    }
};

var Files = function(parser, logger) {
    this.parser = parser;
    this.logger = logger;
};
_.extend(Files.prototype, {
    findCredentials: function(providerName) {
        var provider = this.provider(providerName);
        if(typeof provider.getCredentials === 'function') {
            return provider.getCredentials(this.parser);
        }
        return this.parser.provider(providerName).credentials();
    }
    , get: function(fileptr, callback) {
        var providerName = fileptr.source
            , credentials = this.findCredentials(providerName)
        ;
        return this.provider(providerName).get(fileptr, credentials, callback);
    }
    , put: function(providerName, path, source, callback) {
        var credentials = this.findCredentials(providerName);
        return this.provider(providerName).put(path, source, credentials, callback);
    }
    , provider: function(providerName) {
        return providers[providerName];
    }
    //Expose static functions in a way the wrapper can easily get at them
    , isFilePointer: function(data) {
        return Files.isFilePointer(data);
    }
    , isStreamLike: function(source) {
        return Files.isStreamLike(source);
    }
    , streamToBuffer: function(stream, callback) {
        return Files.streamToBuffer(stream, buffer, callback);
    }
    , sourceToBuffer: function(source, callback) {
        return Files.sourceToBuffer(source, callback);
    }
    , streamOrBuffer: function(source, callback) {
        return Files.streamOrBuffer(source, callback);
    }
});
Files.isFilePointer = function(data) {
    return _.isObject(data) && data.source
        && data.path && data.size
        && data.created && data.modified
    ;
};
Files.isStreamLike = function(source) {
    return typeof source.on === 'function'
        && typeof source.pipe === 'function'
    ;
}
Files.streamToBuffer = function(stream, callback) {
    var data = []
        , deferred = q.defer()
    ;
    stream.on('data', function(chunk) {
        data.push(chunk);
    });
    stream.on('error', deferred.reject.bind(deferred));
    stream.on('end', function() { // Will be emitted when the input stream has ended, ie. no more data will be provided
        deferred.resolve(Buffer.concat(data));
    });
    deferred.promise.nodeify(callback);
    return deferred.promise;
}
Files.sourceToBuffer = function(source, callback) {
    var deferred = q.defer();
    if(source instanceof Buffer) {
        deferred.resolve(source);
    } else if(Files.isStreamLike(source)) {
        deferred.resolve(Files.streamToBuffer(source));
    } else if(_.isArray(source)) {
        deferred.resolve(new Buffer(source));
    } else {
        deferred.reject(new Error('Unknown source data type'));
    }
    deferred.promise.nodeify(callback);
    return deferred.promise;
};
Files.streamOrBuffer = function(source, callback) {
    var deferred = q.defer();
    if(source instanceof Buffer) {
        deferred.resolve(source);
    } else if(Files.isStreamLike(source)) {
        deferred.resolve(source);
    } else if(_.isArray(source)) {
        deferred.resolve(new Buffer(source));
    } else {
        deferred.reject(new Error('Unknown source data type'));
    }
    deferred.promise.nodeify(callback);
    return deferred.promise;
};
module.exports = {
    Files: Files
    , factory: function(parser, logger) {
        return new Files(parser, logger);
    }
};
