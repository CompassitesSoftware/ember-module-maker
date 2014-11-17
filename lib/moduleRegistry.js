'use strict';

var _ = require('lodash'),
    ModuleDefinition = require('./moduleDefinition');

function ModuleRegistry() {
  this.moduleDefinitions = {};
}

_.extend(ModuleRegistry.prototype, {

  hasModule: function (moduleName) {
    return _.has(this.moduleDefinitions, moduleName);
  },

  getModuleNames: function () {
    return _.keys(this.moduleDefinitions);
  },

  getModule: function (moduleName) {
    return this.moduleDefinitions[moduleName];
  },

  registerModule: function (moduleDefinition) {
    var moduleName;
    moduleDefinition = (moduleDefinition instanceof ModuleDefinition) ? moduleDefinition :
          new ModuleDefinition(moduleDefinition);
    moduleName = moduleDefinition.name;
    if (this.hasModule(moduleName)) return;
    this.moduleDefinitions[moduleName] = moduleDefinition;
  },

  unregisterModule: function (moduleName) {
    if (!(this.hasModule(moduleName))) return;
    delete this.moduleDefinitions[moduleName];
  }

});

module.exports = ModuleRegistry;