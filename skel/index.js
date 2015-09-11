module.exports = {
    /**
     * The main entry point for the Dexter module
     *
     * @param {AppStep} step Accessor for the configuration for the step using this module.  Use step.input('{key}') to retrieve input data.
     * @param {AppData} dexter Container for all data used in this workflow.
     */
    run: function(step, dexter) {
        var results = { foo: 'bar' };
        //Call this.complete with the module's output.  If there's an error, call this.fail(message) instead.
        this.complete(results);
    }
};
