var rest = require('restler')
  , remotetools = require('./remote')
  , q = require('q')
  , cache = null
;

module.exports =  {
    /**
    * Log the user in and set our token
    * 
    * @access public
    * @return void
    */
    me: function() {
        var deferred= q.defer(); 
        if(cache) {
            deferred.resolve(cache);
        } else {
            rest.get(remotetools.getUrl('auth/me'), remotetools.signRequest())
              .on('complete', function(result, response) {
                  if(result instanceof Error || !result.success) {
                      console.error('Could not log in: ' + (result.error || 'Unknown Error'));
                      deferred.reject(result); 
                  } else if(result && result.success) {
                      console.log(result);
                      cache = result;
                      deferred.resolve(result);
                  }
              });
        }
        return deferred.promise;
    }
};
