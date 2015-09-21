var rest = require('restler')
  , remotetools = require('./remote')
  , q = require('q')
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
        rest.get(remotetools.getUrl('auth/me'), remotetools.signRequest())
          .on('complete', function(result, response) {
              if(result instanceof Error || !result.success) {
                  console.error('Could not login: ' + (result.error || 'Unknown Error'));
                  deferred.reject(result); 
              } else if(result && result.success) {
                  deferred.resolve(result);
              }
          });

        return deferred.promise;
    }
};
