module.exports = {
    getHttpUrl: function(machine) {
        var protocol = (this[machine].isHTTPS) ? 'https://' : 'http://'
            , port = (this[machine].port === 80) ? '' : ':' + this[machine].port
            ;
        return protocol + this.api.machineName + port;
    }
    , getGitUrl: function() {
        if(this.git.port === 22) {
            //Use the simple format
            return ['git@', this.git.machineName, ':/'].join('');
        }
        //Use the full SSH format
        return ['ssh://git@', this.git.machineName, ':', this.git.port, '/'].join('');
    }
    , api: {
        machineName: process.env.DEXTER_API_HOST || 'rundexter.com'
        , isHTTPS: parseInt(process.env.DEXTER_API_HTTPS, 10) !== 0
        , port: parseInt(process.env.DEXTER_API_PORT, 10) || 80
    }
    , git: {
        machineName: process.env.DEXTER_GIT_HOST || 'rundexter.com'
        , isHTTPS: parseInt(process.env.DEXTER_GIT_HTTPS, 10) !== 0
        , port: parseInt(process.env.DEXTER_GIT_PORT, 10) || 22
    }
    //Note: we also check this against process.env directly in the main binary
    , isDev: process.env.DEXTER_DEV !== undefined
    , getUser: function() {
        return process.env.USER;
    }
    , getUserHome: function() {
        return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
    }
};
