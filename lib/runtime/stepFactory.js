var $q = require('q')
  , _  = require('lodash')
  , fileManager = require('./fileManager')
;

var Step = function(parser) {
	this.deferred = $q.defer();
    this.parser = parser;
    this.files = fileManager.factory(parser);
};

Step.prototype.run = function() {
};

Step.prototype.complete = function() {
    this.deferred.resolve.apply(this.deferred, arguments);
};

Step.prototype.fail = function() {
    this.deferred.reject.apply(this.deferred, arguments);
};

Step.prototype.log = function() {
    console.log.apply(console.log, arguments);
};

Step.prototype.replay = function() {
    this.run(this.parser.step(), this.parser);
};

var StepFactory = {
    extend: function(BaseStep, ChildStep) {
        if(arguments.length == 1) {
            ChildStep = BaseStep;
            BaseStep  = Step;
        }

        var constructor = function() {
            BaseStep.apply(this, arguments);
            if(ChildStep.init)
                ChildStep.init.call(this, arguments);
            this._super = Object.create(BaseStep.prototype);
        };
        _.extend(constructor.prototype, BaseStep.prototype, ChildStep);

        return constructor;
    }
    , create: function(ChildStep, parser) {
        return new (StepFactory.extend(ChildStep))(parser);
    }
};

module.exports = StepFactory;
