var url = require('url')
    , path = require('path')
    , fs = require('fs')
    , configtools = require('./config')
    , netrctools = require('./netrc')
    ;
module.exports = {
    //We pass the config just to make sure it's loaded, rather than
    //  worrying about promises/callback
    getUrl: function(stem) {
        var base = configtools.getHttpUrl('api');
        stem = stem || '';
        if(stem[0] === '/') {
            stem = stem.substr(1);
        }
        return url.resolve(base + '/api/', stem);
    }
    , signRequest: function(request) {
        if(!request) {
            request = {};
        }
        if(!request.headers) {
            request.headers = [];
        }
        request.headers['X-Authorization'] = netrctools.getPassword();
        request.headers['Accept'] = 'application/json';
        return request;
    }
    , wrapResponse: function(result, response, success) {
        var errFileName = path.join(configtools.getUserHome(), '.dexter-last-error')
            ;
        if(fs.existsSync(errFileName)) {
            fs.unlinkSync(errFileName);
        }
        if(result && result.success) {
            success();
        } else if(result && !result.success && result.error) {
            console.log('Request failed:', result.error);
        } else if(response && response.statusCode) {
            if(response.statusCode === 404) {
                console.log('Endpoint not found');
            } else {
                console.log(response.statusCode, 'Unknown error');
                if(configtools.isDev) {
                    console.log('Writing output to', errFileName);
                    if(result.indexOf) {
                        //Write the string
                        fs.writeFileSync(errFileName, result);
                    } else {
                        //Write the json
                        fs.writeFileSync(errFileName, JSON.stringify(result, null, 4));
                    }
                }
            }
        } else {
            if(result && result.error) {
                console.error('Error:', result.error);
            } else if(response && response.statusCode) {
                console.error(response.statusCode, result);
            } else {
                console.log('Error: code', result.code);
            }
        }
    }
};
