var _ = require('lodash')
    , q = require('q')
    , Path = require('path')
    , fs = require('fs')
    , moddir = null
    , useStorage = true
;
/**
 * An module-specific data storage mechanism.
 * Note that this is just a shim for the SDK - the production
 * storage works much differently.  This object is not available
 * in production.
 */
var StorageData = {
    /**
     * The last known JSON data
     */
    _data: null
    /**
     * The name of the file responsible for _file
     */
    , _filename: null
    /**
     * Get the name of the file we should use for the current module
     */
    , filename: function() {
        return Path.join(moddir, '.fixtureStorage');
    }
    /**
     * Make sure our data is loaded and available
     *
     * @return Object
     */
    , data: function() {
        var newFilename = this.filename(), contents;
        if(newFilename != this._filename) {
            this._filename = newFilename;
            this._data = null;
        }
        if(!this._data) {
            if(fs.existsSync(newFilename)) {
                contents = fs.readFileSync(newFilename, 'utf8');
                this._data = (contents) ? JSON.parse(contents) : {};
                if(!this._data) {
                    this._data = {};
                }
            } else {
                this._data= {};
            }
        }
        return this._data;
    }
    /**
     * Update a stored value
     *
     * @param string key
     * @param mixed value
     */
    , set: function(key, value) {
        this.data()[key] = value;
        fs.writeFileSync(this._filename, JSON.stringify(this.data(), 'utf8'));
    }
    /**
     * Get a stored value, or null if no such value exists
     *
     * @param string key
     * @return mixed
     */
    , get: function(key) {
        return this.data()[key] || null;
    }
    /**
     * Wipe out the store for the active module
     */
    , clear: function() {
        var filename = this.filename();
        this._data = null;
        if(fs.existsSync(filename)) {
            fs.unlinkSync(filename);
            return true;
        }
        return false;
    }
};
/**
 * Storage/cache API available as "this.storage" inside modules.
 * The API here in the SDK is the same as it is in production,
 * but the mechanisms underneath are drastically differet.
 * Properties and functions prefixed with a "_" are either
 * unavailalbe or unreliable for use in production environments.
 *
 * @param object parser
 * @param object logger
 */
var Storage = function(parser, logger) {
    this.parser = parser;
    this.logger = logger;
    this.appId = parser.app('id');
    this.userId = parser.user('profile.id');
    this.apiKey = parser.user('profile.api_key');
};
_.extend(Storage.prototype, {
    /**
     * Figure out a storage key (SDK ONLY!)
     *
     * @param bool isUser
     * @param string key
     * @return string
     */
    _dataKey: function(isUser, key) {
        var dataKey = this.appId;
        if(isUser) {
            dataKey += '||' + this.userId;
        }
        return dataKey + '_' + key;
    }
    /**
     * Fetch a key out of storage (unstable API)
     *
     * @param string key
     * @param mixed fallback
     * @param bool isUser
     * @param function callback
     * @return promise
     */
    , _get: function(key, fallback, isUser, callback) {
        var dataKey = this._dataKey(isUser, key)
            , deferred = q.defer()
            , data = null
        ;
        deferred.promise.nodeify(callback);
        if(useStorage) {
            data = StorageData.get(dataKey);
            if(data === null || data === undefined) {
                data = fallback;
            }
        }
        deferred.resolve(data);
        return deferred.promise;
    }
    /**
     * Set a key in the storage (unstable API)
     *
     * @param string key
     * @param mixed value
     * @param bool isUser
     * @param function callback
     * @return promise
     */
    , _set: function(key, value, isUser, callback) {
        var dataKey = this._dataKey(isUser, key)
            , deferred = q.defer()
        ;
        deferred.promise.nodeify(callback);
        if(useStorage) {
            StorageData.set(dataKey, value);
        }
        deferred.resolve();
        return deferred.promise;
    }
    /**
     * Get a value that's consitent across ALL instance of a module
     *
     * @param string key
     * @param mixed fallback
     * @param function callback
     * @return promise
     */
    , global: function(key, fallback, callback) {
        return this._get(key, fallback, false, callback);
    }
    /**
     * Set a value for ALL instances of a module
     *
     * @param string key
     * @param mixed value
     * @param function callback
     * @return promise
     */
    , setGlobal: function(key, value, callback) {
        return this._set(key, value, false, callback);
    }
    /**
     * Get a value for the current user
     *
     * @param string key
     * @param mixed fallback
     * @param function callback
     * @return promise
     */
    , user: function(key, fallback, callback) {
        return this._get(key, fallback, true, callback);
    }
    /**
     * Set a value for the current user
     *
     * @param string key
     * @param mixed value
     * @param function callback
     * @return promise
     */
    , setUser: function(key, value, callback) {
        return this._set(key, value, true, callback);
    }
});
module.exports = {
    Storage: Storage
    , setModuleDirectory: function(moduleDirectory) {
        moddir = moduleDirectory;
    }
    , setEnabled: function(isEnabled) {
        useStorage = isEnabled;
    }
    , clearStorage: function() {
        return StorageData.clear();        
    }
    , factory: function(parser, logger) {
        return new Storage(parser, logger);
    }
};
