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
            //GitHub becomes github, Fit Bit fitbit, etc.
            "LOWERCASE_PROVIDER_NAME": {
                "credentials": {
                    "access_token": "4908y290734yg3947ty3974t",
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
