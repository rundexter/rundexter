/*
 * Rename this to env.js 
 *
 * Store any secret information that is needed for execution, but
 * you don't want to push here.
 */

module.exports = {
    "environment": {
        "provider_app_id"  : "YOUR_SECRET_ACCESS_KEY",
        "provider_app_key" : "YOUR_SECRET_API_KEY"
    },
    "user": {
        "profile": {
            "id": "YOUR_EMAIL",
            "api_key": "YOUR_API_KEY"
        },
        "providers": {
            //e.g. github, google, twitter, etc.
            "PROVIDER_NAME": {
                "credentials": {
                    "access_token": "...",
                    //OAuth1:
                    "access_token_secret": "...",
                    "consumer_key": "...",
                    //OAuth2:
                    "client_id": "..."
                },
                "OTHER_DATA": "foo"
            }
        }
    }
};
