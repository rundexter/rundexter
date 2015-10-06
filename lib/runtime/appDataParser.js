var _ = require('lodash')
    , modules = {}
    ;

/**
 * A wrapper around extracted data that provides some consistency between collection vs. non-collection data
 *
 * @param {object} data Data we'll be accessing
 */
function AppDataVar(data) {
    var self = this;
    this.originalData = data;
    if(data) {
        this.data = (_.isArray(data)) ? data : [data];
    } else {
        this.data = [];
    }
    //Make this an array-like object
    this.length = this.data.length;
    _.each(this.data, function(v, idx) {
        self[idx] = v;
    });
}
_.extend(AppDataVar.prototype, {
    first: function() {
        return (this.length > 0) ? this[0] : null;
    }
    , each: function(fn) {
        _.each(this.data, fn);
    }
    , toArray: function() {
        return _.cloneDeep(this.data);
    }
});

/**
 * A wrapper around a non-collection object
 *
 * @param {object} src Data this object wraps around
 */
function AppDataBase(src) {
    this.src = src;
}
_.extend(AppDataBase.prototype, {
    get: function(route, fallback) {
        if(_.isArray(route)) {
            route = route.join('.');
        }
        return _.get(this.src, route, fallback);
    },
    getCollection: function(route, fallback) {
        return new AppDataVar(this.get(route, fallback));
    },
    set: function(route, val) {
        if(_.isArray(route)) {
            route = route.join('.');
        }
        _.set(this.src, route, val);
    }
});

/**
 * A wrapper around the root app data package
 *
 * @param {object} appdata Raw app data
 */
function AppDataParser(appdata) {
    this.instance_id = appdata.instance_id;
    this._steps = {};
    AppDataBase.call(this, appdata, null);
}
AppDataParser.prototype = Object.create(AppDataBase.prototype);
AppDataParser.prototype.constructor = AppDataParser;
_.extend(AppDataParser.prototype, {
    _steps: null,
    instance: function(key, fallback) {
        return this.get(['instance_state', key], fallback);
    },
    environment: function(key, fallback) {
        return this.get(['environment', key], fallback);
    },
    user: function(key, fallback) {
        return this.get(['user', key], fallback);
    },
    app: function(key, fallback) {
        return this.get(['workflow', key], fallback);
    },
    url: function(key, fallback) {
        return this.get(['urls', key], fallback);
    },
    private: function(key, fallback) {
        return this.get(['privates', key], fallback);
    },
    global: function(key, fallback) {
        return this.get(['instance_state.user_globals', key], fallback);
    },
    globals: function() {
        if(!this.src.instance_state.user_globals) {
            this.src.instance_state.user_globals = {};
        }
        return new AppDataBase(this.src.instance_state.user_globals); 
    },
    setGlobal: function(key, val) {
        if(val instanceof AppDataVar) {
            val = val.toArray();
        } else if(val instanceof AppDataBase) {
            val = val.src;
        }
        this.globals().set(key, val);
    },   
    step: function(id) {
        if(id === undefined) {
            id = this.instance('active_step', null);
        }
        if(!id) {
            throw new Error('Cannot get step for an empty id');
        }
        if(!this.get(['steps', id])) {
            return null;
        }
        //Make sure we're not duplicating steps
        if(!this._steps[id]) {
            this._steps[id] = new AppDataStep(this, id);
        } 
        return this._steps[id];
    },
    clone: function() {
        return new AppDataParser(_.cloneDeep(this.src));
    }
});


/**
 * A wrapper around a specific step's information
 *
 * @param {AppDataParser} parser The root data parser
 * @param {string} stepId ID of the step we're managing
 */
function AppDataStep(parser, stepId) {
    AppDataBase.call(this, parser.src);
    this.parser = parser;
    this.id = stepId;
    //Set up some shortcuts to get at step-related data
    this.stepPrefix = 'steps.' + stepId;
    this.dataPrefix = 'data.' + stepId;
    if(this.config('type_name')) {
        this.modulePrefix = 'modules.' + this.config('type_name');
    } else {
        this.modulePrefix = null;
    }
    //Make sure there's input/output collections for the step
    if(!_.isPlainObject(this.parser.get(this.dataPrefix))) {
        this.parser.set(this.dataPrefix, {});
    }
    if(!_.isPlainObject(this.inputs())) {
        this.setInputs({});
    }
    if(!_.isArray(this.outputs())) {
        this.setOutputs([]);
    }
}
AppDataStep.prototype = Object.create(AppDataBase.prototype);
AppDataStep.prototype.constructor = AppDataStep;
_.extend(AppDataStep.prototype, {
    config: function(key, fallback) {
        return this.get([this.stepPrefix, key], fallback);
    },
    prev: function() {
        if(this.config('prev')) {
            return this.parser.step(this.config('prev'));
        }
        return null;
    },
    trigger: function() {
        var step = this
            , prev = null
            , max = Object.keys(this.parser.src.steps).length
            , ctr = 0
            ;
        while(ctr <= max && (prev = step.prev()) !== null) {
            step = prev;
            ctr ++;
        }
        if(ctr > max) {
            throw new Error('Recursion found in steps tree - make sure there aren\'t any loops in the data!');
        }
        return step;
    },
    module: function(key, fallback) {
        if(this.modulePrefix) {
            return this.get([this.modulePrefix, key], fallback);
        } else {
            return null;
        }
    },
    input: function(key, fallback) {
        return this.getCollection([this.dataPrefix, 'input', key], fallback);
    },
    inputs: function() {
        return this.get([this.dataPrefix, 'input']);
    },
    output: function(key, fallback) {
        var data = []
            , self = this;
        _.each(this.outputs(), function(output) {
            data.push(_.get(output, key, fallback));
        });
        return new AppDataVar(data);
    },
    outputs: function() {
        return this.get([this.dataPrefix, 'output']);
    },
    clone: function() {
        return this.parser.clone().step(this.id);
    },
    set: function() {
        throw new Error('Use either setConfig, setModule, or setInput, or setOutput');
    },
    setConfig: function(route, val) {
        _.set(this.parser.get(this.stepPrefix), route, val);
    },
    setModule: function(route, val) {
        _.set(this.parser.get(this.modulePrefix), route, val);
    },
    setInput: function(route, val) {
        _.set(this.parser.get(this.dataPrefix + '.input'), route, val);
    },
    setInputs: function(obj) {
        this.parser.set([this.dataPrefix, 'input'], obj);
    },
    setOutput: function(route, val) {
        _.set(this.parser.get(this.dataPrefix + '.output'), route, val);
    },
    setOutputs: function(obj) {
        this.parser.set([this.dataPrefix, 'output'], obj);
    }
});

module.exports = {
    AppDataVar: AppDataVar
    , AppDataBase: AppDataBase
    , AppDataParser: AppDataParser
    , factory: function(appdata) {
        return new AppDataParser(appdata);
    }
};