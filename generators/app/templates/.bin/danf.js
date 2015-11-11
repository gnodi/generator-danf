define('node_modules/danf/lib/common/utils',['require','exports','module'],function (require, exports, module) {'use strict';

var utils = {
    /**
     * Merge an object with one or many other objects.
     * Recursivity disabled by default.
     * objN+1 overwrite simple values of objN.
     * You can merge N objects. Recursivity is always the last (optional) argument.
     *
     *     var obj1 = {a: 'abc'},
     *         obj2 = {b: 'bcd'},
     *         obj3 = {b: 'efg'}
     *     ;
     *
     *     var obj = utils.merge(obj1, obj2, obj3);
     *     // obj == { a: 'abc', b: 'efg' }
     *
     * @param {object} obj1 The first object.
     * @param {object} obj2 The second object.
     * @param {object} objN The n-th object.
     * @param {boolean|integer} recursively Whether or not the merge is recursive? True for infinite recursivity, an integer to limit the recursivity.
     * @return {object} The merged object.
     * @api public
     */
    merge: function(obj1, obj2, objN, recursively) {
        var argumentsNumber = arguments.length,
            objects = [],
            recursively = false
        ;

        for (var i = 0; i < arguments.length; i++) {
            objects[i] = arguments[i]
        }

        var mergedObj = Array.isArray(obj1) && Array.isArray(obj2) ? [] : {};

        if ('object' !== typeof arguments[argumentsNumber - 1] && argumentsNumber >= 3) {
            recursively = arguments[argumentsNumber - 1];
            objects.pop();
        }

        for (var i = 0; i < objects.length; i++) {
            var object = objects[i];

            if (object) {
                for (var key in object) {
                    var value = object[key];

                    if (mergedObj[key] && recursively) {
                        if (
                            null == value || 'object' !== typeof value || value.__metadata ||
                            value instanceof Date || value instanceof RegExp || value instanceof Error
                        ) {
                            mergedObj[key] = value;
                        } else if (Array.isArray(mergedObj[key]) && Array.isArray(object[key])) {
                            mergedObj[key] = mergedObj[key].concat(object[key]);
                        } else if ('number' === typeof recursively) {
                            mergedObj[key] = utils.merge(mergedObj[key], value, recursively - 1);
                        } else {
                            mergedObj[key] = utils.merge(mergedObj[key], value, recursively);
                        }
                    } else {
                        mergedObj[key] = value;
                    }
                }
            }
        }

        return mergedObj;
    },

    /**
     * Clone an object.
     * (credits to A. Levy [http://stackoverflow.com/users/35881/a-levy])
     *
     * @param {object} object The object to clone.
     * @return {object} The cloned object.
     * @api public
     */
    clone: function(object, clonedObjects) {
        // Handle the 3 simple types, and null or undefined.
        if (null == object || 'object' !== typeof object) {
            return object;
        }

        // Handle Date.
        if (object instanceof Date) {
            var clone = new Date();

            clone.setTime(object.getTime());

            return clone;
        }

        // Handle Array.
        if (object instanceof Array) {
            var clone = [];

            for (var i = 0, len = object.length; i < len; i++) {
                clone[i] = utils.clone(object[i], clonedObjects);
            }

            return clone;
        }

        // Handle objects.
        if (!clonedObjects) {
            clonedObjects = []
        }

        var index = clonedObjects.indexOf(object);

        // Handle circular references.
        if (index !== -1) {
            return clonedObjects[index];
        }

        clonedObjects.push(object);

        var clone = Object.create(Object.getPrototypeOf(object));

        for (var attr in object) {
            try {
                if (object.hasOwnProperty) {
                    if (object.hasOwnProperty(attr)) {
                        clone[attr] = utils.clone(object[attr], clonedObjects);
                    }
                } else {
                    clone[attr] = utils.clone(object[attr], clonedObjects);
                }
            } catch (error) {
                // Do not copy inaccessible property.
            }
        }

        return clone;
    },

    /**
     * Extend objects or classes.
     *
     * @param {object|Function} extended The object or class to extend.
     * @param {object|Function} extender The extender.
     * @return {object} The extended object or child class.
     * @api public
     */
    extend: function(extended, extender) {
        if (extended && extender) {
            if (typeof extended === 'function' && typeof extender === 'function') {
                var prototype = extender.prototype;

                extender.prototype = Object.create(extended.prototype);

                // Merge already defined methods.
                for (var key in prototype) {
                    if (extender.hasOwnProperty(key)) {
                        extender.prototype[key] = prototype[key];
                    }
                }

                // Merge already defined properties.
                var propertyNames = Object.getOwnPropertyNames(prototype);

                for (var i = 0; i < propertyNames.length; i++) {
                    var name = propertyNames[i];

                    if ('constructor' !== name) {
                        var descriptor = Object.getOwnPropertyDescriptor(prototype, name);

                        Object.defineProperty(extender.prototype, name, descriptor);
                    }
                }

                extender.prototype.constructor = extender;

                // Inherit interfaces implementation.
                if (!extender.__metadata.implements) {
                    extender.__metadata.implements = [];
                }

                var implementedInterfaces = extender.__metadata.implements.concat(extended.__metadata.implements || []),
                    uniqueImplementedInterfaces = []
                ;

                for (var i = 0; i < implementedInterfaces.length; i++) {
                    if (-1 == uniqueImplementedInterfaces.indexOf(implementedInterfaces[i])) {
                        uniqueImplementedInterfaces.push(implementedInterfaces[i]);
                    }
                }

                extender.__metadata.implements = uniqueImplementedInterfaces;

                // Inherit dependencies.
                if (!extender.__metadata.dependencies) {
                    extender.__metadata.dependencies = {};
                }

                extender.__metadata.dependencies = utils.merge(
                    extended.__metadata.dependencies,
                    extender.__metadata.dependencies
                );

                extender.Parent = extended;

                return extender;
            } else {
                throw new Error('Unable to extend a "' + typeof extended + '" with a "' + typeof extender + '".');
            }
        } else if (extender) {
            extended = extender;
        }

        return extended;
    },

    /**
     * Flatten an object containing embedded objects.
     *
     * Example:
     *     {
     *         a: {
     *             a: {
     *                 a: 2,
     *                 b: 3
     *             },
     *             b: 4,
     *         },
     *         foo: 'bar'
     *     }
     *     is transformed in:
     *     {
     *         'a.a.a': 2,
     *         'a.a.b': 3,
     *         'a.b': 4,
     *         foo: 'bar'
     *     }
     *
     * @param {object} object The object to flatten.
     * @param {number} maxLevel The max level of flattening.
     * @param {string} separator The flattening separator (default ".").
     * @param {number} level The embedded level.
     * @api public
     */
    flatten: function(object, maxLevel, separator, level) {
        var flattenedObject = object;

        if (!level) {
            Object.checkType(object, 'object');
            flattenedObject = utils.clone(object);
            level = 0;
        }

        if (!maxLevel || level < maxLevel) {
            for (var key in flattenedObject) {
                var value = flattenedObject[key],
                    flattenObject = {}
                ;

                if ('object' === typeof value && null !== value) {
                    var embeddedObject = utils.flatten(value, maxLevel, separator, level + 1);

                    for (var flattenKey in embeddedObject) {
                        flattenedObject['{0}{1}{2}'.format(key, separator || '.', flattenKey)] = embeddedObject[flattenKey];
                    }

                    delete flattenedObject[key];
                }
            }
        }

        return flattenedObject;
    },

    /**
     * Clone an object and clean it from its operating properties.
     *
     * @param {object} object The object.
     * @param {boolean} clone Whether or not to clone the object.
     * @api public
     */
    clean: function(object, clone) {
        if (false !== clone) {
            object = utils.clone(object);
        }

        for (var key in object) {
            if ('__' === key.substr(0, 2)) {
                delete object[key];
            } else {
                var value = object[key];

                if ('object' === typeof value) {
                    object[key] = utils.clean(value, false);
                }
            }
        }

        return object;
    },

    /**
     * Stringify an object.
     *
     * @param {mixed} object The object.
     * @param {string} The stringified object.
     * @api public
     */
    stringify: function(object) {
        var string;

        try {
            string = JSON.stringify(object);
        } catch (error) {
            string = '...';
        }

        return string;
    }
};

/**
 * Expose `utils`.
 */
module.exports = utils;

});

define('node_modules/danf/lib/common/framework/framework',['require','exports','module','node_modules/danf/lib/common/utils'],function (require, exports, module) {var __filename = module.uri || "", __dirname = __filename.substring(0, __filename.lastIndexOf("/") + 1); 'use strict';

/**
 * Expose `Framework`.
 */
module.exports = Framework;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    objectsContainer = {
        has: function(id) {
            return undefined !== this.objects[id] ? true : false;
        },
        get: function(id) {
            if (!this.has(id)) {
                throw new Error('The object "{0}" is not defined.'.format(id))
            }

            return this.objects[id];
        },
        set: function(id, object) {
            this.objects[id] = object;
        }
    }
;

objectsContainer.objects = {};

/**
 * Initialize a new framework.
 */
function Framework() {
    this._initializers = [];
    this._objects = {};
    this.objectsContainer = objectsContainer;
}

/**
 * Objects container.
 *
 * @var {object}
 * @api public
 */
Object.defineProperty(Framework.prototype, 'objectsContainer', {
    get: function() { return this._objectsContainer; },
    set: function(objectsContainer) { this._objectsContainer = objectsContainer; }
});

/**
 * Add an initializer.
 *
 * @param {object} initializer The initializer.
 * @api public
 */
Framework.prototype.addInitializer = function(initializer) {
    this._initializers.push(initializer);
}

/**
 * Whether or not an object has been instanciated.
 *
 * @param {String} id The id of the object.
 * @api public
 */
Framework.prototype.has = function(id) {
    return this._objectsContainer.has(id);
}

/**
 * Get an object.
 *
 * @param {String} id The id of the service.
 * @return {Object} The service object.
 * @api public
 */
Framework.prototype.get = function(id) {
    return this._objectsContainer.get(id);
}

/**
 * Set an object.
 *
 * @param {String} id The id of the object.
 * @param {Object} service The object.
 * @api public
 */
Framework.prototype.set = function(id, object) {
    this._objectsContainer.set(id, object);
}

/**
 * Build the framework.
 *
 * @param {object} configuration The application danf configuration.
 * @param {object} context The application context.
 * @api public
 */
Framework.prototype.build = function(configuration, context) {
    var parameters = {context: context};

    // Instantiate objects.
    for (var i = 0; i < this._initializers.length; i++) {
        var initializer = this._initializers[i];

        if (initializer.instantiate) {
            initializer.instantiate(this);
        }
    }

    // Inject dependencies between objects.
    for (var i = 0; i < this._initializers.length; i++) {
        var initializer = this._initializers[i];

        if (initializer.inject) {
            initializer.inject(this, parameters);
        }
    }

    // Process.
    var modules = {
            'ajax-app': 'ajaxApp',
            'assets': 'assets',
            'configuration': 'configuration',
            'dependency-injection': 'dependencyInjection',
            'event': 'event',
            'file-system': 'fileSystem',
            'http': 'http',
            'manipulation': 'manipulation',
            'logging': 'logging',
            'object': 'object',
            'rendering': 'rendering',
            'vendor': 'vendor'
        },
        danfConfig = {
            parameters: {},
        },
        isServer = 'undefined' === typeof danf,
        rootPath = '';
    ;

    if (isServer) {
        if ('test' !== context.environment) {
            danfConfig['assets'] = {
                'require.js': context.clientMainPath + '/require.js',
                'app.js': __dirname + '/../../client/app.js',
                'favicon.ico': __dirname + '/../../../resource/public/img/favicon.png',
                '-/danf/bin': context.clientMainPath,
                '-/danf/config/common': __dirname + '/../../../config/common',
                '-/danf/config/client': __dirname + '/../../../config/client',
                '-/danf/lib/common': __dirname + '/..',
                '-/danf/lib/client': __dirname + '/../../client',
                '-/danf/resource': __dirname + '/../../../resource/public'
            };
        }
    } else {
        var rootPos = module.id.indexOf('/lib/common/framework/framework');

        rootPath = module.id.substring(0, rootPos);
        if (rootPath) {
            rootPath += '/';
        }
    }

    for (var path in modules) {
        var name = modules[path],
            modulePrefix = 'danf:{0}'.format(name),
            pathPrefixes = isServer
                ? ['../../../config/common/{0}'.format(path), '../../../config/server/{0}'.format(path)]
                : ['{0}config/common/{1}'.format(rootPath, path), '{0}config/client/{1}'.format(rootPath, path)],
            moduleConfig = {
                'parameters': {},
                'interfaces': {},
                'services': {
                    'danf:utils': {
                        class: function() {
                            return utils;
                        }
                    }
                },
                'classes': {}
            },
            handleError = function(error, modulePath) {
                if (
                    (
                        -1 === error.message.indexOf('Cannot find module')
                        && -1 === error.message.indexOf('has not been loaded')
                    )
                    || -1 === error.message.indexOf(modulePath)
                ) {
                    throw error;
                }
            }
        ;

        for (var i = 0; i < pathPrefixes.length; i++) {
            var pathPrefix = pathPrefixes[i];

            // Handle parameters.
            try {
                var modulePath = '{0}/{1}'.format(pathPrefix, 'parameters'),
                    parameters = require(modulePath)
                ;

                if (moduleConfig['parameters'][modulePrefix]) {
                    parameters = utils.merge(parameters, moduleConfig['parameters'][modulePrefix], true);
                }
                moduleConfig['parameters'][modulePrefix] = parameters;
            } catch (error) {
                handleError(error, modulePath);
            }

            // Handle interfaces.
            try {
                var interfaces = {},
                    modulePath = '{0}/{1}'.format(pathPrefix, 'interfaces')
                ;

                interfaces[modulePrefix] = require('{0}/{1}'.format(pathPrefix, 'interfaces'));
                interfaces = utils.flatten(interfaces, 1);
                moduleConfig['interfaces'] = utils.merge(interfaces, moduleConfig['interfaces'], true);
            } catch (error) {
                handleError(error, modulePath);
            }

            // Handle classes.
            try {
                var classes = {},
                    modulePath = '{0}/{1}'.format(pathPrefix, 'classes')
                ;

                classes[modulePrefix] = require(modulePath);
                classes = utils.flatten(classes);
                moduleConfig['classes'] = utils.merge(classes, moduleConfig['classes'], true);
            } catch (error) {
                handleError(error, modulePath);
            }

            // Handle services.
            try {
                var services = {},
                    modulePath = '{0}/{1}'.format(pathPrefix, 'services')
                ;

                services[modulePrefix] = require('{0}/{1}'.format(pathPrefix, 'services'));
                services = utils.flatten(services, 1);
                moduleConfig['services'] = utils.merge(services, moduleConfig['services'], true);
            } catch (error) {
                handleError(error, modulePath);
            }

            // Handle sequences.
            try {
                var sequences = {},
                    modulePath = '{0}/{1}'.format(pathPrefix, 'sequences')
                ;

                sequences[modulePrefix] = require('{0}/{1}'.format(pathPrefix, 'sequences'));
                sequences = utils.flatten(sequences, 1);
                moduleConfig['sequences'] = utils.merge(sequences, moduleConfig['sequences'], true);
            } catch (error) {
                handleError(error, modulePath);
            }

            // Handle events.
            try {
                var modulePath = '{0}/{1}'.format(pathPrefix, 'events');

                moduleConfig['events'] = utils.merge(
                    require(modulePath),
                    moduleConfig['events']
                );
            } catch (error) {
                handleError(error, modulePath);
            }

            // Handle assets.
            try {
                var modulePath = '{0}/{1}'.format(pathPrefix, 'assets');

                moduleConfig['assets'] = utils.merge(
                    require(modulePath),
                    moduleConfig['assets']
                );
            } catch (error) {
                handleError(error, modulePath);
            }
        }

        danfConfig = utils.merge(danfConfig, moduleConfig, true);
    }

    var parametersProcessor = this.get('danf:configuration.sectionProcessor.parameters');

    danfConfig = parametersProcessor.preProcess(danfConfig, utils.merge(danfConfig.parameters, {'danf:context': context}));
    danfConfig.classes = utils.flatten(danfConfig.classes);

    for (var i = 0; i < this._initializers.length; i++) {
        var initializer = this._initializers[i];

        if (initializer.process) {
            initializer.process(this, parameters, danfConfig, configuration);
        }
    }
}
});

define('node_modules/danf/lib/common/object/classes-container',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `ClassesContainer`.
 */
module.exports = ClassesContainer;

/**
 * Initialize a new classes container.
 */
function ClassesContainer() {
    this._definitions = {};
    this._classes = {};
    this._classProcessors = [];
}

ClassesContainer.defineImplementedInterfaces(['danf:object.classesContainer', 'danf:manipulation.registryObserver']);

ClassesContainer.defineDependency('_classProcessors', 'danf:object.classProcessor_array');

/**
 * Class processors.
 *
 * @var {danf:object.classProcessor_array}
 * @api public
 */
Object.defineProperty(ClassesContainer.prototype, 'classProcessors', {
    set: function(classProcessors) {
        this._classProcessors = [];

        for (var i = 0; i < classProcessors.length; i++) {
            this.addClassProcessor(classProcessors[i]);
        }
    }
});

/**
 * Add a class processor.
 *
 * @param {danf:object.classProcessor} newClassProcessor The class processor.
 * @api public
 */
ClassesContainer.prototype.addClassProcessor = function(newClassProcessor) {
    var added = false;

    newClassProcessor.classesContainer = this;

    for (var i = 0; i < this._classProcessors.length; i++) {
        var classProcessor = this._classProcessors[i];

        if (newClassProcessor.order < classProcessor.order) {
            this._classProcessors.splice(i, 0, newClassProcessor);
            added = true;

            break;
        }
    }

    if (!added) {
        this._classProcessors.push(newClassProcessor);
    }
}

/**
 * @interface {danf:manipulation.registryObserver}
 */
ClassesContainer.prototype.handleRegistryChange = function(items, reset, name) {
    if (!reset) {
        for (var id in items) {
           this.setDefinition(id, items[id]);
        }
    } else {
        for (var id in items) {
           delete this._definitions[id];
           delete this._classes[id];
        }
    }

    this.build();
}

/**
 * @interface {danf:object.classesContainer}
 */
ClassesContainer.prototype.setDefinition = function(id, class_) {
    class_.__metadata.id = id;

    this._definitions[id] = class_;
}

/**
 * @interface {danf:object.classesContainer}
 */
ClassesContainer.prototype.getDefinition = function(id) {
    if (!this.hasDefinition(id)) {
        throw new Error(
            'The class "{0}" is not defined.'.format(id)
        );
    }

    return this._definitions[id];
}

/**
 * @interface {danf:object.classesContainer}
 */
ClassesContainer.prototype.hasDefinition = function(id) {
    return this._definitions[id] ? true : false;
}

/**
 * @interface {danf:object.classesContainer}
 */
ClassesContainer.prototype.build = function() {
    // Build.
    for (var id in this._definitions) {
        if (!this.has(id)) {
            this._classes[id] = this.get(id);
        }
    }
}

/**
 * @interface {danf:object.classesContainer}
 */
ClassesContainer.prototype.get = function(id) {
    if (!this.has(id)) {
        var class_ = this.getDefinition(id);

        for (var i = 0; i < this._classProcessors.length; i++) {
            this._classProcessors[i].process(class_);
        }

        this._classes[id] = class_;
    }

    return this._classes[id];
}

/**
 * @interface {danf:object.classesContainer}
 */
ClassesContainer.prototype.has = function(id) {
    return this._classes[id] ? true : false;
}
});

define('node_modules/danf/lib/common/object/interface',['require','exports','module','node_modules/danf/lib/common/utils'],function (require, exports, module) {'use strict';

/**
 * Expose `Interface`.
 */
module.exports = Interface;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils');

/**
 * Initialize a new interface.
 */
function Interface() {
    this._methods = {};
    this._getters = {};
    this._setters = {};
}

Interface.defineImplementedInterfaces(['danf:object.interface']);

Interface.defineDependency('_name', 'string');
Interface.defineDependency('_extends', 'string|null');
Interface.defineDependency('_methods', 'mixed_object_object');
Interface.defineDependency('_getters', 'string_object');
Interface.defineDependency('_setters', 'string_object');

/**
 * Name.
 *
 * @var {string}
 * @api public
 */
Object.defineProperty(Interface.prototype, 'name', {
    set: function(name) { this._name = name; },
    get: function() { return this._name; }
});

/**
 * Name of the extended interface.
 *
 * @var {string}
 * @api public
 */
Object.defineProperty(Interface.prototype, 'extends', {
    set: function(extends_) { this._extends = extends_; },
    get: function() { return this._extends; }
});

/**
 * Methods.
 *
 * @var {mixed_object_object}
 * @api public
 */
Object.defineProperty(Interface.prototype, 'methods', {
    set: function(methods) { this._methods = methods; },
    get: function() { return this._methods; }
});

/**
 * Getters.
 *
 * @var {string_object}
 * @api public
 */
Object.defineProperty(Interface.prototype, 'getters', {
    set: function(getters) { this._getters = getters; },
    get: function() { return this._getters; }
});

/**
 * Setters.
 *
 * @var {string_object}
 * @api public
 */
Object.defineProperty(Interface.prototype, 'setters', {
    set: function(setters) { this._setters = setters; },
    get: function() { return this._setters; }
});

/**
 * @interface {danf:object.interface}
 */
Interface.prototype.hasMethod = function (name) {
    return this.methods.hasOwnProperty(name);
}

/**
 * @interface {danf:object.interface}
 */
Interface.prototype.getMethod = function (name) {
    if (!this.hasMethod(name)) {
        throw new Error(
            'The method "{0}" of the interface "{1}" is not defined.'.format(
                this._name,
                name
            )
        );
    }

    return this._methods[name];
}

/**
 * @interface {danf:object.interface}
 */
Interface.prototype.hasGetter = function (name) {
    return this._getters.hasOwnProperty(name);
}

/**
 * @interface {danf:object.interface}
 */
Interface.prototype.getGetter = function (name) {
    if (!this.hasGetter(name)) {
        throw new Error(
            'The getter "{0}" of the interface "{1}" is not defined.'.format(
                this._name,
                name
            )
        );
    }

    return this._getters[name];
}

/**
 * @interface {danf:object.interface}
 */
Interface.prototype.hasSetter = function (name) {
    return this._setters.hasOwnProperty(name);
}

/**
 * @interface {danf:object.interface}
 */
Interface.prototype.getSetter = function (name) {
    if (!this.hasSetter(name)) {
        throw new Error(
            'The setter "{0}" of the interface "{1}" is not defined.'.format(
                this._name,
                name
            )
        );
    }

    return this._setters[name];
}
});

define('node_modules/danf/lib/common/object/interfaces-container',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/object/interface'],function (require, exports, module) {'use strict';

/**
 * Expose `InterfacesContainer`.
 */
module.exports = InterfacesContainer;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    Interface = require('node_modules/danf/lib/common/object/interface')
;

/**
 * Initialize a new interfaces container.
 */
function InterfacesContainer() {
    this._definitions = {};
    this._interfaces = {};
}

InterfacesContainer.defineImplementedInterfaces(['danf:object.interfacesContainer', 'danf:manipulation.registryObserver']);

/**
 * @interface {danf:manipulation.registryObserver}
 */
InterfacesContainer.prototype.handleRegistryChange = function(items, reset, name) {
    if (!reset) {
        for (var id in items) {
           this.setDefinition(id, items[id]);
        }
    } else {
        for (var id in items) {
           delete this._definitions[id];
           delete this._interfaces[id];
        }
    }

    this.build();
}

/**
 * @interface {danf:object.interfacesContainer}
 */
InterfacesContainer.prototype.setDefinition = function(id, definition) {
    definition.id = id;

    this._definitions[id] = definition;
}

/**
 * @interface {danf:object.interfacesContainer}
 */
InterfacesContainer.prototype.getDefinition = function(id) {
    if (!this.hasDefinition(id)) {
        throw new Error(
            'The interface "{0}" is not defined.'.format(id)
        );
    }

    return this._definitions[id];
}

/**
 * @interface {danf:object.interfacesContainer}
 */
InterfacesContainer.prototype.hasDefinition = function(id) {
    return this._definitions[id] ? true : false;
}

/**
 * @interface {danf:object.interfacesContainer}
 */
InterfacesContainer.prototype.build = function() {
    // Build.
    for (var id in this._definitions) {
        if (!this.has(id)) {
            this._interfaces[id] = this.get(id);
        }
    }
}

/**
 * @interface {danf:object.interfacesContainer}
 */
InterfacesContainer.prototype.get = function(id) {
    if (!this.has(id)) {
        var definition = this.getDefinition(id);

        this._interfaces[id] = processInterface.call(this, definition);
    }

    return this._interfaces[id];
}

/**
 * @interface {danf:object.interfacesContainer}
 */
InterfacesContainer.prototype.has = function(id) {
    return this._interfaces[id] ? true : false;
}

/**
 * Process an interface.
 *
 * @param {object} definition The definition of the interface.
 * @return {danf:object.interface} The interface.
 * @api private
 */
var processInterface = function(definition) {
    var methods = definition.methods || {},
        getters = definition.getters || {},
        setters = definition.setters || {}
    ;

    if (definition.extends) {
        var parentInterface = processInterface.call(this, this.get(definition.extends));

        methods = utils.merge(parentInterface.methods, methods);
        getters = utils.merge(parentInterface.getters, getters);
        setters = utils.merge(parentInterface.setters, setters);
    }

    var interface_ = new Interface();

    interface_.name = definition.id;
    interface_.extends = definition.extends;
    interface_.methods = methods;
    interface_.getters = getters;
    interface_.setters = setters;

    return interface_;
}
});

define('node_modules/danf/lib/common/object/interfacer',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `Interfacer`.
 */
module.exports = Interfacer;

/**
 * Initialize a new interfacer.
 */
function Interfacer() {
    this.debug = true;
}

Interfacer.defineImplementedInterfaces(['danf:object.interfacer']);

Interfacer.defineDependency('_interfacesContainer', 'danf:object.interfacesContainer');
Interfacer.defineDependency('_debug', 'boolean');

/**
 * Whether or not the application is in debug mode.
 *
 * @var {boolean}
 * @api public
 */
Object.defineProperty(Interfacer.prototype, 'debug', {
    set: function(debug) { this._debug = debug ? true : false; }
});

/**
 * Interfaces container.
 *
 * @var {danf:object.interfacesContainer}
 * @api public
 */
Object.defineProperty(Interfacer.prototype, 'interfacesContainer', {
    set: function(interfacesContainer) { this._interfacesContainer = interfacesContainer; }
});

/**
 * @interface {danf:object.interfacer}
 */
Interfacer.prototype.addProxy = function (object, interfaceName) {
    // Prevent proxies to be added if not in debug mode because it takes performance.
    if (!this._debug) {
        return object;
    }

    return wrap.call(this, object, interfaceName);
}

/**
 * Wrap a class with a proxy to ensure the respect of the interface.
 *
 * @param {function} class_ The class function.
 * @param {string} interfaceName The name of the interface.
 * @api private
 */
var wrap = function(object, interfaceName) {
    // Check to not wrap several times.
    if (true === object.isProxy) {
        return object;
    }

    var proxy = Object.create(object),
        properties = Object.getPropertyNames(proxy)
    ;

    for (var i = 0; i < properties.length; i++) {
        var propertyName = properties[i];

        if ('__' !== propertyName.slice(0, 2)) {
            wrapMethod.call(this, object, interfaceName, proxy, propertyName);

            var interface_ = this._interfacesContainer.get(interfaceName);

            if ('function' !== typeof object[propertyName]
                && (!interface_.hasMethod(propertyName)
                    || interface_.hasGetter(propertyName)
                    || interface_.hasGetter(propertyName)
                )
            ) {
                wrapProperty.call(this, object, interfaceName, proxy, propertyName);
            }
        }
    }

    proxy.isProxy = true;

    return proxy;
}

/**
 * Wrap a method with a proxy to ensure the respect of the interface.
 *
 * @param {function} object The object.
 * @param {string} interfaceName The name of the interface.
 * @param {object} proxy The proxy.
 * @param {string} methodName The name of the method.
 * @api private
 */
var wrapMethod = function(object, interfaceName, proxy, methodName) {
    var interface_ = this._interfacesContainer.get(interfaceName),
        hasMethod = interface_.hasMethod(methodName),
        prototype = Object.getPrototypeOf(proxy),
        propertyDescriptor = Object.getPropertyDescriptor(prototype, methodName, false)
    ;

    if (undefined !== propertyDescriptor.get || undefined !== propertyDescriptor.set || 'function' !== typeof propertyDescriptor.value) {
        // The method is not a function.
        if (hasMethod) {
            throw new Error(
                'The method "{0}" defined by the interface "{1}" must be implemented{2} as a function.'.format(
                    methodName,
                    interfaceName,
                    object.__metadata && object.__metadata.id ? ' by the class of the object "{0}"'.format(object.__metadata.id) : ''
                )
            );
        }

        // This is not a method.
        return;
    }

    // The method is not one of that defined by the interface.
    if (!hasMethod) {
        proxy[methodName] = function() {
            throw new Error(
                'The method "{0}"{1} is not accessible in the scope of the interface "{2}".'.format(
                    methodName,
                    this.__metadata && this.__metadata.id ? ' of the object "{0}"'.format(this.__metadata.id) : '',
                    interfaceName
                )
            );
        };
    // The method is one of that defined by the interface.
    } else {
        var methodDefinition = interface_.getMethod(methodName);

        proxy[methodName] = function() {
            checkMethodArguments.call(this, methodName, interfaceName, methodDefinition['arguments'] || [], arguments);

            var returns = prototype[methodName].apply(prototype, arguments);

            if (methodDefinition['returns']) {
                try {
                    Object.checkType(returns, methodDefinition['returns']);
                } catch (error) {
                    if (error.instead) {
                        throw new Error(
                            'The method "{0}"{1} defined by the interface "{2}" returns {3}; {4} given instead.'.format(
                                methodName,
                                this.__metadata && this.__metadata.id ? ' of "{0}"'.format(this.__metadata.id) : '',
                                interfaceName,
                                error.expected,
                                error.instead
                            )
                        );
                    }

                    throw error;
                }
            }

            return returns;
        };
    }
}

/**
 * Wrap a getter with a proxy to ensure the respect of the interface.
 *
 * @param {function} object The class function.
 * @param {string} interfaceName The name of the interface.
 * @param {object} proxy The proxy.
 * @param {string} propertyName The name of the property.
 * @api private
 */
var wrapProperty = function(object, interfaceName, proxy, propertyName) {
    var self = this,
        prototype = Object.getPrototypeOf(proxy),
        interface_ = this._interfacesContainer.get(interfaceName),
        hasGetter = interface_.hasGetter(propertyName),
        hasSetter = interface_.hasSetter(propertyName),
        propertyDescriptor = Object.getPropertyDescriptor(prototype, propertyName, false)
    ;

    if (null === propertyDescriptor || (undefined === propertyDescriptor.get && undefined === propertyDescriptor.value && undefined === propertyDescriptor.set)) {
        // The property has no descriptor.
        if (hasGetter || hasSetter) {
            throw new Error(
                'The property "{0}" defined by the interface "{1}" must be implemented{2} with a property descriptor.'.format(
                    propertyName,
                    interfaceName,
                    object.__metadata && object.__metadata.id ? ' by the class of the object "{0}"'.format(object.__metadata.id) : ''
                )
            );
        }

        // This is a method.
        if ('function' === typeof prototype[propertyName]) {
            return;
        }
    }

    var propertyDescriptor = {configurable: true};

    if (!hasGetter) {
        propertyDescriptor.get = function() {
            throw new Error(
                'The getter of the property "{0}"{1} is not accessible in the scope of the interface "{2}".'.format(
                    propertyName,
                    this.__metadata && this.__metadata.id ? ' of the object "{0}"'.format(this.__metadata.id) : '',
                    interfaceName
                )
            );
        }

        Object.defineProperty(proxy, propertyName, propertyDescriptor);
    } else {
        var descriptor = Object.getPropertyDescriptor(prototype, propertyName),
            getterType = interface_.getGetter(propertyName)
        ;

        propertyDescriptor.get = function() {
            var value;

            if (descriptor) {
                if (descriptor.get) {
                    value = descriptor.get.call(prototype);
                } else {
                    value = descriptor.value;
                }
            }

            value = prototype[propertyName];

            try {
                Object.checkType(value, getterType);
            } catch (error) {
                if (error.instead) {
                    throw new Error(
                        'The getter "{0}"{1} defined by the interface "{2}" returns {3}; {4} given instead.'.format(
                            propertyName,
                            this.__metadata && this.__metadata.id ? ' of "{0}"'.format(this.__metadata.id) : '',
                            interfaceName,
                            error.expected,
                            error.instead
                        )
                    );
                }

                throw error;
            }

            return value;
        }

        Object.defineProperty(proxy, propertyName, propertyDescriptor);
    }

    if (!hasSetter) {
        propertyDescriptor.set = function() {
            throw new Error(
                'The setter of the property "{0}"{1} is not accessible in the scope of the interface "{2}".'.format(
                    propertyName,
                    this.__metadata && this.__metadata.id ? ' of the object "{0}"'.format(this.__metadata.id) : '',
                    interfaceName
                )
            );
        }

        Object.defineProperty(proxy, propertyName, propertyDescriptor);
    } else {
        var setterType = interface_.getSetter(propertyName);

        propertyDescriptor.set = function(value) {
            try {
                Object.checkType(value, setterType);
            } catch (error) {
                if (error.instead) {
                    throw new Error(
                        'The setter "{0}"{1} defined by the interface "{2}" takes {3}; {4} given instead.'.format(
                            propertyName,
                            this.__metadata && this.__metadata.id ? ' of "{0}"'.format(this.__metadata.id) : '',
                            interfaceName,
                            error.expected,
                            error.instead
                        )
                    );
                }

                throw error;
            }

            var descriptor = Object.getPropertyDescriptor(prototype, propertyName);

            if (descriptor) {
                if (descriptor.set) {
                    descriptor.set.call(prototype, value);
                } else {
                    descriptor.value = value;
                }
            } else {
                prototype[propertyName] = value;
            }
        }

        Object.defineProperty(proxy, propertyName, propertyDescriptor);
    }
}

/**
 * Check the arguments of a method (implementation of an interface).
 *
 * @param {String} methodName The name of the method.
 * @param {String} methodInterfaceName The name of the interface of the implemented method.
 * @param {Array} methodArgTypes The types of the arguments accepted by the method.
 * @param {Array} args The input arguments.
 * @throws {Error} if one of the argument has a wrong type.
 * @api private
 */
var checkMethodArguments = function (methodName, methodInterfaceName, methodArgTypes, args) {
    var argsNumber = methodArgTypes.length,
        minArgsNumber = 0,
        hasVariableArgsNumber = false
    ;

    for (var i = 0; i < argsNumber; i++) {
        var methodArgType = methodArgTypes[i].split('/'),
            argTypes = methodArgType[0].split('|'),
            argName = methodArgType[1] ? methodArgType[1] : '',
            optional = false
        ;

        for (var j = 0; j < argTypes.length; j++) {
            if ('undefined' === argTypes[j] || 'null' === argTypes[j]) {
                optional = true;

                break;
            }
            if (-1 !== argTypes[j].indexOf('...')) {
                hasVariableArgsNumber = true;
            }
        }

        if (!optional) {
            minArgsNumber = i + 1;
        }
    }

    if (!hasVariableArgsNumber && (minArgsNumber > args.length || argsNumber < args.length)) {
        throw new Error(
            'The method "{0}"{1} defined by the interface "{2}" takes {3} arguments; {4} given instead.'.format(
                methodName,
                this.__metadata && this.__metadata.id ? ' of "{0}"'.format(this.__metadata.id) : '',
                methodInterfaceName,
                argsNumber,
                args.length
            )
        );
    }

    var followedType = '',
        k = 0
    ;

    // Check argument types (handling variable parameters).
    for (var i = 0; i < argsNumber; i++) {
        try {
            var methodArgType = methodArgTypes[k].split('/'),
                argType = methodArgType[0],
                argName = methodArgType[1] ? methodArgType[1] : '',
                variableArgs = {}
            ;

            if (followedType) {
                argType = [argType, followedType].join('|');
                variableArgs[followedType.replace(/\.\.\./g, '')] = true;
            }

            if (-1 !== argType.indexOf('...')) {
                var argTypes = methodArgType[0].split('|');

                for (var j = 0; j < argTypes.length; j++) {
                    if (-1 !== argTypes[j].indexOf('...')) {
                        variableArgs[argTypes[j].replace(/\.\.\./g, '')] = true;
                    }
                }
            }

            var result = Object.checkType(args[i], argType.replace(/\.\.\./g, ''));

            if (result.matchedType in variableArgs) {
                var newFollowedType = '{0}...'.format(result.matchedType);

                if (newFollowedType !== followedType) {
                    followedType = newFollowedType;
                    k++;
                } else {
                    argsNumber++;
                }
            } else {
                k++;
                followedType = '';
            }
        } catch (error) {
            if (error.instead) {
                throw new Error(
                    'The method "{0}"{1} defined by the interface "{2}" takes {3} as argument {4}; {5} given instead.'.format(
                        methodName,
                        this.__metadata && this.__metadata.id ? ' of "{0}"'.format(this.__metadata.id) : '',
                        methodInterfaceName,
                        error.expected,
                        argName ? '{0} ({1})'.format(i, argName) : i,
                        error.instead
                    )
                );
            }

            throw error;
        }
    }
}
});

define('node_modules/danf/lib/common/object/class-processor/abstract',['require','exports','module','node_modules/danf/lib/common/utils'],function (require, exports, module) {'use strict';

/**
 * Expose `Abstract`.
 */
module.exports = Abstract;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils');

/**
 * Initialize a new abstract class processor.
 */
function Abstract() {
}

Abstract.defineImplementedInterfaces(['danf:object.classProcessor']);

Abstract.defineAsAbstract();

Abstract.defineDependency('_classesContainer', 'danf:object.classesContainer');

/**
 * Classes container.
 *
 * @var {danf:object.classesContainer}
 * @api public
 */
Object.defineProperty(Abstract.prototype, 'classesContainer', {
    set: function(classesContainer) { this._classesContainer = classesContainer; }
});
});

define('node_modules/danf/lib/common/object/class-processor/extender',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/object/class-processor/abstract'],function (require, exports, module) {'use strict';

/**
 * Expose `Extender`.
 */
module.exports = Extender;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    Abstract = require('node_modules/danf/lib/common/object/class-processor/abstract')
;

/**
 * Initialize a new extender class processor.
 */
function Extender() {
}

utils.extend(Abstract, Extender);

/**
 * @interface {danf:object.classProcessor}
 */
Object.defineProperty(Extender.prototype, 'order', {
    value: 1000
});

/**
 * @interface {danf:object.classProcessor}
 */
Extender.prototype.process = function (class_) {
    if (!class_.Parent) {
        var extendedClassName = class_.__metadata.extends;

        if (extendedClassName) {
            var parent = this._classesContainer.get(extendedClassName);

            this.process(parent);

            class_.Parent = parent;
            utils.extend(parent, class_);
        }
    }

    if (class_.Parent) {
        var parent = class_.Parent;

        // Inherit interfaces implementation.
        if (!class_.__metadata.implements) {
            class_.__metadata.implements = [];
        }

        var implementedInterfaces = class_.__metadata.implements.concat(parent.__metadata.implements || []),
            uniqueImplementedInterfaces = []
        ;

        for (var i = 0; i < implementedInterfaces.length; i++) {
            if (-1 == uniqueImplementedInterfaces.indexOf(implementedInterfaces[i])) {
                uniqueImplementedInterfaces.push(implementedInterfaces[i]);
            }
        }

        class_.__metadata.implements = uniqueImplementedInterfaces;

        // Inherit dependencies.
        if (!class_.__metadata.dependencies) {
            class_.__metadata.dependencies = {};
        }

        class_.__metadata.dependencies = utils.merge(
            parent.__metadata.dependencies,
            class_.__metadata.dependencies
        );
    }
}
});

define('node_modules/danf/lib/common/object/class-processor/interfacer',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/object/class-processor/abstract'],function (require, exports, module) {'use strict';

/**
 * Expose `Interfacer`.
 */
module.exports = Interfacer;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    Abstract = require('node_modules/danf/lib/common/object/class-processor/abstract')
;

/**
 * Initialize a new extender class processor.
 */
function Interfacer() {
}

utils.extend(Abstract, Interfacer);

Interfacer.defineDependency('_interfacesContainer', 'danf:object.interfacesContainer');

/**
 * Interfaces container.
 *
 * @var {danf:object.interfacesContainer}
 * @api public
 */
Object.defineProperty(Interfacer.prototype, 'interfacesContainer', {
    set: function(interfacesContainer) { this._interfacesContainer = interfacesContainer; }
});

/**
 * @interface {danf:object.classProcessor}
 */
Object.defineProperty(Interfacer.prototype, 'order', {
    value: 1200
});

/**
 * @interface {danf:object.classProcessor}
 */
Interfacer.prototype.process = function (class_) {
    var methodDeclarations = [],
        interfaceNames = '',
        self = this,
        implementedInterfaces
    ;

    // Do not check abstract classes.
    if (class_.__metadata && class_.__metadata.abstract) {
        return;
    } else if (class_.constructor && class_.constructor.__metadata.abstract) {
        return;
    }

    if (class_.__metadata) {
        implementedInterfaces = class_.__metadata.implements;
    } else if (class_.constructor) {
        implementedInterfaces = class_.constructor.__metadata.implements;
    }

    // Check that all the methods, getters and setters of the implemented interfaces are implemented
    // and add a proxy to ensure the respect of the interfaces.
    if (implementedInterfaces) {
        Object.checkType(implementedInterfaces, 'string_array');

        var interfaces = [];

        for (var i = 0; i < implementedInterfaces.length; i++) {
            var interfaceName = implementedInterfaces[i],
                interface_ = this._interfacesContainer.get(interfaceName)
            ;

            checkMethods(class_, interfaceName, interface_.methods);
            checkGetters(class_, interfaceName, interface_.getters);
            checkSetters(class_, interfaceName, interface_.setters);

            var extendedInterfaces = [];

            while (interface_.extends) {
                extendedInterfaces.push(interface_.extends);

                interface_ = this._interfacesContainer.get(interface_.extends);
            }

            interfaces = interfaces.concat(extendedInterfaces);
        }

        implementedInterfaces = implementedInterfaces.concat(interfaces);

        var uniqueImplementedInterfaces = [];

        for (var i = 0; i < implementedInterfaces.length; i++) {
            if (-1 == uniqueImplementedInterfaces.indexOf(implementedInterfaces[i])) {
                uniqueImplementedInterfaces.push(implementedInterfaces[i]);
            }
        }

        if (class_.__metadata) {
            class_.__metadata.implements = uniqueImplementedInterfaces;
        } else if (class_.constructor) {
            class_.constructor.__metadata.implements = uniqueImplementedInterfaces;
        }
    }
}

/**
 * Check the implemented methods.
 *
 * @param {function} class_ The class function.
 * @param {string} interfaceName The name of the interface.
 * @param {object} methods The definitions of the methods.
 * @api private
 */
var checkMethods = function(class_, interfaceName, methods) {
    if (methods) {
        for (var methodName in methods) {
            var methodDefinition = methods[methodName];

            if (!class_.prototype[methodName]) {
                throw new Error(
                    'The method "{0}" defined by the interface "{1}" must be implemented{2}.'.format(
                        methodName,
                        interfaceName,
                        class_.__metadata.id ? ' by the class "{0}"'.format(class_.__metadata.id) : ''
                    )
                );
            }
        }
    }
}

/**
 * Check the implemented getters.
 *
 * @param {function} class_ The class function.
 * @param {string} interfaceName The name of the interface.
 * @param {object} getters The definitions of the getters.
 * @api private
 */
var checkGetters = function(class_, interfaceName, getters) {
    if (getters) {
        for (var getterName in getters) {
            if (!Object.hasGetter(class_.prototype, getterName)) {
                throw new Error(
                    'The getter "{0}" defined by the interface "{1}" must be implemented{2}.'.format(
                        getterName,
                        interfaceName,
                        class_.__metadata.id ? ' by the class "{0}"'.format(class_.__metadata.id) : ''
                    )
                );
            }
        }
    }
}

/**
 * Check the implemented setters.
 *
 * @param {function} class_ The class function.
 * @param {string} interfaceName The name of the interface.
 * @param {object} setters The definitions of the setters.
 * @api private
 */
var checkSetters = function(class_, interfaceName, setters) {
    if (setters) {
        for (var setterName in setters) {
            if (!Object.hasSetter(class_.prototype, setterName)) {
                throw new Error(
                    'The setter "{0}" defined by the interface "{1}" must be implemented{2}.'.format(
                        setterName,
                        interfaceName,
                        class_.__metadata.id ? ' by the class "{0}"'.format(class_.__metadata.id) : ''
                    )
                );
            }
        }
    }
}
});

define('node_modules/danf/lib/common/dependency-injection/services-container',['require','exports','module','node_modules/danf/lib/common/utils'],function (require, exports, module) {'use strict';

/**
 * Expose `ServicesContainer`.
 */
module.exports = ServicesContainer;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils');

/**
 * Initialize a new services container.
 */
function ServicesContainer() {
    this._definitions = {};
    this._services = {};
    this._dependencies = {};
    this._aliases = {};
    this._config = {};
    this._finalized = false;

    this._serviceDefiners = [];
    this._serviceInstantiators = [];
    this._serviceBuilders = [];
    this._handledParameters = {};
    this._buildTree = [];
}

ServicesContainer.defineImplementedInterfaces(['danf:dependencyInjection.servicesContainer', 'danf:manipulation.registryObserver']);

ServicesContainer.defineDependency('_serviceBuilders', 'danf:dependencyInjection.serviceBuilder_array');

/**
 * @interface {danf:dependencyInjection.servicesContainer}
 */
Object.defineProperty(ServicesContainer.prototype, 'config', {
    get: function() { return this._config; },
    set: function(config) { this._config = utils.clone(config); }
});

/**
 * @interface {danf:dependencyInjection.servicesContainer}
 */
Object.defineProperty(ServicesContainer.prototype, 'handledParameters', {
    get: function() { return this._handledParameters }
});

/**
 * Add a service builder.
 *
 * @param {danf:dependencyInjection.serviceBuilder} serviceBuilder The service builder.
 * @api public
 */
ServicesContainer.prototype.addServiceBuilder = function(serviceBuilder) {
    Object.checkType(serviceBuilder, 'danf:dependencyInjection.serviceBuilder');

    var added = false,
        defineOrder = serviceBuilder.defineOrder,
        instantiateOrder = serviceBuilder.instantiateOrder
    ;

    // Register handled parameters.
    this._handledParameters = utils.merge(this._handledParameters, serviceBuilder.contract);

    // Register service definers.
    if (null != defineOrder) {
        for (var j = 0; j < this._serviceDefiners.length; j++) {
            var serviceDefiner = this._serviceDefiners[j];

            if (defineOrder < serviceDefiner.defineOrder) {
                this._serviceDefiners.splice(j, 0, serviceBuilder);
                added = true;

                break;
            }
        }

        if (!added) {
            this._serviceDefiners.push(serviceBuilder);
        }
    }

    // Register service instantiators.
    if (null != instantiateOrder) {
        added = false;

        for (var j = 0; j < this._serviceInstantiators.length; j++) {
            var serviceInstantiator = this._serviceInstantiators[j];

            if (instantiateOrder < serviceInstantiator.instantiateOrder) {
                this._serviceInstantiators.splice(j, 0, serviceBuilder);
                added = true;

                break;
            }
        }

        if (!added) {
            this._serviceInstantiators.push(serviceBuilder);
        }
    }

    // Register service builders.
    this._serviceBuilders.push(serviceBuilder);
}

/**
 * @interface {danf:manipulation.registryObserver}
 */
ServicesContainer.prototype.handleRegistryChange = function(items, reset, name) {
    items = utils.clone(items);
    this._buildTree = [];

    // Remove the services with a definition.
    for (var id in this._services) {
        if (this.hasDefinition(id)) {
            var definition = this.getDefinition(id);

            if (!definition.lock) {
                delete this._services[id];
            }
        }
    }

    if (!reset) {
        // Register all the definitions.
        for (var id in items) {
            var definition = items[id];

            definition.id = id;
            this._definitions[id] = definition;
        }

        // Check not handled definition parameters.
        for (var id in this._definitions) {
            var definition = this._definitions[id];

            for (var parameter in definition) {
                if (!(parameter in {id: true, lock: true}) && !(parameter in this._handledParameters)) {
                    throw new Error(
                        'The parameter "{0}" is not handled by any of the service builders in the definition of the service "{1}".'.format(
                            parameter,
                            id
                        )
                    );
                }
            }
        }

        // Define.
        for (var id in this._definitions) {
            this._definitions[id] = define.call(this, this._definitions[id]);
        }

        // Update the old instantiated services.
        for (var id in this._services) {
            if (this.hasDefinition(id)) {
                update.call(this, id);
            }
        }

        // Instantiate the services.
        this.build(false);
    }
}

/**
 * @interface {danf:dependencyInjection.servicesContainer}
 */
ServicesContainer.prototype.setAlias = function(alias, id) {
    this._aliases[alias] = id;
}

/**
 * @interface {danf:dependencyInjection.servicesContainer}
 */
ServicesContainer.prototype.setDefinition = function(id, definition) {
    definition.id = id;
    this._definitions[id] = define.call(this, definition);
}

/**
 * @interface {danf:dependencyInjection.servicesContainer}
 */
ServicesContainer.prototype.getDefinition = function(id) {
    if (!this.hasDefinition(id)) {
        throw new Error(
            'The service of id "{0}" does not exist.'.format(
                id
            )
        );
    }

    return this._definitions[id];
}

/**
 * @interface {danf:dependencyInjection.servicesContainer}
 */
ServicesContainer.prototype.hasDefinition = function(id) {
    return this._definitions[id] ? true : false;
}

/**
 * @interface {danf:dependencyInjection.servicesContainer}
 */
ServicesContainer.prototype.mergeDefinitions = function(parent, child) {
    var merged = utils.clone(child);

    for (var i = 0; i < this._serviceBuilders.length; i++) {
        merged = this._serviceBuilders[i].merge(parent, merged);
    }

    return merged;
}

/**
 * @interface {danf:dependencyInjection.servicesContainer}
 */
ServicesContainer.prototype.build = function(reset) {
    if (reset) {
        for (var id in this._services) {
            if (this.hasDefinition(id)) {
                delete this._services[id];
            }
        }
    }

    for (var id in this._definitions) {
        if (!this._definitions[id].abstract) {
            this.get(id);
        }
    }
}

/**
 * @interface {danf:dependencyInjection.servicesContainer}
 */
ServicesContainer.prototype.finalize = function() {
    if (!this._finalized) {
        this._finalized = true;

        for (var id in this._services) {
            if (this.hasDefinition(id)) {
                this._services[id] = finalize.call(this, id);
            }
        }
    }
}

/**
 * @interface {danf:dependencyInjection.servicesContainer}
 */
ServicesContainer.prototype.get = function(id) {
    id = this._aliases[id] ? this._aliases[id] : id;

    if (!this._services[id]) {
        for (var i = 0; i < this._buildTree.length; i++) {
            if (id === this._buildTree[i]) {
                this._buildTree.push(id);

                throw new Error(
                    'The circular dependency ["{0}"] prevent to build the service "{1}".'.format(
                        this._buildTree.join('" -> "'),
                        id
                    )
                );
            }
        }

        this._buildTree.push(id);
        this._services[id] = instantiate.call(this, id);
        this._buildTree.pop();

        if (this._finalized) {
            this._services[id] = finalize.call(this, id);
        }
    }

    return this._services[id];
}

/**
 * @interface {danf:dependencyInjection.servicesContainer}
 */
ServicesContainer.prototype.set = function(id, service) {
    if ('string' !== typeof id) {
        throw new Error(
            'The id of a service must be a "string"; "{0}" given instead.'.format(
                typeof id
            )
        );
    }

    if ('object' !== typeof service && 'function' !== typeof service) {
        throw new Error(
            'The service of id "{0}" must be an "object"; "{1}" given instead.'.format(
                id,
                typeof service
            )
        );
    }

    // Removing.
    if (null == service) {
        delete this._services[id];
    // Replacement.
    } else {
        this._services[id] = service;
    }

    // Impact the dependencies.
    var dependencies = this._dependencies[id];

    if (dependencies) {
        for (var dependencyId in dependencies) {
            var dependency = this.get(dependencyId);

            for (var propertyName in dependencies[dependencyId]) {
                var index = dependencies[dependencyId][propertyName];

                // Simple value.
                if (null === index) {
                    dependency[propertyName] = service;
                // Object value.
                } else {
                    var propertyValue = dependency[propertyName];

                    if (null == propertyValue) {
                        if ('number' === typeof index) {
                            propertyValue = [];
                        } else {
                            propertyValue = {};
                        }
                    }

                    // Removing.
                    if (null == service) {
                        if (Array.isArray(propertyValue)) {
                            propertyValue.splice(index, 1);
                        } else {
                            delete propertyValue[index];
                        }
                    // Replacement.
                    } else {
                        propertyValue[index] = service;
                    }

                    dependency[propertyName] = propertyValue;
                }
            }
        }
    }
}

/**
 * @interface {danf:dependencyInjection.servicesContainer}
 */
ServicesContainer.prototype.unset = function(id) {
    delete this._services[id];
}

/**
 * @interface {danf:dependencyInjection.servicesContainer}
 */
ServicesContainer.prototype.has = function(id) {
    return this._services[id] ? true : false;
}

/**
 * @interface {danf:dependencyInjection.servicesContainer}
 */
ServicesContainer.prototype.setDependency = function(id, dependencyId, property, index) {
    if (!this._dependencies[id]) {
        this._dependencies[id] = {};
    }
    if (!this._dependencies[id][dependencyId]) {
        this._dependencies[id][dependencyId] = {};
    }
    this._dependencies[id][dependencyId][property] = index;
}

/**
 * Define a service.
 *
 * @param {object} definition The service definition.
 * @return {object} The handled definition.
 * @api private
 */
var define = function(definition) {
    for (var i = 0; i < this._serviceDefiners.length; i++) {
        definition = this._serviceDefiners[i].define(definition);
    }

    return definition;
}

/**
 * Instantiate a service and its dependencies.
 *
 * @param {string} id
 * @return {object}
 * @api private
 */
var instantiate = function(id) {
    var definition = utils.clone(this.getDefinition(id)),
        instance = null
    ;

    for (var i = 0; i < this._serviceInstantiators.length; i++) {
        instance = this._serviceInstantiators[i].instantiate(instance, definition);
    }

    return instance;
}

/**
 * Finalize the instantiation of a service.
 *
 * @param {string} id
 * @return {object}
 * @api private
 */
var finalize = function(id) {
    var definition = utils.clone(this.getDefinition(id)),
        instance = this.get(id)
    ;

    for (var i = 0; i < this._serviceInstantiators.length; i++) {
        instance = this._serviceInstantiators[i].finalize(instance, definition);
    }

    return instance;
}

/**
 * Update an already instantiated service and its dependencies.
 *
 * @param {string} id
 * @return {object}
 * @api private
 */
var update = function(id) {
    var definition = utils.clone(this.getDefinition(id)),
        instance = this.get(id)
    ;

    for (var i = 0; i < this._serviceInstantiators.length; i++) {
        instance = this._serviceInstantiators[i].update(instance, definition);
    }

    return instance;
}

});

define('node_modules/danf/lib/common/dependency-injection/service-builder/abstract-service-builder',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `AbstractServiceBuilder`.
 */
module.exports = AbstractServiceBuilder;

/**
 * Initialize a new abstract service builder.
 */
function AbstractServiceBuilder() {
}

AbstractServiceBuilder.defineImplementedInterfaces(['danf:dependencyInjection.serviceBuilder']);

AbstractServiceBuilder.defineAsAbstract();

AbstractServiceBuilder.defineDependency('_servicesContainer', 'danf:dependencyInjection.servicesContainer');
AbstractServiceBuilder.defineDependency('_referenceResolver', 'danf:manipulation.referenceResolver');

/**
 * Services container.
 *
 * @var {danf:dependencyInjection.servicesContainer}
 * @api public
 */
Object.defineProperty(AbstractServiceBuilder.prototype, 'servicesContainer', {
    set: function(servicesContainer) {
        this._servicesContainer = servicesContainer
    }
});

/**
 * Reference resolver.
 *
 * @var {danf:manipulation.referenceResolver}
 * @api public
 */
Object.defineProperty(AbstractServiceBuilder.prototype, 'referenceResolver', {
    set: function(referenceResolver) {
        this._referenceResolver = referenceResolver
    }
});

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
Object.defineProperty(AbstractServiceBuilder.prototype, 'defineOrder', {
    get: function() { return this._defineOrder; }
});

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
Object.defineProperty(AbstractServiceBuilder.prototype, 'instantiateOrder', {
    get: function() { return this._instantiateOrder; }
});

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
AbstractServiceBuilder.prototype.define = function(service) {
    return service;
}

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
AbstractServiceBuilder.prototype.merge = function(parent, child) {
    return child;
}

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
AbstractServiceBuilder.prototype.instantiate = function(instance, definition) {
    return instance;
}

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
AbstractServiceBuilder.prototype.finalize = function(instance, definition) {
    return instance;
}


/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
AbstractServiceBuilder.prototype.update = function(instance, definition) {
    return this.instantiate(instance, definition);
}
});

define('node_modules/danf/lib/common/dependency-injection/service-builder/abstract',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/dependency-injection/service-builder/abstract-service-builder'],function (require, exports, module) {'use strict';

/**
 * Expose `Abstract`.
 */
module.exports = Abstract;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    AbstractServiceBuilder = require('node_modules/danf/lib/common/dependency-injection/service-builder/abstract-service-builder')
;

/**
 * Initialize a new abstract service builder.
 */
function Abstract() {
    AbstractServiceBuilder.call(this);

    this._instantiateOrder = 800;
}

utils.extend(AbstractServiceBuilder, Abstract);

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
Object.defineProperty(Abstract.prototype, 'contract', {
    value: {
        abstract: {
            type: 'boolean'
        }
    }
});

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
Abstract.prototype.instantiate = function(instance, definition) {
    if (definition.abstract) {
        throw new Error(
            'The service of id "{0}" is an abstract service and cannot be instantiated.'.format(
                definition.id
            )
        );
    }

    return instance;
}
});

define('node_modules/danf/lib/common/dependency-injection/service-builder/alias',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/dependency-injection/service-builder/abstract-service-builder'],function (require, exports, module) {'use strict';

/**
 * Expose `Alias`.
 */
module.exports = Alias;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    AbstractServiceBuilder = require('node_modules/danf/lib/common/dependency-injection/service-builder/abstract-service-builder')
;

/**
 * Initialize a new alias service builder.
 */
function Alias() {
    AbstractServiceBuilder.call(this);

    this._defineOrder = 600;
}

utils.extend(AbstractServiceBuilder, Alias);

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
Object.defineProperty(Alias.prototype, 'contract', {
    value: {
        alias: {
            type: 'string',
            namespace: true
        }
    }
});

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
Alias.prototype.define = function(service) {
    if (service.alias) {
        for (var parameter in service) {
            if (!(parameter in {'alias': true, 'id': true, 'lock': true, 'namespace': true})
                && undefined !== service[parameter]
            ) {
                throw new Error(
                    'The definition for "{0}" is an alias of the service "{1}" and cannot define another parameter.'.format(
                        service.id,
                        service.alias
                    )
                );
            }
        }
    }

    this._servicesContainer.setAlias(service.id, service.alias);

    return service;
}

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
Alias.prototype.merge = function(parent, child) {
    if (null == child.class) {
        child.class = parent.class;
    }

    return child;
}

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
Alias.prototype.instantiate = function(instance, definition) {
    return instance;
}
});

define('node_modules/danf/lib/common/dependency-injection/service-builder/children',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/dependency-injection/service-builder/abstract-service-builder'],function (require, exports, module) {'use strict';

/**
 * Expose `Children`.
 */
module.exports = Children;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    AbstractServiceBuilder = require('node_modules/danf/lib/common/dependency-injection/service-builder/abstract-service-builder')
;

/**
 * Initialize a new children service builder.
 */
function Children() {
    AbstractServiceBuilder.call(this);

    this._defineOrder = 1400;
}

utils.extend(AbstractServiceBuilder, Children);

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
Object.defineProperty(Children.prototype, 'contract', {
    get: function () {
        var buildRecursiveContract = function(contract, level) {
                var recursiveContract = {
                    type: 'embedded_object',
                    embed: utils.clone(contract)
                };

                if (level >= 1) {
                    recursiveContract.embed.children = buildRecursiveContract(contract, --level);
                }

                return recursiveContract;
            }
        ;

        return {
            children: function(contract) {
                var interpretedContract = {};

                for (var key in contract) {
                    if ('function' === typeof contract[key] && 'children' !== key) {
                        interpretedContract[key] = contract[key](contract);
                    } else {
                        interpretedContract[key] = contract[key];
                    }
                }

                return buildRecursiveContract(interpretedContract, 4);
            }
        };
    }
});

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
Children.prototype.define = function(service) {
    if (service.children) {
        service.abstract = true;

        if ('object' !== typeof service.children) {
            throw new Error(
                'The children parameter of the service "{0}" should be an associative array.'.format(
                    service.id
                )
            );
        }

        for (var key in service.children) {
            var child = service.children[key],
                childService = this._servicesContainer.mergeDefinitions(service, child)
            ;

            childService.declinationParent = service.id;
            childService.children = child.children;
            childService.parent = child.parent ? child.parent : service.parent;
            childService.abstract = !child.abstract ? false : true;

            this._servicesContainer.setDefinition('{0}.{1}'.format(service.id, key), childService);
        }
    }

    return service;
}
});

define('node_modules/danf/lib/common/dependency-injection/service-builder/class',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/dependency-injection/service-builder/abstract-service-builder'],function (require, exports, module) {'use strict';

/**
 * Expose `Class`.
 */
module.exports = Class;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    AbstractServiceBuilder = require('node_modules/danf/lib/common/dependency-injection/service-builder/abstract-service-builder')
;

/**
 * Initialize a new class service builder.
 */
function Class() {
    AbstractServiceBuilder.call(this);

    this._instantiateOrder = 1000;
}

utils.extend(AbstractServiceBuilder, Class);

Class.defineDependency('_classesContainer', 'danf:object.classesContainer');

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
Object.defineProperty(Class.prototype, 'contract', {
    value: {
        class: {
            type: 'string|function',
            namespace: ['string']
        }
    }
});

/**
 * Classes container.
 *
 * @var {danf:object.classesContainer}
 * @api public
 */
Object.defineProperty(Class.prototype, 'classesContainer', {
    set: function(classesContainer) { this._classesContainer = classesContainer; }
});

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
Class.prototype.merge = function(parent, child) {
    if (null == child.class) {
        child.class = parent.class;
    }

    return child;
}

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
Class.prototype.instantiate = function(instance, definition) {
    if (!definition.class) {
        throw new Error(
            'The service "{0}" should define the class parameter.'.format(
                definition.id
            )
        );
    }

    if ('string' === typeof definition.class) {
        definition.class = this._classesContainer.get(definition.class);
    }

    // Do not allow instantiation of abstract classes.
    if (definition.class.__metadata.abstract) {
        throw new Error(
            'The service "{0}" could not be instantiated because its class "{1}" is an abstract class.'.format(
                definition.id,
                definition.class.__metadata.id
            )
        );
    }

    if (null == instance) {
        instance = new definition.class();
    }

    if (undefined === instance.__metadata) {
        Object.defineProperty(instance, '__metadata', {
            get: function() { return this.__metadata__; },
            set: function(metadata) { this.__metadata__ = metadata; },
            enumerable: false
        });

        instance.__metadata = {
            id: definition.id,
            class: definition.class.__metadata.id,
            module: definition.class.__metadata.module,
            implements: definition.class.__metadata.implements || [],
            dependencies: definition.class.__metadata.dependencies || {}
        };
    }

    return instance;
}
});

define('node_modules/danf/lib/common/dependency-injection/service-builder/declinations',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/dependency-injection/service-builder/abstract-service-builder'],function (require, exports, module) {'use strict';

/**
 * Expose `Declinations`.
 */
module.exports = Declinations;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    AbstractServiceBuilder = require('node_modules/danf/lib/common/dependency-injection/service-builder/abstract-service-builder')
;

/**
 * Initialize a new declinations service builder.
 */
function Declinations() {
    AbstractServiceBuilder.call(this);

    this._defineOrder = 1200;
    this._instantiateOrder = 1400;
}

utils.extend(AbstractServiceBuilder, Declinations);

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
Object.defineProperty(Declinations.prototype, 'contract', {
    value: {
        declinations: {
            type: 'mixed'
        },
        key: {
            type: 'string|number'
        },
        declinationParent: {
            type: 'string'
        }
    }
});

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
Declinations.prototype.define = function(service) {
    if (service.declinations) {
        if (service.children) {
            throw new Error(
                'The service "{0}" cannot define both the declinations and children parameters.'.format(
                    service.id
                )
            );
        }

        service.abstract = true;

        if ('string' === typeof service.declinations) {
            service.declinations = this._referenceResolver.resolve(
                service.declinations,
                '$',
                this._servicesContainer.config,
                'the definition of the service "{0}"'.format(service.id)
            );
        }

        if ('object' !== typeof service.declinations) {
            throw new Error(
                'The declinations parameter of the service "{0}" should be an array.'.format(
                    service.id
                )
            );
        }

        for (var key in service.declinations) {
            var declination = service.declinations[key],
                declinationId = key
            ;

            if ('object' === typeof declination && !Array.isArray(declination)) {
                service.declinations[key]['_'] = key;
            }

            if (Array.isArray(declination)) {
                declinationId = declination;
            }

            if (null != service.key) {
                declinationId = this._referenceResolver.resolve(
                    service.key,
                    '@',
                    declination,
                    'the definition of the service "{0}"'.format(service.id)
                );
            }

            var declinationService = utils.clone(service);

            declinationService.declinations = null;
            declinationService.key = key;
            declinationService.abstract = false;
            declinationService.declinationParent = service.id;

            this._servicesContainer.setDefinition('{0}.{1}'.format(service.id, declinationId), declinationService);
        }
    }

    return service;
}

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
Declinations.prototype.instantiate = function(instance, definition) {
    for (var propertyName in definition.properties) {
        var propertyValue = definition.properties[propertyName];

        // References coming from the declinations.
        // Factory case.
        if (definition.declinations && !definition.abstract) {
            propertyValue = this._referenceResolver.resolve(
                propertyValue,
                '@',
                definition.declinations,
                'the definition of the service "{0}"'.format(definition.id)
            );
        }
        // Config case.
        if (definition.declinationParent) {
            var parentDefinition = this._servicesContainer.getDefinition(definition.declinationParent);

            if (parentDefinition.declinations) {
                propertyValue = this._referenceResolver.resolve(
                    propertyValue,
                    '@',
                    parentDefinition.declinations[definition.key],
                    'the definition of the service "{0}"'.format(definition.id)
                );
            }
        }

        definition.properties[propertyName] = propertyValue;
    }

    return instance;
}
});

define('node_modules/danf/lib/common/dependency-injection/service-builder/factories',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/dependency-injection/service-builder/abstract-service-builder'],function (require, exports, module) {'use strict';

/**
 * Expose `Factories`.
 */
module.exports = Factories;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    AbstractServiceBuilder = require('node_modules/danf/lib/common/dependency-injection/service-builder/abstract-service-builder')
;

/**
 * Initialize a new factories service builder.
 */
function Factories() {
    AbstractServiceBuilder.call(this);

    this._defineOrder = 1600;
    this._instantiateOrder = 1800;
}

utils.extend(AbstractServiceBuilder, Factories);

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
Object.defineProperty(Factories.prototype, 'contract', {
    get: function () {
        return {
            factories: function(contract) {
                return {
                    type: 'embedded_object',
                    embed: {
                        class: contract.class,
                        properties: contract.properties,
                        abstract: contract.abstract,
                        collections: contract.collections
                    }
                };
            }
        };
    }
});

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
Factories.prototype.define = function(service) {
    if (service.factories) {
        service.abstract = true;

        for (var factoryName in service.factories) {
            var factory = service.factories[factoryName],
                factoryServiceId = '{0}._factory.{1}'.format(service.id, factoryName)
            ;

            var factoryService = this._servicesContainer.mergeDefinitions(service, factory);

            factoryService.declinationParent = service.id;
            factoryService.factories = factory.factories;
            factoryService.parent = service.parent;
            factoryService.abstract = true;

            this._servicesContainer.setDefinition(factoryServiceId, factoryService);

            service.factories[factoryName] = factoryServiceId;
        }
    }

    return service;
}

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
Factories.prototype.merge = function(parent, child) {
    if (null == child.factories && null != parent.factories) {
        child.factories = utils.clone(parent.factories);
    }

    return child;
}

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
Factories.prototype.instantiate = function(instance, definition) {
    for (var propertyName in definition.properties) {
        var propertyValue = definition.properties[propertyName];

        if (Array.isArray(propertyValue)) {
            for (var i = 0; i < propertyValue.length; i++) {
                if ('string' === typeof propertyValue[i]) {
                    propertyValue[i] = buildServiceFromFactory.call(this, definition, propertyValue[i], '{0}.{1}'.format(propertyName, i));
                }
            }
        } else if ('string' === typeof propertyValue) {
            propertyValue = buildServiceFromFactory.call(this, definition, propertyValue, propertyName);
        }

        definition.properties[propertyName] = propertyValue;
    }

    return instance;
}

/**
 * Build a service from a factory.
 *
 * @param {string} definition The definition of the service owning the reference.
 * @param {string} source The string where the factory may occur.
 * @param {string} key The key for the service id.
 * @return {mixed} The instantiation of the service or the initial source if no factory found.
 * @api private
 */
var buildServiceFromFactory = function(definition, source, key) {
    var factory = this._referenceResolver.extract(
            source,
            '>',
            'the definition of the service "{0}"'.format(definition.id)
        )
    ;

    if (factory) {
        var serviceId = factory[0],
            factoryName = factory[1],
            declinations = factory[2]
        ;

        if (!this._servicesContainer.hasDefinition(serviceId)) {
            throw new Error(
                'The service of id "{0}" has a dependency on a not defined service "{1}".'.format(
                    definition.id,
                    serviceId
                )
            );
        }

        var serviceDefinition = this._servicesContainer.getDefinition(serviceId);

        if (!serviceDefinition.factories || !serviceDefinition.factories[factoryName]) {
            throw new Error(
                'The service of id "{0}" uses the factory "{1}" of the service "{2}" which is not defined.'.format(
                    definition.id,
                    factoryName,
                    serviceId
                )
            );
        }

        var factoryDefinition = this._servicesContainer.getDefinition(serviceDefinition.factories[factoryName]),
            manufactoredServiceDefinition = utils.clone(factoryDefinition),
            manufactoredServiceId = '{0}.{1}'.format(definition.id, key)
        ;

        // Parse optional declinations.
        if (declinations) {
            // References coming from the declinations.
            // Factory case.
            if (definition.declinations && false === definition.abstract) {
                declinations = this._referenceResolver.resolve(
                    declinations,
                    '@',
                    definition.declinations,
                    'the definition of the service "{0}"'.format(definition.id)
                );
            }
            // Config case.
            if (definition.declinationParent) {
                var parentDefinition = this._servicesContainer.getDefinition(definition.declinationParent);

                if (parentDefinition.declinations) {
                    declinations = this._referenceResolver.resolve(
                        declinations,
                        '@',
                        parentDefinition.declinations[definition.key],
                        'the definition of the service "{0}"'.format(definition.id)
                    );

                    // References coming from the config.
                    if ('object' !== typeof declinations) {
                        declinations = this._referenceResolver.resolve(
                            declinations,
                            '$',
                            this._servicesContainer.config,
                            'the definition of the service "{0}"'.format(definition.id)
                        );
                    }
                }
            }

            manufactoredServiceDefinition.declinations = declinations;
        }

        this._servicesContainer.setDefinition(manufactoredServiceId, manufactoredServiceDefinition);
        manufactoredServiceDefinition.abstract = false;

        return this._servicesContainer.get(manufactoredServiceId);
    }

    return source;
}
});

define('node_modules/danf/lib/common/dependency-injection/service-builder/parent',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/dependency-injection/service-builder/abstract-service-builder'],function (require, exports, module) {'use strict';

/**
 * Expose `Parent`.
 */
module.exports = Parent;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    AbstractServiceBuilder = require('node_modules/danf/lib/common/dependency-injection/service-builder/abstract-service-builder')
;

/**
 * Initialize a new parent service builder.
 */
function Parent() {
    AbstractServiceBuilder.call(this);

    this._defineOrder = 1000;
}

utils.extend(AbstractServiceBuilder, Parent);

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
Object.defineProperty(Parent.prototype, 'contract', {
    value:  {
        parent: {
            type: 'string'
        }
    }
});

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
Parent.prototype.define = function(service) {
    if (service.parent) {
        service = processParent.call(this, service);
        delete service.parent;
    }

    return service;
}

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
Parent.prototype.merge = function(parent, child) {
    if (null == child.class) {
        child.class = parent.class;
    }

    return child;
}

/**
 * Process the parent definitions of the definition.
 *
 * @param {object} definition The definition to process.
 * @return {object} The processed definition.
 * @api private
 */
var processParent = function(service) {
    var parent = this._servicesContainer.getDefinition(service.parent);

    if (parent.parent) {
        parent = processParent.call(this, parent);
    }

    return this._servicesContainer.mergeDefinitions(parent, service);
}
});

define('node_modules/danf/lib/common/dependency-injection/service-builder/properties',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/dependency-injection/service-builder/abstract-service-builder'],function (require, exports, module) {'use strict';

/**
 * Expose `Properties`.
 */
module.exports = Properties;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    AbstractServiceBuilder = require('node_modules/danf/lib/common/dependency-injection/service-builder/abstract-service-builder')
;

/**
 * Initialize a new properties service builder.
 */
function Properties() {
    AbstractServiceBuilder.call(this);

    this._defineOrder = 800;
    this._instantiateOrder = 2400;
}

utils.extend(AbstractServiceBuilder, Properties);

Properties.defineDependency('_interfacer', 'danf:object.interfacer');

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
Object.defineProperty(Properties.prototype, 'contract', {
    value: {
        properties: {
            type: 'mixed_object'
        }
    }
});

/**
 * Interfacer.
 *
 * @var {danf:object.interfacer}
 * @api public
 */
Object.defineProperty(Properties.prototype, 'interfacer', {
    set: function(interfacer) { this._interfacer = interfacer; }
});

/**
 * Modules tree.
 *
 * @var {danf:configuration.modulesTree}
 * @api public
 */
Object.defineProperty(Properties.prototype, 'modulesTree', {
    set: function(modulesTree) { this._modulesTree = modulesTree; }
});

/**
 * Namespacer.
 *
 * @var {danf:configuration.namespacer}
 * @api public
 */
Object.defineProperty(Properties.prototype, 'namespacer', {
    set: function(namespacer) { this._namespacer = namespacer; }
});

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
Properties.prototype.define = function(service) {
    if (!service.properties) {
        service.properties = {};
    }

    return service;
}

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
Properties.prototype.merge = function(parent, child) {
    var properties = child.properties || {};

    for (var propertyName in parent.properties) {
        if (undefined === properties[propertyName]) {
            properties[propertyName] = parent.properties[propertyName];
        }
    }

    child.properties = properties;

    return child;
}

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
Properties.prototype.instantiate = function(instance, definition) {
    for (var propertyName in definition.properties) {
        var propertyValue = definition.properties[propertyName];

        // Resolve references coming from the config.
        if ('string' === typeof propertyValue) {
            propertyValue = this._referenceResolver.resolve(
                propertyValue,
                '$',
                this._servicesContainer.config,
                'the definition of the service "{0}"'.format(definition.id)
            );
        }

        // Resolve services' references.
        if ('object' === typeof propertyValue) {
            for (var key in propertyValue) {
                if ('string' === typeof propertyValue[key]) {
                    propertyValue[key] = resolveServiceReference.call(this, definition, instance, propertyValue[key], propertyName, key);
                }
            }
        } else if ('string' === typeof propertyValue) {
            propertyValue = resolveServiceReference.call(this, definition, instance, propertyValue, propertyName);
        }

        instance[propertyName] = propertyValue;
    }

    return instance;
}

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
Properties.prototype.finalize = function(instance, definition) {
    for (var propertyName in definition.properties) {
        var propertyValue = definition.properties[propertyName],
            hasChangedValue = false
        ;

        // Resolve services' references.
        if ('object' === typeof propertyValue) {
            for (var key in propertyValue) {
                if ('string' === typeof propertyValue[key]) {
                    var value = resolveServiceReference.call(this, definition, instance, propertyValue[key], propertyName, key, true);

                    if (value !== propertyValue[key]) {
                        propertyValue[key] = value;
                        hasChangedValue = true;
                    }
                }
            }
        } else if ('string' === typeof propertyValue) {
            var value = resolveServiceReference.call(this, definition, instance, propertyValue, propertyName, null, true);

            if (value !== propertyValue) {
                propertyValue = value;
                hasChangedValue = true;
            }
        }

        if (hasChangedValue) {
            instance[propertyName] = propertyValue;
        }
    }

    // Check that all dependencies have been passed.
    Object.checkDependencies(instance);

    // Call __init method.
    if ('function' === typeof instance.__init) {
        instance.__init();
    }

    return instance;
}

/**
 * Resolve a service reference.
 *
 * @param {object} definition The definition of the service owning the reference.
 * @param {object} instance The service owning the reference.
 * @param {string} source The string where the reference may occur.
 * @param {string} property The property name.
 * @param {number|string} index The index of the property if the value of the property is an object.
 * @param {boolean} resolveRegistries Whether or not to resolve registries.
 * @return {mixed} The instantiation of the service or the initial source if no reference found.
 * @api private
 */
var resolveServiceReference = function(definition, instance, source, property, index, resolveRegistries) {
    var serviceReference = this._referenceResolver.extract(
            source,
            '#',
            'the definition of the service "{0}"'.format(definition.id)
        )
    ;

    if (serviceReference) {
        serviceReference = serviceReference[0].match(/([^\[]+)((?:\[[^\]]+\])*)/);

        var serviceId = serviceReference[1],
            serviceItem = serviceReference[2]
        ;

        if (
            (!resolveRegistries && serviceItem) ||
            (resolveRegistries && !serviceItem)
        ) {
            return source;
        }

        if (!this._servicesContainer.hasDefinition(serviceId) && !this._servicesContainer.has(serviceId)) {
            throw new Error(
                'The service of id "{0}" has a dependency on a not defined service "{1}".'.format(
                    definition.id,
                    serviceId
                )
            );
        }

        // Mark dependencies for service runtime replacement.
        this._servicesContainer.setDependency(serviceId, definition.id, property, index);

        var service = this._servicesContainer.get(serviceId),
            object = service
        ;

        // Handle case of a registry dependency.
        if (serviceItem) {
            var serviceDefinition = this._servicesContainer.getDefinition(serviceId),
                itemIndexes = serviceItem.replace(/\[([^\]]+)\]/g, '$1|_-_|').split('|_-_|')
            ;

            itemIndexes.pop();

            if (!serviceDefinition.registry) {
                throw new Error(
                    'The service of id "{0}" uses the service "{1}" as a registry whereas it is not a registry.'.format(
                        definition.id,
                        serviceId
                    )
                );
            }

            // Handle case of a namespaced item.
            if (serviceDefinition.registry.namespace) {
                var moduleId = instance.__metadata.module;

                if (moduleId) {
                    var module = this._modulesTree.get(moduleId),
                        namespace = serviceDefinition.registry.namespace
                    ;

                    if (Array.isArray(namespace)) {
                        for (var i in namespace) {
                            var index = namespace[i];

                            if (itemIndexes[index]) {
                                itemIndexes[index] = this._namespacer.prefix(itemIndexes[index], module, this._modulesTree);
                            }
                        }
                    } else {
                        for (var index in itemIndexes) {
                            itemIndexes[index] = this._namespacer.prefix(itemIndexes[index], module, this._modulesTree);
                        }
                    }
                }
            }

            object = service[serviceDefinition.registry.method].apply(service, itemIndexes);
        }

        var interfaceName;

        if (instance.__metadata) {
            var dependencies = instance.__metadata.dependencies;

            // Check for decoupled dependency.
            if (dependencies) {
                if (dependencies[property]) {
                    interfaceName = dependencies[property].type;
                } else if (dependencies['_{0}'.format(property)]) {
                    interfaceName = dependencies['_{0}'.format(property)].type;
                }
            }
        }

        if (interfaceName) {
            var types = interfaceName.split('|');

            for (var i = 0; i < types.length; i++) {
                // Add a proxy if this is a decoupled dependency.
                if (Object.isInterfaceType(types[i])) {
                    return this._interfacer.addProxy(object, interfaceName);
                }
            }
        }

        return object;
    }

    return source;
}
});

define('node_modules/danf/lib/common/dependency-injection/service-builder/collections',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/dependency-injection/service-builder/abstract-service-builder'],function (require, exports, module) {'use strict';

/**
 * Expose `Collections`.
 */
module.exports = Collections;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    AbstractServiceBuilder = require('node_modules/danf/lib/common/dependency-injection/service-builder/abstract-service-builder')
;

/**
 * Initialize a new collections service builder.
 */
function Collections() {
    AbstractServiceBuilder.call(this);

    this._defineOrder = 1800;
    this._instantiateOrder = 2000;

    this._collections = {};
}

utils.extend(AbstractServiceBuilder, Collections);

Collections.defineDependency('_interfacer', 'danf:object.interfacer');

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
Object.defineProperty(Collections.prototype, 'contract', {
    value: {
        collections: {
            type: 'string_array',
            namespace: true
        }
    }
});

/**
 * Interfacer.
 *
 * @var {danf:object.interfacer}
 * @api public
 */
Object.defineProperty(Collections.prototype, 'interfacer', {
    set: function(interfacer) { this._interfacer = interfacer; }
});

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
Collections.prototype.define = function(service) {
    if (service.collections && !service.abstract) {
        for (var i = 0; i < service.collections.length; i++) {
            var collection = service.collections[i];

            if (!this._collections[collection]) {
                this._collections[collection] = [];
            }

            var hasCollection = false;

            for (var j = 0; j < this._collections[collection].length; j++) {
                var serviceId = this._collections[collection][j];

                if (serviceId === service.id) {
                    hasCollection = true;
                }
            }

            if (!hasCollection) {
                this._collections[collection].push(service.id);
            }
        }
    }

    return service;
}

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
Collections.prototype.merge = function(parent, child) {
    if (null != parent.collections) {
        if (null == child.collections) {
            child.collections = [];
        }

        for (var i = 0; i < parent.collections.length; i++) {
            var hasCollection = false,
                parentCollection = parent.collections[i]
            ;

            for (var j = 0; j < child.collections.length; j++) {
                if (child.collections[j] === parentCollection) {
                    hasCollection = true;
                }
            }

            if (!hasCollection) {
                child.collections.push(parentCollection);
            }
        }
    }

    return child;
}

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
Collections.prototype.instantiate = function(instance, definition) {
    for (var propertyName in definition.properties) {
        var propertyValue = definition.properties[propertyName];

        if ('string' === typeof propertyValue) {
            propertyValue = resolveCollection.call(this, definition, propertyValue, propertyName);
        }

        definition.properties[propertyName] = propertyValue;
    }

    return instance;
}

/**
 * Resolve a collection.
 *
 * @param {string} id The definition of the service owning the reference.
 * @param {string} source The string where the reference may occur.
 * @param {string} property The property name.
 * @return {mixed} The instantiation of the services defining the collection.
 * @api private
 */
var resolveCollection = function(definition, source, property) {
    var collectionName = this._referenceResolver.extract(
            source,
            '&',
            'the definition of the service "{0}"'.format(definition.id)
        )
    ;

    if (collectionName) {
        var collection = this._collections[collectionName[0]];

        if (!collection) {
            return [];
        }

        var services = [],
            dependencies = definition.class.__metadata.dependencies,
            interfaceName
        ;

        if (dependencies) {
            if (dependencies[property]) {
                interfaceName = dependencies[property].type;
            } else if (dependencies['_{0}'.format(property)]) {
                interfaceName = dependencies['_{0}'.format(property)].type;
            }

            if (interfaceName) {
                interfaceName = interfaceName.replace(/(_array|_object)/g, '');
            }
        }

        for (var i = 0; i < collection.length; i++) {
            var serviceId = collection[i];

            if (this._servicesContainer.hasDefinition(serviceId)) {
                var definition = this._servicesContainer.getDefinition(serviceId);

                if (definition.abstract) {
                    continue;
                }
            }

            var service = this._servicesContainer.get(serviceId);

            service = interfaceName && Object.isInterfaceType(interfaceName)
                ? this._interfacer.addProxy(service, interfaceName)
                : service
            ;

            services.push(service);

            // Mark dependencies for service runtime replacement.
            this._servicesContainer.setDependency(serviceId, definition.id, property, services.length);
        }

        return services;
    }

    return source;
}
});

define('node_modules/danf/lib/common/dependency-injection/service-builder/registry',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/dependency-injection/service-builder/abstract-service-builder'],function (require, exports, module) {'use strict';

/**
 * Expose `Registry`.
 */
module.exports = Registry;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    AbstractServiceBuilder = require('node_modules/danf/lib/common/dependency-injection/service-builder/abstract-service-builder')
;

/**
 * Initialize a new registry service builder.
 */
function Registry() {
    AbstractServiceBuilder.call(this);

    this._instantiateOrder = 2200;
}

utils.extend(AbstractServiceBuilder, Registry);

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
Object.defineProperty(Registry.prototype, 'contract', {
    value: {
        registry: {
            type: 'embedded',
            embed: {
                method: {
                    type: 'string',
                    required: true
                },
                namespace: {
                    type: 'boolean|number_array',
                    default: false
                }
            }
        }
    }
});

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
Registry.prototype.merge = function(parent, child) {
    if (null == child.registry) {
        child.registry = parent.registry;
    }

    return child;
}

/**
 * @interface {danf:dependencyInjection.serviceBuilder}
 */
Registry.prototype.instantiate = function(instance, definition) {
    if (definition.registry) {
        var registryMethod = instance[definition.registry.method];

        if ('function' !== typeof registryMethod) {
            throw new Error(
                'The service of id "{0}" should define the registry method "{1}".'.format(
                    definition.id,
                    definition.registry.method
                )
            );
        }
    }

    return instance;
}
});

define('node_modules/danf/lib/common/configuration/section-processor',['require','exports','module','node_modules/danf/lib/common/utils'],function (require, exports, module) {'use strict';

/**
 * Expose `SectionProcessor`.
 */
module.exports = SectionProcessor;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils');

/**
 * Initialize a new section processor for the config.
 */
function SectionProcessor() {
    this._priority = false;
}

SectionProcessor.defineImplementedInterfaces(['danf:configuration.sectionProcessor']);

SectionProcessor.defineDependency('_name', 'string|null');
SectionProcessor.defineDependency('_contract', 'mixed_object|null');
SectionProcessor.defineDependency('_configurationResolver', 'danf:manipulation.dataResolver');
SectionProcessor.defineDependency('_referenceResolver', 'danf:manipulation.referenceResolver');
SectionProcessor.defineDependency('_namespacer', 'danf:configuration.namespacer');

/**
 * @interface {danf:configuration.sectionProcessor}
 */
Object.defineProperty(SectionProcessor.prototype, 'contract', {
    get: function() { return this._contract; },
    set: function(contract) { this._contract = contract; }
});

/**
 * @interface {danf:configuration.sectionProcessor}
 */
Object.defineProperty(SectionProcessor.prototype, 'name', {
    get: function() { return this._name; },
    set: function(name) {
        this._name = name;
    }
});

/**
 * @interface {danf:configuration.sectionProcessor}
 */
Object.defineProperty(SectionProcessor.prototype, 'priority', {
    get: function() { return this._priority; }
});

/**
 * Configuration resolver.
 *
 * @var {danf:manipulation.configurationResolver}
 * @api public
 */
Object.defineProperty(SectionProcessor.prototype, 'configurationResolver', {
    set: function(configurationResolver) {
        this._configurationResolver = configurationResolver;
    }
});

/**
 * Reference resolver.
 *
 * @var {danf:manipulation.referenceResolver}
 * @api public
 */
Object.defineProperty(SectionProcessor.prototype, 'referenceResolver', {
    set: function(referenceResolver) {
        this._referenceResolver = referenceResolver;
    }
});

/**
 * Namespacer.
 *
 * @param {danf:configuration.namespacer}
 * @api public
 */
Object.defineProperty(SectionProcessor.prototype, 'namespacer', {
    set: function(namespacer) {
        this._namespacer = namespacer;
    }
});

/**
 * @interface {danf:configuration.sectionProcessor}
 */
SectionProcessor.prototype.process = function(modulesTree, environment) {
    // Check the contract existence.
    if (!this.contract || 'object' !== typeof this.contract) {
        throw new Error(
            'There is no defined contract for the field "{0}".'.format(this._name)
        );
    }

    var config = {},
        level = 0,
        modules = modulesTree.getLevel(level),
        levelConfig = {}
    ;

    // Process each level.
    while (0 !== modules.length) {
        levelConfig[level] = {};

        var names = [this._name, '{0}/{1}'.format(this._name, environment)];

        for (var i = 0; i < names.length; i++) {
            var name = names[i],
                envConfig = {}
            ;

            for (var j = 0; j < modules.length; j++) {
                var module = modules[j],
                    moduleConfig = getModuleConfig(name, module, this.contract)
                ;

                if (moduleConfig) {
                    moduleConfig = processField(
                        name,
                        moduleConfig,
                        module,
                        this.contract,
                        this._configurationResolver,
                        modulesTree,
                        false
                    );

                    moduleConfig = this.interpretModuleConfig(moduleConfig, module, modulesTree);

                    envConfig = mergeConfig(
                        name,
                        envConfig,
                        moduleConfig,
                        this.contract,
                        module,
                        false,
                        this._configurationResolver,
                        modulesTree
                    );
                }
            }

            // Overwrite section config with environment section config.
            levelConfig[level] = mergeConfig(
                name,
                levelConfig[level],
                envConfig,
                this.contract,
                module,
                true,
                this._configurationResolver,
                modulesTree
            );
        }

        modules = modulesTree.getLevel(++level);
    }

    // Overwrite higher levels config with lower ones.
    for (var level in levelConfig) {
        config = mergeConfig(
            this._name,
            levelConfig[level],
            config,
            this.contract,
            module,
            true,
            this._configurationResolver,
            modulesTree
        );
    }

    // Check final merged config.
    config = processField(
        this._name,
        config,
        module,
        this.contract,
        this._configurationResolver,
        modulesTree,
        true
    );

    // Merge danf config.
    config = mergeConfig(
        this._name,
        getModuleConfig(this._name, modulesTree.getLevel(1000)[0], this.contract),
        config,
        this.contract,
        module,
        true,
        this._configurationResolver,
        modulesTree
    );

    return config;
}

/**
 * @interface {danf:configuration.sectionProcessor}
 */
SectionProcessor.prototype.preProcess = function(config, sectionConfig, modulesTree) {
    return config;
}

/**
 * @interface {danf:configuration.sectionProcessor}
 */
SectionProcessor.prototype.postProcess = function(config, sectionConfig, modulesTree) {
    return config;
}

/**
 * @interface {danf:configuration.sectionProcessor}
 */
SectionProcessor.prototype.interpretAllModuleConfig = function(config, module, modulesTree) {
    return config;
}

/**
 * Interpret the config of a module for this section.
 *
 * @param {object} config The config of the module.
 * @param {danf:configuration.module} module The module.
 * @param {danf:configuration.modulesTree} modulesTree The modules tree.
 * @return {object} The interpreted config of the module.
 * @api protected
 */
SectionProcessor.prototype.interpretModuleConfig = function(config, module, modulesTree) {
    return config;
}

/**
 * Resolve the references in the config.
 *
 * @param {string|object} config The config.
 * @param {string} delimiter The delimiter for the reference.
 * @param {object} contect The context.
 * @return {string|object} The config with resolved references.
 * @api protected
 */
SectionProcessor.prototype.resolveReferences = function(config, delimiter, context) {
    if ('object' === typeof config) {
        for (var key in config) {
            config[key] = this.resolveReferences(config[key], delimiter, context);
        }
    } else if ('string' === typeof config) {
        config = this._referenceResolver.resolve(
            config,
            delimiter,
            context
        );
    }

    return config;
}

/**
 * Get the config of the module.
 *
 * @param {string} name The name of the field.
 * @param {danf:configuration.module} module The module.
 * @param {object} contract The contract to merge the config.
 * @return {object} The config.
 * @api private
 */
var getModuleConfig = function(name, module, contract) {
    if (module.alias) {
        return {};
    }

    var config = {},
        relativeName = '',
        environment = name.split('/')[1],
        thisName = 'this'
    ;

    if (module.id === name.substr(0, module.id.length)) {
        relativeName = name.substr(module.id.length + 1);
    }

    if (environment) {
        thisName = 'this/{0}'.format(environment);
    }

    // Config in the module itself.
    if (name.split('/')[0] === module.id && module.config[thisName]) {
        config = module.config[thisName];
    // Config in a parent module.
    } else if (module.config[relativeName]) {
        config = module.config[relativeName];
    // General config
    } else if (module.config[name]) {
        config = module.config[name];
    }

    return utils.clone(config);
}

/**
 * Merge two config of the section.
 *
 * @param {string} name The name of the field.
 * @param {object} config1 The first config.
 * @param {object} config2 The second config.
 * @param {object} contract The contract to merge the config.
 * @param {danf:configuration.module} module The module.
 * @param {object} erase Should erase config1 with config2 if conflicts?
 * @param {danf:manipultation.dataInterpreter} configurationResolver The configuration resolver.
 * @param {danf:configuration.modulesTree} modulesTree The modules tree.
 * @return {object} The merged config.
 * @api private
 */
var mergeConfig = function(name, config1, config2, contract, module, erase, configurationResolver, modulesTree) {
    try {
        var mergedConfig = configurationResolver.merge(
            config1,
            config2,
            contract,
            erase,
            name,
            {module: module, modulesTree: modulesTree}
        );
    } catch (error) {
        if (error.instead) {
            throw new Error('{0} {1}.'.format(
                error.message.substr(0, error.message.length - 1),
                'in the configuration of the module "{0}"'.format(module.id)
            ));
        }

        throw error;
    }

    return mergedConfig;
}

/**
 * Process a field of the config.
 *
 * @param {string} name The name of the field.
 * @param {object} value The value of the field.
 * @param {danf:configuration.module} module The module.
 * @param {object} contract The contract to validate the field.
 * @param {danf:manipultation.dataInterpreter} configurationResolver The configuration resolver.
 * @param {danf:configuration.modulesTree} modulesTree The modules tree.
 * @param {boolean} final Whether or not it is a final merge.
 * @return {object} The processed field value.
 * @api private
 */
var processField = function(name, value, module, contract, configurationResolver, modulesTree, final) {
    try {
        var processedValue = configurationResolver.resolve(
            value,
            contract,
            name,
            {module: module, modulesTree: modulesTree, final: final}
        );
    } catch (error) {
        if (error.instead) {
            throw new Error('{0} {1}.'.format(
                error.message.substr(0, error.message.length - 1),
                'in the configuration of the module "{0}"'.format(module.id)
            ));
        }

        throw error;
    }

    return processedValue;
}
});

define('node_modules/danf/lib/common/configuration/section-processor/parameters',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/configuration/section-processor'],function (require, exports, module) {'use strict';

/**
 * Expose `Parameters`.
 */
module.exports = Parameters;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    SectionProcessor = require('node_modules/danf/lib/common/configuration/section-processor')
;

/**
 * Initialize a new section processor parameters for the config.
 */
function Parameters() {
    SectionProcessor.call(this);

    this._priority = true;
    this.contract = {
        __any: null,
        type: 'mixed',
        namespace: true
    };
}

utils.extend(SectionProcessor, Parameters);

/**
 * @interface {danf:configuration.sectionProcessor}
 */
Parameters.prototype.preProcess = function(config, sectionConfig, modulesTree) {
    return this.resolveReferences(config, '%', sectionConfig);
}

/**
 * @interface {danf:configuration.sectionProcessor}
 */
Parameters.prototype.postProcess = function(config, sectionConfig, modulesTree) {
    return this.resolveReferences(config, '%', sectionConfig, modulesTree);
}

/**
 * @interface {danf:configuration.sectionProcessor}
 */
Parameters.prototype.interpretAllModuleConfig = function(config, module, modulesTree) {
    if (undefined === module.alias) {
        config = this._namespacer.prefixReferences(config, '%', module, modulesTree);
    }

    return config;
}
});

define('node_modules/danf/lib/common/dependency-injection/configuration/section-processor/services',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/configuration/section-processor'],function (require, exports, module) {'use strict';

/**
 * Expose `Services`.
 */
module.exports = Services;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    SectionProcessor = require('node_modules/danf/lib/common/configuration/section-processor')
;

/**
 * Initialize a new section processor Services for the config.
 */
function Services() {
    SectionProcessor.call(this);
}

utils.extend(SectionProcessor, Services);

Services.defineDependency('_servicesContainer', 'danf:dependencyInjection.servicesContainer');

/**
 * @interface {danf:configuration.sectionProcessor}
 */
Object.defineProperty(Services.prototype, 'contract', {
    get: function() {
        var handledParameters = this._servicesContainer.handledParameters;

        this._contract = {
            __any: buildContract(handledParameters),
            type: 'embedded',
            namespace: true,
            references: ['#', '$', '&', '>']
        };

        return this._contract;
    },
    set: function(contract) { this._contract = contract }
});

/**
 * Notifiers.
 *
 * @var {danf:event.notifier_array}
 * @api public
 */
Object.defineProperty(Services.prototype, 'servicesContainer', {
    set: function(servicesContainer) { this._servicesContainer = servicesContainer; }
});

/**
 * Build the contract from handled parameters.
 *
 * @param {object} handledParameters The handled parameters.
 * @return {object} The contract.
 * @api private
 */
var buildContract = function(handledParameters) {
    var contract = {
            'lock': {
                type: 'boolean',
                default: false
            }
        }
    ;

    for (var key in handledParameters) {
        var parameter = handledParameters[key];

        if ('function' === typeof parameter) {
            contract[key] = parameter(handledParameters);
        } else {
            contract[key] = parameter;
        }
    }

    return contract;
}
});

define('node_modules/danf/lib/common/manipulation/registry',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `Registry`.
 */
module.exports = Registry;

/**
 * Initialize a new registry.
 */
function Registry() {
    this._items = {};
    this._name = '';
}

Registry.defineImplementedInterfaces(['danf:manipulation.registry']);

Registry.defineDependency('_name', 'string|null');

/**
 * @interface {danf:manipulation.registry}
 */
Object.defineProperty(Registry.prototype, 'name', {
    get: function() { return this._name; },
    set: function(name) { this._name = name; }
});

/**
 * @interface {danf:manipulation.registry}
 */
Registry.prototype.register = function(name, item) {
    this._items[name] = item;
}

/**
 * @interface {danf:manipulation.registry}
 */
Registry.prototype.registerSet = function(items) {
    for (var name in items) {
        this.register(name, items[name]);
    }
}

/**
 * @interface {danf:manipulation.registry}
 */
Registry.prototype.deregister = function(name) {
    if (this._items[name]) {
        delete this._items[name];
    }
}

/**
 * @interface {danf:manipulation.registry}
 */
Registry.prototype.deregisterAll = function() {
    for (var name in this._items) {
        this.deregister(name);
    }
}

/**
 * @interface {danf:manipulation.registry}
 */
Registry.prototype.has = function(name) {
    return this._items[name] ? true : false;
}

/**
 * @interface {danf:manipulation.registry}
 */
Registry.prototype.get = function(name) {
    if (!this.has(name)) {
        throw new Error(
            'The item "{0}" has not been registered {1}.'.format(
                name,
                this._name ? 'in the list of "{0}"'.format(this._name) : ''
            )
        );
    }

    return this._items[name];
}

/**
 * @interface {danf:manipulation.registry}
 */
Registry.prototype.getAll = function() {
    return this._items;
}
});

define('node_modules/danf/lib/common/manipulation/notifier-registry',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/manipulation/registry'],function (require, exports, module) {'use strict';

/**
 * Expose `NotifierRegistry`.
 */
module.exports = NotifierRegistry;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    Registry = require('node_modules/danf/lib/common/manipulation/registry')
;

/**
 * Initialize a new notifier registry.
 */
function NotifierRegistry() {
    Registry.call(this);

    this._observers = [];
    this._notify = true;
}

utils.extend(Registry, NotifierRegistry);

NotifierRegistry.defineImplementedInterfaces(['danf:manipulation.notifierRegistry']);

NotifierRegistry.defineDependency('_observers', 'danf:manipulation.registryObserver_array');

/**
 * Observers.
 *
 * @var {danf:manipulation.registryObserver_array}
 * @api public
 */
Object.defineProperty(NotifierRegistry.prototype, 'observers', {
    set: function(observers) {
        for (var i = 0; i < observers.length; i++) {
            this.addObserver(observers[i]);
        }
    }
});

/**
 * @interface {danf:manipulation.notifierRegistry}
 */
NotifierRegistry.prototype.addObserver = function(observer) {
    for (var i = 0; i < this._observers.length; i++) {
        // Check if the observer is already observing.
        if (observer === this._observers[i]) {
            return;
        }
    }

    this._observers.push(observer);
}

/**
 * @interface {danf:manipulation.notifierRegistry}
 */
NotifierRegistry.prototype.removeObserver = function(observer) {
    for (var i = 0; i < this._observers.length; i++) {
        if (observer === this._observers[i]) {
            this._observers.splice(i, 1);

            return;
        }
    }
}

/**
 * @interface {danf:manipulation.notifierRegistry}
 */
NotifierRegistry.prototype.removeAllObservers = function() {
    this._observers = [];
}

/**
 * @interface {danf:manipulation.registry}
 */
NotifierRegistry.prototype.register = function(name, item) {
    this._items[name] = item;

    if (this._notify) {
        var items = {};

        items[name] = item;
        notify.call(this, items, false);
    }
}

/**
 * @interface {danf:manipulation.registry}
 */
NotifierRegistry.prototype.registerSet = function(items) {
    this._notify = false;

    for (var name in items) {
        this.register(name, items[name]);
    }

    notify.call(this, items, false);

    this._notify = true;
}

/**
 * @interface {danf:manipulation.registry}
 */
NotifierRegistry.prototype.deregister = function(name) {
    var item = this._items[name];

    if (item) {
        delete this._items[name];

        if (this._notify) {
            var items = {};

            items[name] = item;
            notify.call(this, items, true);
        }
    }
}

/**
 * @interface {danf:manipulation.registry}
 */
NotifierRegistry.prototype.deregisterAll = function() {
    this._notify = false;

    var items = {};

    for (var key in this._items) {
        items[key] = this._items[key];
    }

    for (var name in items) {
        this.deregister(name);
    }

    notify.call(this, items, true);

    this._notify = true;
}

/**
 * Notify the observers.
 *
 * @param {danf:manipulation.registryObserver_array}
 * @api public
 */
var notify = function(items, reset) {
    for (var i = 0; i < this._observers.length; i++) {
        this._observers[i].handleRegistryChange(items, reset, this._name);
    }
}
});

define('node_modules/danf/lib/common/manipulation/data-resolver',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `DataResolver`.
 */
module.exports = DataResolver;

/**
 * Initialize a new data resolver.
 */
function DataResolver() {
    this._dataInterpreters = [];
}

DataResolver.defineImplementedInterfaces(['danf:manipulation.dataResolver']);

DataResolver.defineDependency('_dataInterpreters', 'danf:manipulation.dataInterpreter_array');

/**
 * Data interpreters.
 *
 * @var {danf:manipulation.dataInterpreter_array}
 * @api public
 */
Object.defineProperty(DataResolver.prototype, 'dataInterpreters', {
    set: function(dataInterpreters) {
        this._dataInterpreters = [];

        for (var i = 0; i < dataInterpreters.length; i++) {
            this.addDataInterpreter(dataInterpreters[i]);
        }
    }
});

/**
 * Add a data interpreter.
 *
 * @param {danf:manipulation.dataInterpreter} newDataInterpreter The data interpreter.
 * @api public
 */
DataResolver.prototype.addDataInterpreter = function(newDataInterpreter) {
    var added = false,
        order = newDataInterpreter.order
    ;

    newDataInterpreter.dataResolver = this;

    // Register service definers.
    for (var i = 0; i < this._dataInterpreters.length; i++) {
        var dataInterpreter = this._dataInterpreters[i];

        if (order < dataInterpreter.order) {
            this._dataInterpreters.splice(i, 0, newDataInterpreter);
            added = true;

            break;
        }
    }

    if (!added) {
        this._dataInterpreters.push(newDataInterpreter);
    }
}

/**
 * @interface {danf:manipulation.dataResolver}
 */
DataResolver.prototype.merge = function(data1, data2, contract, erase, namespace, parameters, isRoot) {
    return mergeData.call(
        this,
        namespace ? namespace : '',
        data1,
        data2,
        isRoot === false ? contract : formatContract.call(this, contract),
        erase,
        parameters || {}
    );
}

/**
 * @interface {danf:manipulation.dataResolver}
 */
DataResolver.prototype.resolve = function(data, contract, namespace, parameters, isRoot) {
    return processField.call(
        this,
        namespace ? namespace : '',
        data,
        isRoot === false ? contract : formatContract.call(this, contract),
        parameters || {}
    );
}

/**
 * Format a contract.
 *
 * @param {object} contract The contract.
 * @return {object} The formatted contract.
 * @api private
 */
var formatContract = function(contract) {
    for (var i = 0; i < this._dataInterpreters.length; i++) {
        contract = this._dataInterpreters[i].formatContract(contract);
    }

    return contract;
}

/**
 * Merge two data.
 *
 * @param {string} name The name of the field.
 * @param {object} data1 The first data.
 * @param {object} data2 The second data.
 * @param {object} contract The contract to merge the data.
 * @param {object} erase Should erase data1 with data2 if conflicts?
 * @param {object|null} parameters The additional parameters used for the resolving.
 * @return {object} The merged data.
 * @api private
 */
var mergeData = function(name, data1, data2, contract, erase, parameters) {
    var mergedData = mergeField.call(
        this,
        name,
        data1,
        data2,
        contract,
        erase,
        parameters
    );

    for (var field in data2) {
        if (undefined === mergedData[field]) {
            mergedData[field] = data2[field];
        }
    }

    return mergedData;
}

/**
 * Merge a field.
 *
 * @param {string} name The name of the field.
 * @param {object} value1 The first value.
 * @param {object} value2 The second value.
 * @param {object} contract The contract to merge the field.
 * @param {object} erase Should erase value1 with value2 if conflicts?
 * @param {object|null} parameters The additional parameters used for the resolving.
 * @return {object} The merged field.
 * @throws {error} If there is some conflicts and erase is false.
 * @api private
 */
var mergeField = function(name, value1, value2, contract, erase, parameters) {
    var value;

    for (var i = 0; i < this._dataInterpreters.length; i++) {
        value = this._dataInterpreters[i].merge(
            name,
            value,
            value1,
            value2,
            contract,
            erase,
            parameters
        );
    }

    return value;
}

/**
 * Process a field.
 *
 * @param {string} name The name of the field.
 * @param {object} value The value of the field.
 * @param {object} contract The contract to validate the field.
 * @param {object|null} parameters The additional parameters used for the resolving.
 * @return {object} The processed field value.
 * @api private
 */
var processField = function(name, value, contract, parameters) {
    // Check the contract existence for the field.
    if (!contract) {
        throw new Error(
            'There is no defined contract for the field "{0}".'.format(
                name
            )
        );
    } else if ('object' !== typeof contract) {
        throw new Error(
            'The contract of the field "{0}" must be an object.'.format(
                name
            )
        );
    }

    for (var i = 0; i < this._dataInterpreters.length; i++) {
        value = this._dataInterpreters[i].interpret(name, value, contract, parameters);
    }

    return value;
}
});

define('node_modules/danf/lib/common/manipulation/data-interpreter/abstract',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `Abstract`.
 */
module.exports = Abstract;

/**
 * Initialize a new abstract data interpreter.
 */
function Abstract() {
}

Abstract.defineImplementedInterfaces(['danf:manipulation.dataInterpreter']);

Abstract.defineAsAbstract();

/**
 * Data resolver.
 *
 * @var {danf:manipulation.dataResolver}
 * @api public
 */
Object.defineProperty(Abstract.prototype, 'dataResolver', {
    set: function(dataResolver) {
        this._dataResolver = dataResolver
    }
});

/**
 * @interface {danf:manipulation.dataInterpreter}
 */
Abstract.prototype.formatContract = function(contract) {
    return contract;
}

/**
 * @interface {danf:manipulation.dataInterpreter}
 */
Abstract.prototype.merge = function(name, value, value1, value2, contract, erase, parameters) {
    return value;
}

/**
 * @interface {danf:manipulation.dataInterpreter}
 */
Abstract.prototype.interpret = function(name, value, contract, parameters) {
    return value;
}
});

define('node_modules/danf/lib/common/manipulation/data-interpreter/default',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/manipulation/data-interpreter/abstract'],function (require, exports, module) {'use strict';

/**
 * Expose `Default`.
 */
module.exports = Default;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    Abstract = require('node_modules/danf/lib/common/manipulation/data-interpreter/abstract')
;

/**
 * Initialize a new default data interpreter.
 */
function Default() {
}

utils.extend(Abstract, Default);

/**
 * @interface {danf:manipulation.dataInterpreter}
 */
Object.defineProperty(Default.prototype, 'order', {
    value: 1000
});

/**
 * @interface {danf:manipulation.dataInterpreter}
 */
Default.prototype.interpret = function(name, value, contract, parameters) {
    // Set the default value of the field if defined and no given value.
    if (
        (parameters.final || undefined === parameters.final) &&
        null == value &&
        undefined !== contract.default
    ) {
        value = contract.default;
    }

    return value;
}
});

define('node_modules/danf/lib/common/manipulation/data-interpreter/required',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/manipulation/data-interpreter/abstract'],function (require, exports, module) {'use strict';

/**
 * Expose `Required`.
 */
module.exports = Required;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    Abstract = require('node_modules/danf/lib/common/manipulation/data-interpreter/abstract')
;

/**
 * Initialize a new required data interpreter.
 */
function Required() {
}

utils.extend(Abstract, Required);

/**
 * @interface {danf:manipulation.dataInterpreter}
 */
Object.defineProperty(Required.prototype, 'order', {
    value: 1400
});

/**
 * @interface {danf:manipulation.dataInterpreter}
 */
Required.prototype.interpret = function(name, value, contract, parameters) {
    // Check the required state of the field if no given value.
    if (
        (parameters.final || undefined === parameters.final) &&
        null == value &&
        contract.required
    ) {
        throw new Error(
            'The value is required for the field "{0}".'.format(
                name
            )
        );
    }

    return value;
}
});

define('node_modules/danf/lib/common/configuration/manipulation/data-interpreter/abstract-namespacer',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/manipulation/data-interpreter/abstract'],function (require, exports, module) {'use strict';

/**
 * Expose `AbstractNamespacer`.
 */
module.exports = AbstractNamespacer;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    Abstract = require('node_modules/danf/lib/common/manipulation/data-interpreter/abstract')
;

/**
 * Initialize a new section interpreter abstract namespacer for the config.
 */
function AbstractNamespacer() {
    Abstract.call(this);
}

AbstractNamespacer.defineAsAbstract();

AbstractNamespacer.defineDependency('_namespacer', 'danf:configuration.namespacer');

utils.extend(Abstract, AbstractNamespacer);

/**
 * Namespacer.
 *
 * @var {danf:configuration.namespacer}
 * @api public
 */
Object.defineProperty(AbstractNamespacer.prototype, 'namespacer', {
    set: function(namespacer) {
        this._namespacer = namespacer;
    }
});

/**
 * @interface {danf:manipulation.dataInterpreter}
 */
Object.defineProperty(AbstractNamespacer.prototype, 'contract', {
    value: {
        __any: {
            methods: {
                type: 'embedded_object',
                embed: {
                    arguments: {
                        type: 'string_object',
                        default: []
                    },
                    returns: {
                        type: 'string'
                    }
                }
            },
            getters: {
                type: 'string_object'
            },
            setters: {
                type: 'string_object'
            }
        },
        type: 'embedded'
    }
});
});

define('node_modules/danf/lib/common/configuration/manipulation/data-interpreter/references',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/configuration/manipulation/data-interpreter/abstract-namespacer'],function (require, exports, module) {'use strict';

/**
 * Expose `References`.
 */
module.exports = References;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    Abstract = require('node_modules/danf/lib/common/configuration/manipulation/data-interpreter/abstract-namespacer')
;

/**
 * Initialize a new section interpreter references for the config.
 */
function References() {
    Abstract.call(this);
}

utils.extend(Abstract, References);

/**
 * @interface {danf:manipulation.dataInterpreter}
 */
Object.defineProperty(References.prototype, 'handles', {
    value: 'References'
});

/**
 * @interface {danf:manipulation.dataInterpreter}
 */
Object.defineProperty(References.prototype, 'order', {
    value: 1500
});

/**
 * @interface {danf:manipulation.dataInterpreter}
 */
References.prototype.interpret = function(name, value, contract, parameters) {
    if (null != contract.references) {
        Object.checkType(contract.references, 'string_array');
    }

    // Prefix the references with the namespace.
    if (null != value && contract.references) {
        for (var i = 0; i < contract.references.length; i++) {
            value = this._namespacer.prefixReferences(
                value,
                contract.references[i],
                parameters.module,
                parameters.modulesTree
            );
        }
    }

    return value;
}
});

define('node_modules/danf/lib/common/configuration/manipulation/data-interpreter/namespace',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/configuration/manipulation/data-interpreter/abstract-namespacer'],function (require, exports, module) {'use strict';

/**
 * Expose `Namespace`.
 */
module.exports = Namespace;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    Abstract = require('node_modules/danf/lib/common/configuration/manipulation/data-interpreter/abstract-namespacer')
;

/**
 * Initialize a new section interpreter namespace for the config.
 */
function Namespace() {
    Abstract.call(this);
}

utils.extend(Abstract, Namespace);

/**
 * @interface {danf:manipulation.dataInterpreter}
 */
Object.defineProperty(Namespace.prototype, 'handles', {
    value: 'namespace'
});

/**
 * @interface {danf:manipulation.dataInterpreter}
 */
Object.defineProperty(Namespace.prototype, 'order', {
    value: 1500
});

/**
 * @interface {danf:manipulation.dataInterpreter}
 */
Namespace.prototype.interpret = function(name, value, contract, parameters) {
    if (null != contract.namespace) {
        Object.checkType(contract.namespace, 'boolean|string_array');
    }

    // Prefix with the namespace.
    if (null != value && contract.namespace) {
        var namespace = contract.namespace,
            processValue = true
        ;

        if (Array.isArray(namespace)) {
            var type = Object.getType(value);

            processValue = false;

            for (var i = 0; i < namespace.length; i++) {
                if (type === namespace[i]) {
                    processValue = true;
                }

                if ('object' === namespace[i]) {
                    namespace = true;
                }
            }
        }

        if (processValue) {
            if (
                true === namespace &&
                'object' === typeof value &&
                !Array.isArray(value) &&
                !(value instanceof Date)
            ) {
                for (var key in value) {
                    var prefixedKey = this._namespacer.prefix(key, parameters.module, parameters.modulesTree);

                    if (key !== prefixedKey) {
                        value[prefixedKey] = value[key];
                        delete value[key];
                    }
                }
            } else {
                value = prefixStrings.call(this, value, parameters.module, parameters.modulesTree, true);
            }

            if (true !== namespace || contract.namespace.length > 1) {
                value = prefixStrings.call(this, value, parameters.module, parameters.modulesTree, true);
            }
        }
    }

    // Check for individual fields needing to be prefixed.
    value = prefixStrings.call(this, value, parameters.module, parameters.modulesTree, false);

    return value;
}

/**
 * Prefix the strings in a value.
 *
 * @param mixed value The value.
 * @param boolean prefixAll Force the prefixing of all strings.
 * @param {danf:configuration.module} dependency The dependency module.
 * @param {danf:configuration.modulesTree} modulesTree The modules tree.
 * @return mixed The value with prefixed strings.
 * @api private
 */
var prefixStrings = function(value, module, modulesTree, prefixAll) {
    if (
        'string' === typeof value &&
        (prefixAll || '[-]' === value.substr(0, 3))
    ) {
        value = this._namespacer.prefix(
            prefixAll ? value : value.substr(3),
            module,
            modulesTree
        );
    } else if ('object' === typeof value) {
        for (var key in value) {
            value[key] = prefixStrings.call(this, value[key], module, modulesTree, prefixAll);
        }
    }

    return value;
}
});

define('node_modules/danf/lib/common/configuration/mod',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `Module`.
 */
module.exports = Module;

/**
 * Initialize a new module.
 */
function Module() {
    this._id = '';
    this._alias;
    this._level = [];
    this._contract = {};
    this._config = {};
    this._dependencies = {};
}

Module.defineImplementedInterfaces(['danf:configuration.module']);

/**
 * @interface {danf:configuration.module}
 */
Object.defineProperty(Module.prototype, 'id', {
    get: function() { return this._id; },
    set: function(id) { this._id = id; }
});

/**
 * @interface {danf:configuration.module}
 */
Object.defineProperty(Module.prototype, 'alias', {
    get: function() { return this._alias; },
    set: function(alias) { this._alias = alias; }
});

/**
 * @interface {danf:configuration.module}
 */
Object.defineProperty(Module.prototype, 'level', {
    get: function() { return this._level; },
    set: function(level) { this._level = level; }
});

/**
 * @interface {danf:configuration.module}
 */
Object.defineProperty(Module.prototype, 'contract', {
    get: function() { return this._contract; },
    set: function(contract) {
        if (!contract) {
            contract = {};
        }

        this._contract = contract; }
});

/**
 * @interface {danf:configuration.module}
 */
Object.defineProperty(Module.prototype, 'config', {
    get: function() { return this._config; },
    set: function(config) {
        if (!config) {
            config = {};
        }

        this._config = config;
    }
});

/**
 * @interface {danf:configuration.module}
 */
Object.defineProperty(Module.prototype, 'parent', {
    get: function() { return this._parent; },
    set: function(parent) { this._parent = parent; }
});

/**
 * @interface {danf:configuration.module}
 */
Object.defineProperty(Module.prototype, 'dependencies', {
    get: function() { return this._dependencies; },
    set: function(dependencies) { this._dependencies = dependencies; }
});

/**
 * @interface {danf:configuration.module}
 */
Module.prototype.setDependency = function(alias, dependency) {
    if (!(dependency instanceof Module) && 'string' !== typeof dependency) {
        throw new Error('A dependency must be a "Module" or an alias of another module.');
    }

    this._dependencies[alias] = dependency;
}
});

define('node_modules/danf/lib/common/configuration/modules-tree',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/configuration/mod'],function (require, exports, module) {'use strict';

/**
 * Expose `ModulesTree`.
 */
module.exports = ModulesTree;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    Module = require('node_modules/danf/lib/common/configuration/mod')
;

/**
 * Initialize a new modules tree for the configuration.
 */
function ModulesTree() {
    this._root = {};
}

ModulesTree.defineImplementedInterfaces(['danf:configuration.modulesTree']);

ModulesTree.defineDependency('_appName', 'string');

/**
 * @interface {danf:configuration.modulesTree}
 */
Object.defineProperty(ModulesTree.prototype, 'appName', {
    get: function() { return this._appName; },
    set: function(appName) { this._appName = appName; }
});

/**
 * @interface {danf:configuration.modulesTree}
 */
ModulesTree.prototype.build = function(root, danf) {
    var danfModule = new Module(),
        rootModule = buildBranch(root, this._appName, 0)
    ;
    danfModule.id = 'danf';
    danfModule.config = danf;
    danfModule.level = 1000;

    danfModule.setDependency(
        this._appName,
        replaceAliases.call(this, rootModule)
    );

    this._root = danfModule;
}

/**
 * @interface {danf:configuration.modulesTree}
 */
ModulesTree.prototype.getRoot = function() {
    return this._root;
}

/**
 * @interface {danf:configuration.modulesTree}
 */
ModulesTree.prototype.get = function(id) {
    return get(this._root, id);
}

/**
 * @interface {danf:configuration.modulesTree}
 */
ModulesTree.prototype.getLevel = function(level) {
    return getLevel(this._root, level);
}

/**
 * @interface {danf:configuration.modulesTree}
 */
ModulesTree.prototype.getFlat = function(inversed) {
    return getFlat(this._root, inversed);
}

/**
 * @interface {danf:configuration.modulesTree}
 */
ModulesTree.prototype.getChild = function(module, relativeId) {
    if (!relativeId) {
        return module;
    }

    return getChild.call(this, module, relativeId.split(':'));
}

/**
 * Build a branch.
 *
 * @param {danf:configuration.module} module A danf module.
 * @param {string} id The id of the branch.
 * @return {object} The branch.
 * @api private
 */
var buildBranch = function(module, id, level, parent, overriddenDependencies) {
    var dependencies = utils.clone(module.dependencies),
        mod = new Module()
    ;

    mod.id = id;
    mod.config = module.config;
    mod.contract = module.contract;
    mod.level = level;
    if (undefined !== parent) {
        mod.parent = parent.id;
    }

    if (undefined !== dependencies) {
        if ('object' !== typeof dependencies) {
            throw new Error(
                'The parameter "dependencies" of a danf configuration file must be an object.'
            );
        }

        for (var dependencyAlias in dependencies) {
            var dependency = dependencies[dependencyAlias];

            if ('string' === typeof dependency) {
                dependencies[dependencyAlias] = '{0}:{1}'.format(id, dependency);
            }
        }

        if (undefined !== overriddenDependencies) {
            for (var dependencyAlias in overriddenDependencies) {
                if (-1 !== dependencyAlias.indexOf(':')) {
                    if (undefined === dependencies[dependencyAlias]) {
                        throw new Error(
                            'You try to override a non-existent dependency "{0}" in the module "{1}".'.format(
                                dependencyAlias,
                                id
                            )
                        );
                    }
                }

                dependencies[dependencyAlias] = overriddenDependencies[dependencyAlias];
            }
        }

        var modOverriddenDependencies = {};

        for (var dependencyAlias in dependencies) {
            var index = dependencyAlias.indexOf(':');

            if (-1 !== index) {
                var aliasPrefix = dependencyAlias.substr(0, index),
                    aliasSuffix = dependencyAlias.substring(index + 1)
                ;

                if (undefined === modOverriddenDependencies[aliasPrefix]) {
                    modOverriddenDependencies[aliasPrefix] = {}
                }

                if ('string' !== typeof dependencies[dependencyAlias]) {
                    throw new Error(
                        'You have to specify the name of another module to override the dependency "{0}" in the module "{1}".'.format(
                            dependencyAlias,
                            id
                        )
                    );
                }

                modOverriddenDependencies[aliasPrefix][aliasSuffix] = dependencies[dependencyAlias];
            }
        }

        for (var dependencyAlias in dependencies) {
            var aliasPrefix = dependencyAlias.split(':')[0],
                dependencyId = '{0}:{1}'.format(id, dependencyAlias)
            ;

            if ('string' !== typeof dependencies[dependencyAlias]) {
                mod.setDependency(
                    dependencyId,
                    buildBranch(
                        dependencies[dependencyAlias],
                        dependencyId,
                        level + 1,
                        mod,
                        modOverriddenDependencies[aliasPrefix]
                    )
                );
            } else if (
                undefined === modOverriddenDependencies[aliasPrefix]
                || aliasPrefix === dependencyAlias
            ) {
                mod.setDependency(
                    dependencyId,
                    dependencies[dependencyAlias]
                );
            }
        }
    } else if (undefined !== overriddenDependencies) {
        for (var dependencyAlias in overriddenDependencies) {
            throw new Error(
                'You try to override a non-existent dependency "{0}" in the module "{1}".'.format(
                    dependencyAlias,
                    id
                )
            );
        }
    }

    return mod;
}

/**
 * Replace the aliases.
 *
 * @param {danf:configuration.module} module A danf module.
 * @return {danf:configuration.module} The module with replaced aliases.
 * @api private
 */
var replaceAliases = function(module) {
    for (var dependencyId in module.dependencies) {
        var dependency = module.dependencies[dependencyId];

        if ('string' === typeof dependency) {
            var moduleDependency = new Module();
            moduleDependency.id = dependencyId;
            moduleDependency.alias = dependency;

            dependency = moduleDependency;
        }

        module.dependencies[dependencyId] = replaceAliases.call(this, dependency);
    }

    return module;
}

/**
 * Get a module from its id.
 *
 * @param {danf:configuration.module} module A danf module.
 * @param {string} id The id of the module.
 * @return {danf:configuration.module} The module.
 * @api private
 */
var get = function(module, id) {
    if (module.id === id) {
        return module;
    }

    for (var dependencyId in module.dependencies) {
        var dependency = module.dependencies[dependencyId];

        if (undefined === dependency.alias) {
            var dependencyModule = get(dependency, id);

            if (dependencyModule instanceof Module) {
                return dependencyModule;
            }
        }
    }

    throw new Error('No module "{0}" found.'.format(id));
}

/**
 * Get the modules with no hierarchy ordered by level.
 *
 * @param {danf:configuration.module} module A danf module.
 * @param {boolean} Inversed order?
 * @return {danf:configuration.module_array} The modules with no hierarchy.
 * @api private
 */
var getFlat = function(module, inversed) {
    var modules = [],
        level = -1,
        levelModules = [module]
    ;

    while (0 !== levelModules.length) {
        if (inversed) {
            modules = levelModules.concat(modules);
        } else {
            modules = modules.concat(levelModules);
        }

        level++;
        levelModules = getLevel(module, level);
    }

    return modules;
}

/**
 * Get the modules of a level.
 *
 * @param {danf:configuration.module} module A danf module.
 * @param {number} level A level of definition.
 * @return {danf:configuration.module_array} The modules of the level.
 * @api private
 */
var getLevel = function(module, level) {
    var modules = [];

    if (module.level === level) {
        modules.push(module);
    }

    for (var alias in module.dependencies) {
        var dependency = module.dependencies[alias];

        modules = modules.concat(getLevel(dependency, level));
    }

    return modules;
}

/**
 * Get the child module of another module from its relative id.
 *
 * @param {danf:configuration.module} module The module.
 * @param {string} relativeId The child module id relative to the module.
 * @return {danf:configuration.module} The child module.
 * @api private
 */
var getChild = function(module, relativeId) {
    var id = relativeId.shift();

    if (!id) {
        return module;
    }

    var idLength = module.id.length + 1,
        child
    ;

    for (var alias in module.dependencies) {
        if (id === alias.substr(idLength)) {
            var dependency = module.dependencies[alias];

            // Alias case.
            if (dependency.alias) {
                child = this.get(dependency.alias);
            // Standard case.
            } else {
                child = dependency;
            }
        }
    }

    if (!child) {
        throw new Error(
            'No child module "{0}" found for the module "{1}".'.format(
                id,
                module.id
            )
        );
    }

    return getChild.call(this, child, relativeId);
}
});

define('node_modules/danf/lib/common/configuration/namespacer',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `Namespacer`.
 */
module.exports = Namespacer;

/**
 * Initialize a new namespacer.
 */
function Namespacer() {
    this._referenceTypes = {};
}

Namespacer.defineImplementedInterfaces(['danf:configuration.namespacer']);

Namespacer.defineDependency('_referenceTypes', 'danf:manipulation.referenceType_object');

/**
 * Reference types.
 *
 * @var {danf:manipulation.referenceType_object}
 * @api public
 */
Object.defineProperty(Namespacer.prototype, 'referenceTypes', {
    set: function(referenceTypes) {
        this._referenceTypes = {};

        for (var i = 0; i < referenceTypes.length; i++) {
            this.addReferenceType(referenceTypes[i]);
        }
    }
});

/**
 * Add a reference type.
 *
 * @param {danf:manipulation.referenceType} referenceType The reference type.
 * @api public
 */
Namespacer.prototype.addReferenceType = function(referenceType) {
    this._referenceTypes[referenceType.name] = referenceType;
}

/**
 * Get the reference type.
 *
 * @param {string} type The reference type identifier.
 * @return {danf:manipulation.referenceType} The reference type object.
 * @api protected
 */
Namespacer.prototype.getReferenceType = function(type) {
    if (this._referenceTypes[type]) {
        return this._referenceTypes[type];
    }

    throw new Error(
        'The reference type "{0}" is not defined.'.format(type)
    );
}

/**
 * @interface {danf:configuration.namespacer}
 */
Namespacer.prototype.prefix = function (source, module, modulesTree) {
    var appNamespace = '{0}:'.format(modulesTree.appName),
        danfNamespace = 'danf:'
    ;

    if (
        // Already namespaced.
        source.substr(0, appNamespace.length) !== appNamespace
        // Danf framework.
        && source.substr(0, danfNamespace.length) !== danfNamespace
    ) {
        var namespacePos = source.lastIndexOf(':'),
            namespace = ''
        ;

        if (-1 !== namespacePos) {
            namespace = source.substr(0, namespacePos);
            source = source.substr(namespacePos + 1);
        }

        var child = modulesTree.getChild(module, namespace),
            prefix = child.alias ? child.alias : child.id
        ;


        if ('' === source) {
            source = prefix;
        } else {
            source = '{0}:{1}'.format(
                prefix,
                source
            );
        }
    }

    return source;
}

/**
 * @interface {danf:configuration.namespacer}
 */
Namespacer.prototype.prefixReferences = function (source, type, module, modulesTree) {
    var referenceType = this.getReferenceType(type);

    if ('object' === typeof source) {
        for (var key in source) {
            source[key] = this.prefixReferences(source[key], type, module, modulesTree);
        }
    } else if ('string' === typeof source) {
        var delimiter = referenceType.delimiter,
            namespace = referenceType.namespace,
            splitSource = source.split(delimiter)
        ;

        if (referenceType.size >= 2) {
            if (source.length >= 2 &&
                delimiter === source.substring(0, 1) &&
                delimiter === source.substring(source.length - 1)
            ) {
                var namespaceLength = namespace.length;

                for (var j = 0; j < namespace.length; j++) {
                    var i = namespace[j];

                    splitSource[i + 1] = this.prefix(splitSource[i + 1], module, modulesTree);
                }
            }
        } else {
            var length = splitSource.length,
                offset = 0
            ;

            for (var i = 0; i < length - 1; i++) {
                // References of the source.
                if (1 === (i + offset) % 2 && '' !== splitSource[i]) {
                    // Does not interpret it as a reference if there is a white space inside.
                    if (-1 === splitSource[i].indexOf(' ')) {
                        if (0 === namespace[0]) {
                            splitSource[i] = this.prefix(splitSource[i], module, modulesTree);
                        }
                    } else {
                        offset++;
                    }
                }
            }
        }

        source = splitSource.join(delimiter);
    }

    return source;
}
});

define('node_modules/danf/lib/common/manipulation/data-interpreter/type',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/manipulation/data-interpreter/abstract'],function (require, exports, module) {'use strict';

/**
 * Expose `Type`.
 */
module.exports = Type;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    Abstract = require('node_modules/danf/lib/common/manipulation/data-interpreter/abstract')
;

/**
 * Initialize a new type data interpreter.
 */
function Type() {
}

utils.extend(Abstract, Type);

/**
 * @interface {danf:manipulation.dataInterpreter}
 */
Object.defineProperty(Type.prototype, 'order', {
    value: 1600
});

/**
 * @interface {danf:manipulation.dataInterpreter}
 */
Type.prototype.formatContract = function(contract) {
    if ('object' !== typeof contract) {
        throw new Error('The contract must be an object.');
    }

    var formattedContract = {};

    // "__any" field means a "*_object" instead of a standard "embedded" for the root.
    if (undefined !== contract['__any']) {
        formattedContract = 'embedded' === contract.type || !contract.type
            ? { type: 'embedded_object', embed: contract['__any'] }
            : 'embedded_array' === contract.type
                ? { type: 'embedded_array_object', embed: contract['__any'] }
                : { type: '{0}_object'.format(contract.type) }
        ;

        formattedContract = utils.merge(contract, formattedContract);
    } else {
        formattedContract = {type: 'embedded', embed: contract};
    }

    return formattedContract;
}

/**
 * @interface {danf:manipulation.dataInterpreter}
 */
Type.prototype.merge = function(name, value, value1, value2, contract, erase, parameters) {
    var inConflict = false;

    if (undefined === value1 && undefined === value2) {
        return;
    }

    var type = contract.type;

    if (-1 !== type.indexOf('|')) {
        if (null == value2) {
            type = Object.getType(value1);
        } else {
            type = Object.getType(value2);

            if (!erase && null != value1 && type !== Object.getType(value1)) {
                inConflict = true;
            }
        }
    }

    if (!inConflict) {
        switch (type) {
            case 'string':
            case 'number':
            case 'boolean':
            case 'function':
            case 'date':
            case 'regexp':
            case 'error':
            case 'array':
            case 'undefined':
            case 'null':
            case 'string_array':
            case 'number_array':
            case 'boolean_array':
            case 'function_array':
            case 'date_array':
            case 'regexp_array':
            case 'error_array':
            case 'string_array_array':
            case 'number_array_array':
            case 'boolean_array_array':
            case 'function_array_array':
            case 'date_array_array':
            case 'regexp_array_array':
            case 'error_array_array':
            case 'mixed_array_array':
            case 'string_object_array':
            case 'number_object_array':
            case 'boolean_object_array':
            case 'function_object_array':
            case 'date_object_array':
            case 'regexp_object_array':
            case 'error_object_array':
            case 'mixed_object_array':
            case 'embedded_array':
                if (undefined !== value1 && undefined !== value2) {
                    if (erase || value1 == value2) {
                        value = value2;
                    } else {
                        inConflict = true;
                    }
                } else if (undefined !== value1) {
                    value = value1;
                } else {
                    value = value2;
                }

                break;
            case 'object':
            case 'number_object':
            case 'string_object':
            case 'boolean_object':
            case 'function_object':
            case 'date_object':
            case 'regexp_object':
            case 'error_object':
            case 'mixed_object':
            case 'number_array_object':
            case 'string_array_object':
            case 'boolean_array_object':
            case 'function_array_object':
            case 'date_array_object':
            case 'regexp_array_object':
            case 'error_array_object':
            case 'mixed_array_object':
            case 'number_object_object':
            case 'string_object_object':
            case 'boolean_object_object':
            case 'function_object_object':
            case 'date_object_object':
            case 'regexp_object_object':
            case 'error_object_object':
            case 'mixed_object_object':
                var hasValue = false;
                value = {};

                if (value1) {
                    for (var key in value1) {
                        if (value2 && value2[key]) {
                            if (erase) {
                                value[key] = value2[key];
                            } else {
                                inConflict = true;
                            }
                        } else {
                            value[key] = value1[key];
                        }

                        hasValue = true;
                    }
                }

                if (value2) {
                    for (var key in value2) {
                        if (undefined === value[key]) {
                            value[key] = value2[key];

                            hasValue = true;
                        }
                    }
                }

                if (!hasValue && !value1 && !value2) {
                    value = null;
                }

                break;
            case 'embedded':
                var hasValue = false;
                value = {};

                for (var key in contract.embed) {
                    value[key] = this._dataResolver.merge(
                        (value1 === undefined ? value1 : value1[key]),
                        (value2 === undefined ? value2 : value2[key]),
                        contract.embed[key],
                        erase,
                        formatFieldName(name, key),
                        parameters,
                        false
                    );

                    if (null == value[key]) {
                        delete value[key];
                    }

                    hasValue = true;
                }

                if (!hasValue && !value1 && !value2) {
                    value = null;
                }

                break;
            case 'embedded_object':
                var hasValue = false;
                value = {};

                for (var mixedKey in value1) {
                    var item = value1[mixedKey];

                    value[mixedKey] = {};

                    for (var key in contract.embed) {
                        value[mixedKey][key] = item[key];
                    }

                    hasValue = true;
                }

                for (var mixedKey in value2) {
                    var item = value2[mixedKey];

                    if (!value[mixedKey]) {
                       value[mixedKey] = {};
                    }

                    for (var key in contract.embed) {
                        value[mixedKey][key] = this._dataResolver.merge(
                            value[mixedKey][key],
                            value2[mixedKey][key],
                            contract.embed[key],
                            erase,
                            formatFieldName(name, mixedKey, key),
                            parameters,
                            false
                        );
                    }

                    hasValue = true;
                }

                if (!hasValue && !value1 && !value2) {
                    value = null;
                }

                break;
            case 'embedded_array_object':
                var hasValue = false;
                value = {};

                for (var mixedKey in value1) {
                    value[mixedKey] = value1[mixedKey];

                    hasValue = true;
                }

                for (var mixedKey in value2) {
                    if (value2[mixedKey]) {
                        if (value[mixedKey] && !erase) {
                            inConflict = true;
                        } else {
                            value[mixedKey] = value2[mixedKey];
                        }
                    }

                    hasValue = true;
                }

                if (!hasValue && !value1 && !value2) {
                    value = null;
                }

                break;
            case 'mixed':
                if (erase || value1 == value2) {
                    value = value2;

                    if (undefined === value) {
                        value = value1;
                    }
                } else if (undefined === value1) {
                    value = value2;
                } else if (undefined === value2) {
                    value = value1;
                } else {
                    inConflict = true;
                }

                break;
        }
    }

    if (inConflict) {
        throw new Error(
            'You cannot merge the value "{0}" with the value "{1}" for the field "{2}".'.format(
                JSON.stringify(value1),
                JSON.stringify(value2),
                name
            )
        );
    }

    return value;
}

/**
 * @interface {danf:manipulation.dataInterpreter}
 */
Type.prototype.interpret = function(name, value, contract, parameters) {
    // Check the existence of the mandatory type parameter for the field.
    if (!contract.type) {
        throw new Error(
            'There is no parameter "type" defined for the contract of the field "{0}".'.format(
                name
            )
        );
    }

    if (null != value) {
        if ('string' !== typeof contract.type) {
            throw new Error(
                'The parameter "type" defined for the contract of the field "{0}" must be a "string".'.format(
                    name
                )
            );
        }

        switch (contract.type) {
            case 'embedded':
            case 'embedded_array':
            case 'embedded_object':
            case 'embedded_array_object':
                if (!contract.embed) {
                    throw new Error(
                        'The contract for the embedded field "{0}" must have an "embed" parameter.'.format(
                            name
                        )
                    );
                }

                switch (contract.type) {
                    case 'embedded':
                        if ('object' !== typeof value) {
                            throw new Error(
                                'The expected value for "{0}" is an "object"; {1} given instead.'.format(
                                    name,
                                    Object.getTypeString(value, true)
                                )
                            );
                        }

                        for (var key in value) {
                            if (undefined === contract.embed[key]) {
                                throw new Error(
                                    'The embedded field "{0}" is not defined in the contract of the field "{1}".'.format(
                                        key,
                                        name
                                    )
                                );
                            }
                        }

                        for (var key in contract.embed) {
                            value[key] = this._dataResolver.resolve(
                                value[key],
                                contract.embed[key],
                                formatFieldName(name, key),
                                parameters,
                                false
                            );

                            if (undefined === value[key]) {
                                delete value[key];
                            }
                        }

                        break;
                    case 'embedded_array':
                        if (!Array.isArray(value)) {
                            throw new Error(
                                'The expected value for "{0}" is an "array"; {1} given instead.'.format(
                                    name,
                                    Object.getTypeString(value, true)
                                )
                            );
                        }

                        for (var index = 0; index < value.length; index++) {
                            var item = value[index];

                            if ('object' !== typeof item) {
                                throw new Error(
                                    'The expected value for "{0}" is an "array of objects"; {1} was found in the array `{2}`.'.format(
                                        name,
                                        Object.getTypeString(item, true),
                                        JSON.stringify(value)
                                    )
                                );
                            }

                            for (var key in item) {
                                if (undefined === contract.embed[key]) {
                                    throw new Error(
                                        'The embedded field "{0}" is not defined in the contract of the field "{1}".'.format(
                                            key,
                                            formatFieldName(name, index)
                                        )
                                    );
                                }
                            }

                            for (var key in contract.embed) {
                                item[key] = this._dataResolver.resolve(
                                    item[key],
                                    contract.embed[key],
                                    '{0}[{1}].{2}'.format(name, index, key),
                                    parameters,
                                    false
                                );
                            }
                        }

                        break;
                    case 'embedded_object':
                        if ('object' !== typeof value) {
                            throw new Error(
                                'The expected value for "{0}" is an "object"; {1} given instead.'.format(
                                    name,
                                    Object.getTypeString(value, true)
                                )
                            );
                        }

                        for (var mixedKey in value) {
                            var item = value[mixedKey];

                            if ('object' !== typeof item) {
                                throw new Error(
                                    'The expected value for "{0}" is an "object of object properties"; {1} was found in the object `{2}`.'.format(
                                        name,
                                        Object.getTypeString(item, true),
                                        JSON.stringify(value)
                                    )
                                );
                            }

                            for (var key in item) {
                                if (undefined === contract.embed[key]) {
                                    throw new Error(
                                        'The embedded field "{0}" is not defined in the contract of the field "{1}".'.format(
                                            key,
                                            formatFieldName(name, mixedKey)
                                        )
                                    );
                                }
                            }

                            for (var key in contract.embed) {
                                item[key] = this._dataResolver.resolve(
                                    item[key],
                                    contract.embed[key],
                                    formatFieldName(name, mixedKey, key),
                                    parameters,
                                    false
                                );
                            }
                        }

                        break;
                    case 'embedded_array_object':
                        if ('object' !== typeof value) {
                            throw new Error(
                                'The expected value for "{0}" is an "object"; {1} given instead.'.format(
                                    name,
                                    Object.getTypeString(value, true)
                                )
                            );
                        }

                        for (var mixedKey in value) {
                            var item = value[mixedKey];

                            if (!Array.isArray(item)) {
                                throw new Error(
                                    'The expected value for "{0}" is an "object of array properties"; {1} was found in the object `{2}`.'.format(
                                        name,
                                        Object.getTypeString(item, true),
                                        JSON.stringify(value)
                                    )
                                );
                            }

                            for (var index = 0; index < item.length; index++) {
                                var embeddedItem = item[index];

                                if ('object' !== typeof embeddedItem) {
                                    throw new Error(
                                        'The expected value for "{0}" is an "object of arrays of object properties"; {1} was found in the array `{2}` of the object `{3}`.'.format(
                                            name,
                                            Object.getTypeString(embeddedItem, true),
                                            JSON.stringify(item),
                                            JSON.stringify(value)
                                        )
                                    );
                                }

                                for (var key in embeddedItem) {
                                    if (undefined === contract.embed[key]) {
                                        throw new Error(
                                            'The embedded field "{0}" is not defined in the contract of the field "{1}".'.format(
                                                key,
                                                formatFieldName(name, mixedKey, index)
                                            )
                                        );
                                    }
                                }

                                for (var key in contract.embed) {
                                    embeddedItem[key] = this._dataResolver.resolve(
                                        embeddedItem[key],
                                        contract.embed[key],
                                        formatFieldName(name, mixedKey, index, key),
                                        parameters,
                                        false
                                    );
                                }
                            }
                        }

                        break;
                }

                break;
            default:
                var type = contract.type;

                try {
                    var results = Object.checkType(value, contract.type, true, name);

                    type = results.matchedType;
                    value = results.interpretedValue;
                } catch (error) {
                    if (null == error.expected || -1 === error.expected.indexOf('interface')) {
                        throw error;
                    }
                }

                switch (type) {
                    case 'string':
                    case 'number':
                    case 'boolean':
                    case 'function':
                    case 'date':
                    case 'regexp':
                    case 'error':
                    case 'mixed':
                    case 'array':
                    case 'object':
                    case 'undefined':
                    case 'null':
                    case 'string_array':
                    case 'number_array':
                    case 'boolean_array':
                    case 'function_array':
                    case 'date_array':
                    case 'regexp_array':
                    case 'error_array':
                    case 'mixed_array':
                    case 'string_array_array':
                    case 'number_array_array':
                    case 'boolean_array_array':
                    case 'function_array_array':
                    case 'date_array_array':
                    case 'regexp_array_array':
                    case 'error_array_array':
                    case 'mixed_array_array':
                    case 'string_object_array':
                    case 'number_object_array':
                    case 'boolean_object_array':
                    case 'function_object_array':
                    case 'date_object_array':
                    case 'regexp_object_array':
                    case 'error_object_array':
                    case 'mixed_object_array':
                    case 'number_object':
                    case 'string_object':
                    case 'boolean_object':
                    case 'function_object':
                    case 'date_object':
                    case 'regexp_object':
                    case 'error_object':
                    case 'mixed_object':
                    case 'number_array_object':
                    case 'string_array_object':
                    case 'boolean_array_object':
                    case 'function_array_object':
                    case 'date_array_object':
                    case 'regexp_array_object':
                    case 'error_array_object':
                    case 'mixed_array_object':
                    case 'number_object_object':
                    case 'string_object_object':
                    case 'boolean_object_object':
                    case 'function_object_object':
                    case 'date_object_object':
                    case 'regexp_object_object':
                    case 'error_object_object':
                    case 'mixed_object_object':
                        break;
                    default:
                        throw new Error(
                            'The type "{0}" defined for the field "{1}" does not exist.'.format(
                                contract.type,
                                name
                            )
                        );
                }
        }
    }

    return value;
}

/**
 * Format the name of a field.
 *
 * @param {string} name The name of the field.
 * @param {string} params The other names in each next argument.
 * @api private
 */
var formatFieldName = function(name) {
    var formattedName = name || '',
        keys = Array.prototype.slice.call(arguments)
    ;

    keys.shift();

    for (var i = 0; i < keys.length; i++) {
        if ('' === formattedName) {
            formattedName = keys.shift();
        } else {
            formattedName = '{0}.{1}'.format(formattedName, keys[i]);
        }
    }

    return formattedName;
}
});

define('node_modules/danf/lib/common/manipulation/reference-resolver',['require','exports','module','node_modules/danf/lib/common/utils'],function (require, exports, module) {'use strict';

/**
 * Expose `ReferenceResolver`.
 */
module.exports = ReferenceResolver;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils');

/**
 * Initialize a new reference resolver.
 */
function ReferenceResolver() {
    this._referenceTypes = {};
}

ReferenceResolver.defineImplementedInterfaces(['danf:manipulation.referenceResolver']);

ReferenceResolver.defineDependency('_referenceTypes', 'danf:manipulation.referenceType_object');

/**
 * Reference types.
 *
 * @var {danf:manipulation.referenceType_object}
 * @api public
 */
Object.defineProperty(ReferenceResolver.prototype, 'referenceTypes', {
    set: function(referenceTypes) {
        this._referenceTypes = {};

        for (var i = 0; i < referenceTypes.length; i++) {
            this.addReferenceType(referenceTypes[i]);
        }
    }
});

/**
 * Add a reference type.
 *
 * @param {danf:manipulation.referenceType} referenceType The reference type.
 * @api public
 */
ReferenceResolver.prototype.addReferenceType = function(referenceType) {
    this._referenceTypes[referenceType.name] = referenceType;
}

/**
 * Get the reference type.
 *
 * @param {string} referenceType The reference type.
 * @api protected
 */
ReferenceResolver.prototype.getReferenceType = function(type) {
    if (this._referenceTypes[type]) {
        return this._referenceTypes[type];
    }

    throw new Error(
        'The reference type "{0}" is not defined.'.format(type)
    );
}

/**
 * @interface {danf:manipulation.referenceResolver}
 */
ReferenceResolver.prototype.extract = function(source, type, inText) {
    var referenceType = this.getReferenceType(type),
        delimiter = referenceType.delimiter
    ;

    if (referenceType.allowsConcatenation) {
        throw new Error(
            'The reference of the source "{0}"{1} cannot be extracted because the type "{2}" allows concatenation.'.format(
                source,
                inText ? ' declared in {0}'.format(inText) : '',
                type
            )
        );
    }

    if (source.length >= 2 &&
        delimiter === source.substring(0, 1) &&
        delimiter === source.substring(source.length - 1)
    ) {
        var extraction = source.substring(1, source.length - 1).split(delimiter);

        if (extraction.length <= referenceType.size) {
            // Complete undefined values.
            for (var i = 0; i < referenceType.size; i++) {
                if (undefined === extraction[i]) {
                    extraction[i] = '';
                }
            };

            return extraction;
        } else if (extraction.length > referenceType.size) {
            throw new Error(
                'The reference of the source "{0}"{1} cannot be extracted because the type "{2}" define a size of "{3}" which is inferior to the size of the found reference ({4}).'.format(
                    source,
                    inText ? ' declared in {0}'.format(inText) : '',
                    type,
                    referenceType.size,
                    extraction.length
                )
            );
        }
    }

    return;
}

/**
 * @interface {danf:manipulation.referenceResolver}
 */
ReferenceResolver.prototype.resolve = function(source, type, context, inText) {
    var referenceType = this.getReferenceType(type),
        delimiter = referenceType.delimiter,
        splitSource = source.split(
            new RegExp('{0}(?!\\\\)'.format(delimiter.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')), 'g')
        ),
        length = splitSource.length
    ;

    if (referenceType.size !== 1) {
        throw new Error(
            'The references in source "{0}"{1} cannot be resolved because the size of the type "{2}" is greater than 1.'.format(
                source,
                inText ? ' declared in {0}'.format(inText) : '',
                type
            )
        );
    }

    if (length <= 2) {
        return source;
    }

    var references = [],
        isArray = false,
        concatenate = !(
            delimiter === source.substring(0, 1) &&
            delimiter === source.substring(source.length - 1) &&
            3 === length
        )
    ;

    // This is not a concatenation.
    if (!concatenate) {
        var resolvedReferences = resolveReferences([splitSource[1]], context, true);

        if (resolvedReferences && Array.isArray(resolvedReferences.items) && 1 === resolvedReferences.items.length) {
            return resolvedReferences.items[0];
        }

        throw new Error(
            'The reference "{0}{1}{0}" in source "{2}"{3} cannot be resolved in the context "{4}".'.format(
                delimiter,
                splitSource[1],
                source,
                inText ? ' declared in {0}'.format(inText) : '',
                JSON.stringify(context)
            )
        );
    // This is a concatenation.
    } else if (referenceType.allowsConcatenation) {
        var independentReferences = {},
            contextReferences = [],
            offset = 0
        ;

        // Resolve independent and context references.
        for (var i = 0; i < length - 1; i++) {
            // References of the source.
            if (1 === (i + offset) % 2 && '' !== splitSource[i]) {
                // Does not interpret it as a reference if there is a white space inside.
                if (-1 === splitSource[i].indexOf(' ')) {
                    if (
                        '`' === splitSource[i].substring(0, 1) &&
                        '`' === splitSource[i].substring(splitSource[i].length - 1)
                    ) {
                        var independentSource = splitSource[i].substring(1, splitSource[i].length - 1),
                            independentResolvedReferences = resolveReferences([independentSource], context)
                        ;

                        if (undefined === independentResolvedReferences) {
                            throw new Error(
                                'The reference "{0}{1}{0}" in source "{2}"{3} cannot be resolved.'.format(
                                    delimiter,
                                    splitSource[i],
                                    source,
                                    inText ? ' declared in {0}'.format(inText) : ''
                                )
                            );
                        }

                        isArray = (isArray || independentResolvedReferences.isArray);
                        independentReferences[i] = [];

                        for (var j = 0; j < independentResolvedReferences.items.length; j++) {
                            independentReferences[i].push(independentResolvedReferences.items[j][0]);
                        }
                    } else {
                        contextReferences[i] = splitSource[i];
                    }
                } else {
                    offset++;
                }
            }
        }

        if (0 === contextReferences.length && 0 === independentReferences.length) {
                return source;
        }

        // Merge context and independant references.
        var resolvedReferences = resolveReferences(contextReferences, context),
            mergedReferences = []
        ;

        if (undefined === resolvedReferences) {
            var realReferences = [];

            for (var index = 0; index < contextReferences.length; index++) {
                if (contextReferences[index]) {
                    realReferences.push(contextReferences[index]);
                }
            }

            throw new Error(
                'One of the references "{0}{1}{0}" in source "{2}"{3} cannot be resolved.'.format(
                    delimiter,
                    realReferences.join('{0}", "{0}'.format(delimiter)),
                    source,
                    inText ? ' declared in {0}'.format(inText) : ''
                )
            );
        }

        isArray = (isArray || resolvedReferences.isArray);

        // Merge independent references.
        if (0 !== independentReferences.length) {
            var independentReferencesProduct = [];

            for (var key in independentReferences) {
                if (0 === independentReferencesProduct.length) {
                    for (var j = 0; j < independentReferences[key].length; j++) {
                        var independentReference = {};

                        independentReference[key] = independentReferences[key][j];
                        independentReferencesProduct.push(independentReference);
                    }
                } else {
                    var independentReferencesMiddleProduct = [];

                    for (var j = 0; j < independentReferences[key].length; j++) {
                        for (var k = 0; k < independentReferencesProduct.length; k++) {
                            var independentReference = utils.clone(independentReferencesProduct[k]);

                            independentReference[key] = independentReferences[key][j];
                            independentReferencesMiddleProduct.push(independentReference);
                        }
                    }

                    independentReferencesProduct = independentReferencesMiddleProduct;
                }
            }

            for (var j = 0; j < independentReferencesProduct.length; j++) {
                var mergedReference = [];

                for (var index = 0; index < splitSource.length; index++) {
                    mergedReference[index] = independentReferencesProduct[j][index];
                }

                mergedReferences.push(mergedReference);
            }
        }

        // There are context references only.
        if (0 === mergedReferences.length) {
            mergedReferences = resolvedReferences.items;
        // Merge independent and context references.
        } else if (0 !== contextReferences.length) {
            var contextReferences = resolvedReferences.items,
                referencesProduct = []
            ;

            for (var i = 0; i < mergedReferences.length; i++) {
                for (var j = 0; j < contextReferences.length; j++) {
                    var mergedReference = [],
                        length = Math.max(mergedReferences[i].length, contextReferences[j].length)
                    ;

                    for (var k = 0; k < length; k++) {
                        if (undefined !== mergedReferences[i][k]) {
                            mergedReference[k] = mergedReferences[i][k];
                        } else {
                            mergedReference[k] = contextReferences[j][k];
                        }
                    }

                    referencesProduct.push(mergedReference);
                }
            }

            mergedReferences = referencesProduct;
        }

        var offset = 0;

        // Split and concatenate references.
        for (var i = 0; i < length; i++) {
            var isReference = true;

            // References of the source.
            if (i < length - 1 && 1 === (i + offset) % 2 && '' !== splitSource[i]) {
                // Does not interpret it as a reference if there is a white space inside.
                if (-1 === splitSource[i].indexOf(' ')) {
                    // Concatenate to the other parts of the source.
                    var referencesArray = [];

                    for (var index in mergedReferences) {
                        var reference = mergedReferences[index][i],
                            isBuilt = mergedReferences.length === references.length
                        ;

                        for (var key in references) {
                            if (!isBuilt || key === index) {
                                referencesArray[index] = references[key] + reference;
                            }
                        }
                    }

                    references = referencesArray;
                } else {
                    offset++;
                    isReference = false;
                }
            }

            // Other parts of the source (references of reference and other parts).
            if (i >= length - 1 || 1 !== (i + offset) % 2 || '' === splitSource[i]) {
                var sourcePart = 1 !== (i + offset) % 2 ? splitSource[i] : delimiter;
                // Source part contain a white space.
                sourcePart = !isReference ? delimiter + splitSource[i] : sourcePart;
                // Last part of the source.
                sourcePart = i >= length - 1 && 1 === (i + offset) % 2 ? sourcePart + splitSource[i] : sourcePart;

                if (0 === references.length) {
                    references.push(sourcePart);
                } else {
                    for (var index = 0; index < references.length; index++) {
                        references[index] += sourcePart;
                    }
                }
            }
        }

        if (!isArray && 1 === references.length) {
            return references[0];
        }

        return references;
    }

    throw new Error(
        'The references in source "{0}"{1} cannot be resolved because the type "{2}" does not allow concatenation.'.format(
            source,
            inText ? ' declared in {0}'.format(inText) : '',
            type
        )
    );
}

/**
 * Resolve references for a context.
 *
 * @param {Array} references The references.
 * @param {Object} context The context.
 * @param {Boolean} simple Is this a simple reference?
 * @return {Array} The resolved reference.
 * @api private
 */
var resolveReferences = function(references, context, simple) {
    var referencesTree = { branch: {} };

    for (var i = 0; i < references.length; i++) {
        var reference = references[i];

        if (null != reference) {
            var splitReference = '.' !== reference ? reference.split('.') : ['.'],
                branch = referencesTree
            ;

            for (var j = 0; j < splitReference.length; j++) {
                if (!branch.branch[splitReference[j]]) {
                    branch.branch[splitReference[j]] = { branch: {} };
                }

                branch = branch.branch[splitReference[j]];
            }

            if (!Array.isArray(branch.references)) {
                branch.references = [];
            }
            branch.references.push(i);
        }
    }

    return resolveBranchReferences(referencesTree, context, simple);
}

/**
 * Resolve references of a branch for a context.
 *
 * @param {Array} branch A branch of references.
 * @param {Object} context The context.
 * @param {Boolean} simple Is this a simple reference?
 * @return {Array} The resolved references.
 * @api private
 */
var resolveBranchReferences = function(branch, context, simple) {
    var references = { items: [], isArray: false },
        branchesReferences = { items: [], isArray: false },
        branchKeyReferences = {}
    ;

    // Fill the references.
    if (Array.isArray(branch.references)) {
        if (simple) {
            if (undefined !== context) {
                for (var i = 0; i < branch.references.length; i++) {
                    references.items[branch.references[i]] = context;
                    references.isArray = 'object' === typeof context;
                }
            } else {
                return;
            }
        } else {
            if ('object' === typeof context) {
                for (var key in context) {
                    if (Array.isArray(context[key])) {
                        for (var i = 0; i < context[key].length; i++) {
                            var branchReferences = [];

                            for (var j = 0; j < branch.references.length; j++) {
                                branchReferences[branch.references[j]] = context[key][i];
                            }

                            references.items.push(branchReferences);
                        }
                    } else {
                        var branchReferences = [];

                        for (var i = 0; i < branch.references.length; i++) {
                            if ('object' === typeof context[key] && !Array.isArray(context[key])) {
                                branchReferences[branch.references[i]] = key;
                            } else {
                                branchReferences[branch.references[i]] = context[key];
                            }
                        }

                        references.items.push(branchReferences);
                    }

                    references.isArray = true;
                }
            } else if (undefined !== context) {
                var branchReferences = [];

                for (var i = 0; i < branch.references.length; i++) {
                    branchReferences[branch.references[i]] = context;
                }

                references.items.push(branchReferences);
            } else {
                return;
            }
        }
    }

    // Check and merge references for the branches.
    for (var propertyName in branch.branch) {
        if ('.' === propertyName) {
            var branchReferences = resolveBranchBranchesReferences(
                context,
                branch.branch[propertyName],
                simple
            );

            // Cannot resolve the references.
            if (undefined === branchReferences) {
                return;
            }

            branchesReferences = mergeBranchReferences(branchesReferences, branchReferences);
        }
        else if (undefined !== context[propertyName]) {
            var branchReferences = resolveBranchBranchesReferences(
                context[propertyName],
                branch.branch[propertyName],
                simple
            );

            // Cannot resolve the references.
            if (undefined === branchReferences) {
                return;
            }

            branchesReferences = mergeBranchReferences(branchesReferences, branchReferences);
        } else if ('object' === typeof context) {
            var hasReference = false;

            for (var key in context) {
                if (context[key]) {
                    var referenceValue = context[key][propertyName];

                    if (undefined !== referenceValue) {
                        var branchReferences = resolveBranchBranchesReferences(
                            context[key][propertyName],
                            branch.branch[propertyName],
                            simple
                        );

                        // Cannot resolve the references.
                        if (undefined === branchReferences) {
                            return;
                        }

                        if (!branchKeyReferences[key]) {
                            branchKeyReferences[key] = { items: [], isArray: false };
                        }

                        branchKeyReferences[key] = mergeBranchReferences(branchKeyReferences[key], branchReferences);
                        hasReference = true;
                    }
                }
            }

            // Cannot resolve the references.
            if (!hasReference) {
                return;
            }
        }
    }

    if (0 === branchesReferences.items.length) {
        for (var key in branchKeyReferences) {
            branchesReferences.items.push(branchKeyReferences[key]);
            branchesReferences.isArray = (branchesReferences.isArray || branchKeyReferences[key].isArray);
        }

        if (0 !== references.items.length && 0 !== branchesReferences.items.length) {
            var mergedReferences = { items: [], isArray: false };

            references.isArray = (references.isArray || branchesReferences.isArray);

            for (var i = 0; i < references.items.length; i++) {
                var referenceLength = references.items[i].length;

                for (var j = 0; j < branchesReferences.items[i].items.length; j++) {
                    var refValues = branchesReferences.items[i].items[j],
                        mergedReference = []
                    ;

                    for (var k = 0; k < referenceLength; k++) {
                        if (undefined !== references.items[i][k]) {
                            mergedReference[k] = references.items[i][k];
                        } else if (undefined !== refValues[k]) {
                            mergedReference[k] = refValues[k];
                        }
                    }

                    mergedReferences.items.push(mergedReference);
                }
            }

            return mergedReferences;
        }
    }

    return mergeBranchReferences(references, branchesReferences);
}

/**
 * Merge the references of a branch for a reference.
 *
 * @param {Mixed} reference The reference.
 * @param {Array} branch A branch of references.
 * @param {Boolean} simple Is this a simple reference?
 * @return {Array} The merged references.
 * @api private
 */
var resolveBranchBranchesReferences = function(reference, branch, simple) {
    var references;

    if (simple) {
        references = resolveBranchReferences(branch, reference, simple);
    } else {
        references = resolveBranchReferences(branch, reference);
    }

    return references;
}

/**
 * Merge the references of two branches.
 *
 * @param {Object} references1 The first block of references.
 * @param {Object} references2 The second block of references.
 * @return {Object} The merged references.
 * @api private
 */
var mergeBranchReferences = function(references1, references2) {
    var references = { items: [], isArray: (references1.isArray || references2.isArray) };

    if (0 === references1.items.length) {
        for (var i = 0; i < references2.items.length; i++) {
            var refValues = references2.items[i];

            if (refValues && refValues.items) {
                for (var j = 0; j < refValues.items.length; j++) {
                    references.items.push(refValues.items[j]);
                }
            } else {
                references.items.push(refValues);
            }
        }
    } else if (0 === references2.items.length) {
        for (var i = 0; i < references1.items.length; i++) {
            var refValues = references1.items[i];

            if (refValues && refValues.items) {
                for (var j = 0; j < refValues.items.length; j++) {
                    references.items.push(refValues.items[j]);
                }
            } else {
                references.items.push(refValues);
            }
        }
    } else {
        for (var i = 0; i < references1.items.length; i++) {
            var refValues1 = references1.items[i];

            for (var j = 0; j < references2.items.length; j++) {
                var refValues2 = references2.items[j];

                if (refValues1.items && refValues2.items) {
                    for (var l = 0; l < refValues1.items.length; l++) {
                        for (var m = 0; m < refValues2.items.length; m++) {
                            var referenceLength = Math.max(refValues1.items[l].length, refValues2.items[m].length)
                                mergedReference = []
                            ;

                            for (var k = 0; k < referenceLength; k++) {
                                if (undefined !== refValues1.items[l][k]) {
                                    mergedReference[k] = refValues1.items[l][k];
                                } else if (undefined !== refValues2.items[m][k]) {
                                    mergedReference[k] = refValues2.items[m][k];
                                }
                            }

                            references.items.push(mergedReference);
                        }
                    }
                } else if (refValues1.items) {
                    for (var l = 0; l < refValues1.items.length; l++) {
                        var referenceLength = Math.max(refValues1.items[l].length, refValues2.length)
                            mergedReference = []
                        ;

                        for (var k = 0; k < referenceLength; k++) {
                            if (undefined !== refValues1.items[l][k]) {
                                mergedReference[k] = refValues1.items[l][k];
                            } else if (undefined !== refValues2[k]) {
                                mergedReference[k] = refValues2[k];
                            }
                        }

                        references.items.push(mergedReference);
                    }
                } else if (refValues2.items) {
                    for (var l = 0; l < refValues2.items.length; l++) {
                        var referenceLength = Math.max(refValues2.items[l].length, refValues1.length)
                            mergedReference = []
                        ;

                        for (var k = 0; k < referenceLength; k++) {
                            if (undefined !== refValues2.items[l][k]) {
                                mergedReference[k] = refValues2.items[l][k];
                            } else if (undefined !== refValues1[k]) {
                                mergedReference[k] = refValues1[k];
                            }
                        }

                        references.items.push(mergedReference);
                    }
                } else {
                    var referenceLength = Math.max(refValues1.length, refValues2.length),
                        mergedReference = []
                    ;

                    for (var k = 0; k < referenceLength; k++) {
                        if (undefined !== refValues1[k]) {
                            mergedReference[k] = refValues1[k];
                        } else if (undefined !== refValues2[k]) {
                            mergedReference[k] = refValues2[k];
                        }
                    }

                    references.items.push(mergedReference);
                }
            }
        }
    }

    return references;
}
});

define('node_modules/danf/lib/common/manipulation/reference-type',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `ReferenceType`.
 */
module.exports = ReferenceType;

/**
 * Initialize a new reference type.
 */
function ReferenceType() {
    this._size = 1;
    this._namespace = [0];
    this._allowsConcatenation = true;
}

ReferenceType.defineImplementedInterfaces(['danf:manipulation.referenceType']);

ReferenceType.defineDependency('_name', 'string');
ReferenceType.defineDependency('_delimiter', 'string');
ReferenceType.defineDependency('_size', 'number');
ReferenceType.defineDependency('_namespace', 'number_array');
ReferenceType.defineDependency('_allowsConcatenation', 'boolean');

/**
 * @interface {danf:manipulation.referenceType}
 */
Object.defineProperty(ReferenceType.prototype, 'name', {
    get: function() { return this._name; },
    set: function(name) { this._name = name; }
});

/**
 * @interface {danf:manipulation.referenceType}
 */
Object.defineProperty(ReferenceType.prototype, 'delimiter', {
    get: function() { return this._delimiter; },
    set: function(delimiter) { this._delimiter = delimiter; }
});

/**
 * @interface {danf:manipulation.referenceType}
 */
Object.defineProperty(ReferenceType.prototype, 'size', {
    get: function() { return this._size; },
    set: function(size) { this._size = size; }
});

/**
 * @interface {danf:manipulation.referenceType}
 */
Object.defineProperty(ReferenceType.prototype, 'namespace', {
    get: function() { return this._namespace; },
    set: function(namespace) { this._namespace = namespace; }
});

/**
 * @interface {danf:manipulation.referenceType}
 */
Object.defineProperty(ReferenceType.prototype, 'allowsConcatenation', {
    get: function() { return this._allowsConcatenation; },
    set: function(allowsConcatenation) { this._allowsConcatenation = allowsConcatenation; }
});
});

define('node_modules/danf/lib/common/framework/initializer',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/object/classes-container','node_modules/danf/lib/common/object/interfaces-container','node_modules/danf/lib/common/object/interfacer','node_modules/danf/lib/common/object/class-processor/extender','node_modules/danf/lib/common/object/class-processor/interfacer','node_modules/danf/lib/common/dependency-injection/services-container','node_modules/danf/lib/common/dependency-injection/service-builder/abstract','node_modules/danf/lib/common/dependency-injection/service-builder/alias','node_modules/danf/lib/common/dependency-injection/service-builder/children','node_modules/danf/lib/common/dependency-injection/service-builder/class','node_modules/danf/lib/common/dependency-injection/service-builder/declinations','node_modules/danf/lib/common/dependency-injection/service-builder/factories','node_modules/danf/lib/common/dependency-injection/service-builder/parent','node_modules/danf/lib/common/dependency-injection/service-builder/properties','node_modules/danf/lib/common/dependency-injection/service-builder/collections','node_modules/danf/lib/common/dependency-injection/service-builder/registry','node_modules/danf/lib/common/configuration/section-processor/parameters','node_modules/danf/lib/common/dependency-injection/configuration/section-processor/services','node_modules/danf/lib/common/manipulation/notifier-registry','node_modules/danf/lib/common/manipulation/data-resolver','node_modules/danf/lib/common/manipulation/data-interpreter/default','node_modules/danf/lib/common/manipulation/data-interpreter/required','node_modules/danf/lib/common/configuration/manipulation/data-interpreter/references','node_modules/danf/lib/common/configuration/manipulation/data-interpreter/namespace','node_modules/danf/lib/common/configuration/modules-tree','node_modules/danf/lib/common/configuration/namespacer','node_modules/danf/lib/common/manipulation/data-interpreter/type','node_modules/danf/lib/common/manipulation/reference-resolver','node_modules/danf/lib/common/manipulation/reference-type'],function (require, exports, module) {'use strict';

/**
 * Expose `Initializer`.
 */
module.exports = Initializer;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    ClassesContainer = require('node_modules/danf/lib/common/object/classes-container'),
    InterfacesContainer = require('node_modules/danf/lib/common/object/interfaces-container'),
    Interfacer = require('node_modules/danf/lib/common/object/interfacer'),
    ExtenderClassProcessor = require('node_modules/danf/lib/common/object/class-processor/extender'),
    InterfacerClassProcessor = require('node_modules/danf/lib/common/object/class-processor/interfacer'),
    ServicesContainer = require('node_modules/danf/lib/common/dependency-injection/services-container'),
    AbstractServiceBuilder = require('node_modules/danf/lib/common/dependency-injection/service-builder/abstract'),
    AliasServiceBuilder = require('node_modules/danf/lib/common/dependency-injection/service-builder/alias'),
    ChildrenServiceBuilder = require('node_modules/danf/lib/common/dependency-injection/service-builder/children'),
    ClassServiceBuilder =  require('node_modules/danf/lib/common/dependency-injection/service-builder/class'),
    DeclinationsServiceBuilder = require('node_modules/danf/lib/common/dependency-injection/service-builder/declinations'),
    FactoriesServiceBuilder = require('node_modules/danf/lib/common/dependency-injection/service-builder/factories'),
    ParentServiceBuilder = require('node_modules/danf/lib/common/dependency-injection/service-builder/parent'),
    PropertiesServiceBuilder = require('node_modules/danf/lib/common/dependency-injection/service-builder/properties'),
    CollectionsServiceBuilder = require('node_modules/danf/lib/common/dependency-injection/service-builder/collections'),
    RegistryServiceBuilder = require('node_modules/danf/lib/common/dependency-injection/service-builder/registry'),
    ParametersConfigurationSectionProcessor = require('node_modules/danf/lib/common/configuration/section-processor/parameters'),
    ServicesConfigurationSectionProcessor = require('node_modules/danf/lib/common/dependency-injection/configuration/section-processor/services'),
    NotifierRegistry = require('node_modules/danf/lib/common/manipulation/notifier-registry'),
    DataResolver = require('node_modules/danf/lib/common/manipulation/data-resolver'),
    DefaultDataInterpreter = require('node_modules/danf/lib/common/manipulation/data-interpreter/default'),
    RequiredDataInterpreter = require('node_modules/danf/lib/common/manipulation/data-interpreter/required'),
    ReferencesDataInterpreter = require('node_modules/danf/lib/common/configuration/manipulation/data-interpreter/references'),
    NamespaceDataInterpreter = require('node_modules/danf/lib/common/configuration/manipulation/data-interpreter/namespace'),
    ModulesTree = require('node_modules/danf/lib/common/configuration/modules-tree'),
    Namespacer = require('node_modules/danf/lib/common/configuration/namespacer'),
    TypeDataInterpreter = require('node_modules/danf/lib/common/manipulation/data-interpreter/type'),
    ReferenceResolver = require('node_modules/danf/lib/common/manipulation/reference-resolver'),
    ReferenceType = require('node_modules/danf/lib/common/manipulation/reference-type')
;

/**
 * Initialize a new framework.
 */
function Initializer() {
}

/**
 * Instantiate objects.
 *
 * @param {object} framework The framework.
 * @api public
 */
Initializer.prototype.instantiate = function(framework) {
    framework.set('danf:manipulation.referenceResolver', new ReferenceResolver());
    var parameterType = new ReferenceType();
    parameterType.name = '%';
    parameterType.delimiter = '%';
    framework.set('danf:manipulation.referenceType.parameter', parameterType);
    var contextType = new ReferenceType();
    contextType.name = '@';
    contextType.delimiter = '@';
    framework.set('danf:manipulation.referenceType.context', contextType);

    framework.set('danf:configuration.modulesTree', new ModulesTree());
    framework.set('danf:configuration.namespacer', new Namespacer());
    framework.set('danf:configuration.configurationResolver', new DataResolver());
    framework.set('danf:configuration.configurationInterpreter.default', new DefaultDataInterpreter());
    framework.set('danf:configuration.configurationInterpreter.required', new RequiredDataInterpreter());
    framework.set('danf:configuration.configurationInterpreter.type', new TypeDataInterpreter());
    framework.set('danf:configuration.configurationInterpreter.references', new ReferencesDataInterpreter());
    framework.set('danf:configuration.configurationInterpreter.namespace', new NamespaceDataInterpreter());
    var parametersConfigurationSection = new ParametersConfigurationSectionProcessor();
    parametersConfigurationSection.name = 'parameters';
    framework.set('danf:configuration.sectionProcessor.parameters', parametersConfigurationSection);
    var configType = new ReferenceType();
    configType.name = '$';
    configType.delimiter = '$';
    framework.set('danf:configuration.referenceType.config', configType);
    var classesConfigRegistry = new NotifierRegistry();
    classesConfigRegistry.name = 'classes';
    framework.set('danf:configuration.registry.classes', classesConfigRegistry);
    var interfacesConfigRegistry = new NotifierRegistry();
    interfacesConfigRegistry.name = 'interfaces';
    framework.set('danf:configuration.registry.interfaces', interfacesConfigRegistry);
    var servicesConfigRegistry = new NotifierRegistry();
    servicesConfigRegistry.name = 'services';
    framework.set('danf:configuration.registry.services', servicesConfigRegistry);
    var eventsConfigRegistry = new NotifierRegistry();
    eventsConfigRegistry.name = 'events';
    framework.set('danf:configuration.registry.events', eventsConfigRegistry);
    var sequencesConfigRegistry = new NotifierRegistry();
    sequencesConfigRegistry.name = 'sequences';
    framework.set('danf:configuration.registry.sequences', sequencesConfigRegistry);

    framework.set('danf:object.classesContainer', new ClassesContainer());
    framework.set('danf:object.interfacer', new Interfacer());
    framework.set('danf:object.interfacesContainer', new InterfacesContainer());
    framework.set('danf:object.classProcessor.interfacer', new InterfacerClassProcessor());
    framework.set('danf:object.classProcessor.extender', new ExtenderClassProcessor());

    framework.set('danf:dependencyInjection.servicesContainer', new ServicesContainer());
    var servicesConfigurationSection = new ServicesConfigurationSectionProcessor();
    servicesConfigurationSection.name = 'services';
    framework.set('danf:dependencyInjection.configuration.sectionProcessor.services', servicesConfigurationSection);
    framework.set('danf:dependencyInjection.serviceBuilder.abstract', new AbstractServiceBuilder());
    framework.set('danf:dependencyInjection.serviceBuilder.alias', new AliasServiceBuilder());
    framework.set('danf:dependencyInjection.serviceBuilder.children', new ChildrenServiceBuilder());
    framework.set('danf:dependencyInjection.serviceBuilder.class', new ClassServiceBuilder());
    framework.set('danf:dependencyInjection.serviceBuilder.declination', new DeclinationsServiceBuilder());
    framework.set('danf:dependencyInjection.serviceBuilder.factories', new FactoriesServiceBuilder());
    framework.set('danf:dependencyInjection.serviceBuilder.parent', new ParentServiceBuilder());
    framework.set('danf:dependencyInjection.serviceBuilder.properties', new PropertiesServiceBuilder());
    framework.set('danf:dependencyInjection.serviceBuilder.collections', new CollectionsServiceBuilder());
    framework.set('danf:dependencyInjection.serviceBuilder.registry', new RegistryServiceBuilder());
    var serviceType = new ReferenceType();
    serviceType.name = '#';
    serviceType.delimiter = '#';
    serviceType.allowsConcatenation = false;
    framework.set('danf:dependencyInjection.referenceType.service', serviceType);
    var serviceCollectionType = new ReferenceType();
    serviceCollectionType.name = '&';
    serviceCollectionType.delimiter = '&';
    serviceCollectionType.allowsConcatenation = false;
    framework.set('danf:dependencyInjection.referenceType.serviceCollection', serviceCollectionType);
    var serviceFactoryType = new ReferenceType();
    serviceFactoryType.name = '>';
    serviceFactoryType.delimiter = '>';
    serviceFactoryType.size = 3;
    serviceFactoryType.allowsConcatenation = false;
    framework.set('danf:dependencyInjection.referenceType.serviceFactory', serviceFactoryType);
}

/**
 * Inject dependencies between objects.
 *
 * @param {object} framework The framework.
 * @param {object} parameters The application parameters.
 * @api public
 */
Initializer.prototype.inject = function(framework, parameters) {
    var classesContainer = framework.get('danf:object.classesContainer'),
        interfacer = framework.get('danf:object.interfacer'),
        interfacesContainer = framework.get('danf:object.interfacesContainer'),
        interfacerClassProcessor = framework.get('danf:object.classProcessor.interfacer'),
        extenderClassProcessor = framework.get('danf:object.classProcessor.extender')
    ;
    interfacer.interfacesContainer = interfacesContainer;
    interfacer.debug = parameters.context.debug;
    interfacerClassProcessor.interfacesContainer = interfacesContainer;
    extenderClassProcessor.classesContainer = classesContainer;
    extenderClassProcessor.baseClassName = 'danf:object.class';
    classesContainer.addClassProcessor(extenderClassProcessor);
    classesContainer.addClassProcessor(interfacerClassProcessor);

    var referenceResolver = framework.get('danf:manipulation.referenceResolver'),
        parameterType = framework.get('danf:manipulation.referenceType.parameter'),
        contextType = framework.get('danf:manipulation.referenceType.context'),
        configType = framework.get('danf:configuration.referenceType.config'),
        serviceType = framework.get('danf:dependencyInjection.referenceType.service'),
        serviceCollectionType = framework.get('danf:dependencyInjection.referenceType.serviceCollection'),
        serviceFactoryType = framework.get('danf:dependencyInjection.referenceType.serviceFactory')
    ;
    referenceResolver.addReferenceType(parameterType);
    referenceResolver.addReferenceType(contextType);
    referenceResolver.addReferenceType(configType);
    referenceResolver.addReferenceType(serviceType);
    referenceResolver.addReferenceType(serviceCollectionType);
    referenceResolver.addReferenceType(serviceFactoryType);

    var modulesTree = framework.get('danf:configuration.modulesTree'),
        namespacer = framework.get('danf:configuration.namespacer'),
        configurationResolver = framework.get('danf:configuration.configurationResolver'),
        defaultConfigurationInterpreter = framework.get('danf:configuration.configurationInterpreter.default'),
        requiredConfigurationInterpreter = framework.get('danf:configuration.configurationInterpreter.required'),
        typeConfigurationInterpreter = framework.get('danf:configuration.configurationInterpreter.type'),
        referencesConfigurationInterpreter = framework.get('danf:configuration.configurationInterpreter.references'),
        namespaceConfigurationInterpreter = framework.get('danf:configuration.configurationInterpreter.namespace'),
        parametersProcessor = framework.get('danf:configuration.sectionProcessor.parameters')
    ;
    namespacer.addReferenceType(parameterType);
    namespacer.addReferenceType(contextType);
    namespacer.addReferenceType(configType);
    namespacer.addReferenceType(serviceType);
    namespacer.addReferenceType(serviceCollectionType);
    namespacer.addReferenceType(serviceFactoryType);
    referencesConfigurationInterpreter.namespacer = namespacer;
    namespaceConfigurationInterpreter.namespacer = namespacer;
    configurationResolver.addDataInterpreter(defaultConfigurationInterpreter);
    configurationResolver.addDataInterpreter(requiredConfigurationInterpreter);
    configurationResolver.addDataInterpreter(typeConfigurationInterpreter);
    configurationResolver.addDataInterpreter(referencesConfigurationInterpreter);
    configurationResolver.addDataInterpreter(namespaceConfigurationInterpreter);
    parametersProcessor.configurationResolver = configurationResolver;
    parametersProcessor.referenceResolver = referenceResolver;
    parametersProcessor.namespacer = namespacer;

    var servicesContainer = framework.get('danf:dependencyInjection.servicesContainer'),
        servicesProcessor = framework.get('danf:dependencyInjection.configuration.sectionProcessor.services'),
        abstractServiceBuilder = framework.get('danf:dependencyInjection.serviceBuilder.abstract'),
        aliasServiceBuilder = framework.get('danf:dependencyInjection.serviceBuilder.alias'),
        childrenServiceBuilder = framework.get('danf:dependencyInjection.serviceBuilder.children'),
        classServiceBuilder = framework.get('danf:dependencyInjection.serviceBuilder.class'),
        declinationServiceBuilder = framework.get('danf:dependencyInjection.serviceBuilder.declination'),
        factoriesServiceBuilder = framework.get('danf:dependencyInjection.serviceBuilder.factories'),
        parentServiceBuilder = framework.get('danf:dependencyInjection.serviceBuilder.parent'),
        propertiesServiceBuilder = framework.get('danf:dependencyInjection.serviceBuilder.properties'),
        collectionsServiceBuilder = framework.get('danf:dependencyInjection.serviceBuilder.collections'),
        registryServiceBuilder = framework.get('danf:dependencyInjection.serviceBuilder.registry')
    ;
    servicesContainer.referenceResolver = referenceResolver;
    servicesContainer.interfacer = interfacer;
    servicesProcessor.configurationResolver = configurationResolver;
    servicesProcessor.referenceResolver = referenceResolver;
    servicesProcessor.namespacer = namespacer;
    servicesProcessor.servicesContainer = servicesContainer;
    abstractServiceBuilder.servicesContainer = servicesContainer;
    abstractServiceBuilder.referenceResolver = referenceResolver;
    aliasServiceBuilder.servicesContainer = servicesContainer;
    aliasServiceBuilder.referenceResolver = referenceResolver;
    childrenServiceBuilder.servicesContainer = servicesContainer;
    childrenServiceBuilder.referenceResolver = referenceResolver;
    classServiceBuilder.servicesContainer = servicesContainer;
    classServiceBuilder.referenceResolver = referenceResolver;
    classServiceBuilder.classesContainer = classesContainer;
    declinationServiceBuilder.servicesContainer = servicesContainer;
    declinationServiceBuilder.referenceResolver = referenceResolver;
    factoriesServiceBuilder.servicesContainer = servicesContainer;
    factoriesServiceBuilder.referenceResolver = referenceResolver;
    parentServiceBuilder.servicesContainer = servicesContainer;
    parentServiceBuilder.referenceResolver = referenceResolver;
    propertiesServiceBuilder.servicesContainer = servicesContainer;
    propertiesServiceBuilder.referenceResolver = referenceResolver;
    propertiesServiceBuilder.interfacer = interfacer;
    propertiesServiceBuilder.modulesTree = modulesTree;
    propertiesServiceBuilder.namespacer = namespacer;
    collectionsServiceBuilder.servicesContainer = servicesContainer;
    collectionsServiceBuilder.referenceResolver = referenceResolver;
    collectionsServiceBuilder.interfacer = interfacer;
    registryServiceBuilder.servicesContainer = servicesContainer;
    registryServiceBuilder.referenceResolver = referenceResolver;
    servicesContainer.addServiceBuilder(abstractServiceBuilder);
    servicesContainer.addServiceBuilder(aliasServiceBuilder);
    servicesContainer.addServiceBuilder(childrenServiceBuilder);
    servicesContainer.addServiceBuilder(classServiceBuilder);
    servicesContainer.addServiceBuilder(declinationServiceBuilder);
    servicesContainer.addServiceBuilder(factoriesServiceBuilder);
    servicesContainer.addServiceBuilder(parentServiceBuilder);
    servicesContainer.addServiceBuilder(propertiesServiceBuilder);
    servicesContainer.addServiceBuilder(collectionsServiceBuilder);
    servicesContainer.addServiceBuilder(registryServiceBuilder);

    var classesConfigRegistry = framework.get('danf:configuration.registry.classes'),
        interfacesConfigRegistry = framework.get('danf:configuration.registry.interfaces'),
        servicesConfigRegistry = framework.get('danf:configuration.registry.services')
    ;
    classesConfigRegistry.addObserver(classesContainer);
    interfacesConfigRegistry.addObserver(interfacesContainer);
    servicesConfigRegistry.addObserver(servicesContainer);

    // Replace framework objects container.
    for (var id in framework.objectsContainer.objects) {
        servicesContainer.set(id, framework.objectsContainer.objects[id]);
    }
    framework.objectsContainer = servicesContainer;
}

/**
 * Process.
 *
 * @param {object} framework The framework.
 * @param {object} parameters The application parameters.
 * @param {object} danf The danf config.
 * @param {object} configuration The application danf configuration.
 * @api public
 */
Initializer.prototype.process = function(framework, parameters, danf, configuration) {
    var app = framework.get('danf:app');

    // Process danf module.
    var servicesContainer = framework.get('danf:dependencyInjection.servicesContainer'),
        classesContainer = framework.get('danf:object.classesContainer'),
        interfacesContainer = framework.get('danf:object.interfacesContainer'),
        interfacerClassProcessor = framework.get('danf:object.classProcessor.interfacer'),
        classesConfigRegistry = framework.get('danf:configuration.registry.classes'),
        interfacesConfigRegistry = framework.get('danf:configuration.registry.interfaces'),
        servicesConfigRegistry = framework.get('danf:configuration.registry.services')
    ;

    interfacesConfigRegistry.registerSet(danf.interfaces);
    interfacesConfigRegistry.removeObserver(interfacesContainer);
    classesConfigRegistry.registerSet(danf.classes);
    classesConfigRegistry.removeObserver(classesContainer);

    interfacerClassProcessor.process(ServicesContainer);
    interfacerClassProcessor.process(AbstractServiceBuilder);
    interfacerClassProcessor.process(AliasServiceBuilder);
    interfacerClassProcessor.process(ChildrenServiceBuilder);
    interfacerClassProcessor.process(ClassServiceBuilder);
    interfacerClassProcessor.process(DeclinationsServiceBuilder);
    interfacerClassProcessor.process(FactoriesServiceBuilder);
    interfacerClassProcessor.process(ParentServiceBuilder);
    interfacerClassProcessor.process(PropertiesServiceBuilder);
    interfacerClassProcessor.process(CollectionsServiceBuilder);

    servicesContainer.config = danf.config;
    servicesConfigRegistry.registerSet(danf.services);

    // Process configuration for new instantiated services.
    var classesContainer = framework.get('danf:object.classesContainer'),
        interfacesContainer = framework.get('danf:object.interfacesContainer'),
        classServiceBuilder = framework.get('danf:dependencyInjection.serviceBuilder.class')
    ;

    classServiceBuilder.classesContainer = classesContainer;
    classesConfigRegistry.addObserver(classesContainer);
    interfacesConfigRegistry.addObserver(interfacesContainer);
    interfacesConfigRegistry.registerSet(danf.interfaces);
    classesConfigRegistry.registerSet(danf.classes);

    // Process the configuration.
    var modulesTree = framework.get('danf:configuration.modulesTree'),
        configurationProcessor = framework.get('danf:configuration.processor')
    ;
    modulesTree.build(configuration, danf);

    var config = configurationProcessor.process(modulesTree);
    parameters['config'] = config;
    parameters['flattenConfig'] = utils.flatten(config, 1, ':');

    // Process classes config.
    interfacesConfigRegistry.registerSet(config.interfaces || {});
    classesConfigRegistry.registerSet(config.classes || {});

    // Process services config.
    servicesContainer.config = parameters['flattenConfig'];
    servicesConfigRegistry.registerSet(config.services || {});

    // Process events.
    var sequencesContainer = framework.get('danf:event.sequencesContainer'),
        eventsContainer = framework.get('danf:event.eventsContainer'),
        sequencesConfigRegistry = framework.get('danf:configuration.registry.sequences'),
        eventsConfigRegistry = framework.get('danf:configuration.registry.events'),
        referencesResolver = framework.get('danf:event.referencesResolver'),
        router = framework.get('danf:http.router')
    ;
    referencesResolver.config = parameters['flattenConfig'];
    sequencesConfigRegistry.addObserver(sequencesContainer);
    eventsConfigRegistry.addObserver(eventsContainer);
    eventsConfigRegistry.addObserver(router);
    sequencesConfigRegistry.registerSet(danf.sequences || {});
    sequencesConfigRegistry.registerSet(config.sequences || {});
    eventsConfigRegistry.registerSet(danf.events || {});
    eventsConfigRegistry.registerSet(config.events || {});

    // Finalize services building.
    servicesContainer.finalize();
}
});

define('node_modules/danf/lib/client/ajax-app/link-follower',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `LinkFollower`.
 */
module.exports = LinkFollower;

/**
 * Initialize a new ajax link follower.
 */
function LinkFollower() {
}

LinkFollower.defineImplementedInterfaces(['danf:ajaxApp.linkFollower']);

LinkFollower.defineDependency('_jquery', 'function');
LinkFollower.defineDependency('_bodyProvider', 'danf:manipulation.bodyProvider');
LinkFollower.defineDependency('_history', 'danf:manipulation.history');
LinkFollower.defineDependency('_readyProcessor', 'danf:manipulation.readyProcessor');
LinkFollower.defineDependency('_router', 'danf:http.router');
LinkFollower.defineDependency('_reloadingSequence', 'danf:event.sequence');

/**
 * JQuery.
 *
 * @var {function}
 * @api public
 */
Object.defineProperty(LinkFollower.prototype, 'jquery', {
    set: function(jquery) { this._jquery = jquery; }
});

/**
 * Body provider.
 *
 * @var {danf:manipulation.bodyProvider}
 * @api public
 */
Object.defineProperty(LinkFollower.prototype, 'bodyProvider', {
    set: function(bodyProvider) { this._bodyProvider = bodyProvider; }
});

/**
 * History handler.
 *
 * @var {danf:manipulation.history}
 * @api public
 */
Object.defineProperty(LinkFollower.prototype, 'history', {
    set: function(history) { this._history = history; }
});

/**
 * Ready processor.
 *
 * @var {danf:manipulation.readyProcessor}
 * @api public
 */
Object.defineProperty(LinkFollower.prototype, 'readyProcessor', {
    set: function(readyProcessor) { this._readyProcessor = readyProcessor; }
});

/**
 * Router.
 *
 * @var {danf.http.router}
 * @api public
 */
Object.defineProperty(LinkFollower.prototype, 'router', {
    set: function(router) { this._router = router; }
});

/**
 * Reloading sequence.
 *
 * @var {danf:event.sequence}
 * @api public
 */
Object.defineProperty(LinkFollower.prototype, 'reloadingSequence', {
    set: function(reloadingSequence) { this._reloadingSequence = reloadingSequence; }
});

/**
 * @interface {danf:ajaxApp.formSubmitter}
 */
LinkFollower.prototype.follow = function(link) {
    var $ = this._jquery,
        link = $(link)
    ;

    // Handle case where the link is not in the DOM anymore.
    if (0 === link.length || !$.contains(document.documentElement, link.get(0))) {
        return;
    }

    var method = 'GET',
        url = link.attr('href'),
        settings = link.data('ajax') || {}
    ;

    if (null == url) {
        url = settings.url;
    } else {
        settings.url = url;
        link.data('ajax', settings);
    }

    this._router.follow.__asyncCall(
        this._router,
        '.',
        url,
        method
    );
}

/**
 * @interface {danf:ajaxApp.formSubmitter}
 */
LinkFollower.prototype.write = function(content, url, link, event) {
    var $ = this._jquery;

    // Handle case where the link is not in the DOM anymore.
    if (!$.contains(document.documentElement, link)) {
        return;
    }

    var self = this,
        link = $(link),
        settings = link.data('ajax') || {},
        target = settings.target ? $(settings.target) : null,
        autoload = null != settings.autoload && false !== settings.autoload,
        body = this._bodyProvider.provide(),
        contentBody = this._bodyProvider.provide($(content)).children()
    ;

    if (null == target) {
        target = autoload ? link : body;
    }

    // Handle case where the target is not in the DOM anymore.
    if (0 === target.length || !$.contains(document.documentElement, target.get(0))) {
        return;
    }

    // Display content in the page.
    var wrapper = $(document.createElement('div')),
        replace = settings.replace
    ;

    wrapper.wrapInner(contentBody);
    target.empty();

    if (null == replace || true === replace) {
        if (target == link) {
            replace = 'replaceWith'
        } else {
            replace = 'append'
        }
    }

    if (replace) {
        target[replace](wrapper);
        contentBody.data('ajax', settings);
        this._readyProcessor.process(wrapper);
        contentBody.unwrap();
    }

    // Handle history.
    if (
        (target == body && false !== settings.bookmark) ||
        true === settings.bookmark
    ) {
        this._history.set(url);
    }

    // Set reload mechanism.
    if (autoload && settings.autoload) {
        var newEvent = {};

        for (var key in event) {
            newEvent[key] = event[key];
        }

        newEvent.target = contentBody.get(0);

        setTimeout(
            function() {
                self._reloadingSequence.execute(
                    {},
                    {event: newEvent},
                    null
                );
            },
            1000 * settings.autoload
        );
    }
}
});

define('node_modules/danf/lib/client/ajax-app/form-submitter',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `FormSubmitter`.
 */
module.exports = FormSubmitter;

/**
 * Initialize a new ajax forms handler.
 */
function FormSubmitter() {
}

FormSubmitter.defineImplementedInterfaces(['danf:ajaxApp.formSubmitter']);

FormSubmitter.defineDependency('_jquery', 'function');
FormSubmitter.defineDependency('_bodyProvider', 'danf:manipulation.bodyProvider');
FormSubmitter.defineDependency('_history', 'danf:manipulation.history');
FormSubmitter.defineDependency('_readyProcessor', 'danf:manipulation.readyProcessor');
FormSubmitter.defineDependency('_router', 'danf:http.router');

/**
 * JQuery.
 *
 * @var {function}
 * @api public
 */
Object.defineProperty(FormSubmitter.prototype, 'jquery', {
    set: function(jquery) { this._jquery = jquery; }
});

/**
 * Body provider.
 *
 * @var {danf:manipulation.bodyProvider}
 * @api public
 */
Object.defineProperty(FormSubmitter.prototype, 'bodyProvider', {
    set: function(bodyProvider) { this._bodyProvider = bodyProvider; }
});

/**
 * History handler.
 *
 * @var {danf:manipulation.history}
 * @api public
 */
Object.defineProperty(FormSubmitter.prototype, 'history', {
    set: function(history) { this._history = history; }
});

/**
 * Ready processor.
 *
 * @var {danf:manipulation.readyProcessor}
 * @api public
 */
Object.defineProperty(FormSubmitter.prototype, 'readyProcessor', {
    set: function(readyProcessor) { this._readyProcessor = readyProcessor; }
});

/**
 * Router.
 *
 * @var {danf.http.router}
 * @api public
 */
Object.defineProperty(FormSubmitter.prototype, 'router', {
    set: function(router) { this._router = router; }
});

/**
 * @interface {danf:ajaxApp.formSubmitter}
 */
FormSubmitter.prototype.submit = function(submitter) {
    var $ = this._jquery,
        submitter = $(submitter),
        form = submitter.closest('form')
    ;

    // Handle case where the form is not in the DOM anymore.
    if (0 === form.length || !$.contains(document.documentElement, form.get(0))) {
        return;
    }

    var method = form.attr('method'),
        url = '{0}?{1}'.format(form.attr('action'), form.serialize())
    ;

    this._router.follow.__asyncCall(
        this._router,
        '.',
        url,
        method
    );
}

/**
 * @interface {danf:ajaxApp.formSubmitter}
 */
FormSubmitter.prototype.write = function(content, url, submitter) {
    var $ = this._jquery,
        submitter = $(submitter),
        form = submitter.closest('form'),
        settings = form.data('ajax') || {},
        body = this._bodyProvider.provide(),
        target = settings.target ? $(settings.target) : body,
        contentBody = this._bodyProvider.provide($(content)).children()
    ;

    // Handle case where the target is not in the DOM anymore.
    if (
        0 === target.length ||
        !$.contains(document.documentElement, target.get(0))
    ) {
        return;
    }

    // Display content in the page.
    var wrapper = $(document.createElement('div')),
        replace = settings.replace
    ;

    wrapper.wrapInner(contentBody);
    target.empty();

    if (null == replace || true === replace) {
        if (target == form) {
            replace = 'replaceWith'
        } else {
            replace = 'append'
        }
    }

    if (replace) {
        target[replace](wrapper);
        this._readyProcessor.process(wrapper);
        contentBody.unwrap();
    }

    // Handle history.
    if (
        (target == body && false !== settings.bookmark) ||
        true === settings.bookmark
    ) {
        this._history.set(url);
    }
}
});

define('node_modules/danf/config/client/ajax-app/classes',['require','exports','module','node_modules/danf/lib/client/ajax-app/link-follower','node_modules/danf/lib/client/ajax-app/form-submitter'],function (require, exports, module) {'use strict';

module.exports = {
    linkFollower: require('node_modules/danf/lib/client/ajax-app/link-follower'),
    formSubmitter: require('node_modules/danf/lib/client/ajax-app/form-submitter')
};
});

define('node_modules/danf/config/client/ajax-app/interfaces',['require','exports','module'],function (require, exports, module) {'use strict';

module.exports = {
    linkFollower: {
        methods: {
            /**
             * Follow a link.
             *
             * @param {object} link The link DOM node.
             */
            follow: {
                arguments: ['object/link']
            },
            /**
             * Write a link content into the page.
             *
             * @param {string} content The content.
             * @param {object} link The link DOM node.
             * @param {object} event The event object.
             */
            write: {
                arguments: ['string/content', 'object/link', 'object/event']
            }
        }
    },
    formSubmitter: {
        methods: {
            /**
             * Submit a form.
             *
             * @param {object} submitter The submitter DOM node.
             */
            submit: {
                arguments: ['object/submitter']
            },
            /**
             * Write a form return content into the page.
             *
             * @param {string} content The content.
             * @param {object} submitter The submitter DOM node.
             */
            write: {
                arguments: ['string/content', 'object/submitter']
            }
        }
    }
};
});

define('node_modules/danf/config/client/ajax-app/services',['require','exports','module'],function (require, exports, module) {'use strict';

module.exports = {
    linkFollower: {
        class: 'danf:ajaxApp.linkFollower',
        properties: {
            jquery: '#danf:vendor.jquery#',
            bodyProvider: '#danf:manipulation.bodyProvider#',
            history: '#danf:manipulation.history#',
            readyProcessor: '#danf:manipulation.readyProcessor#',
            router: '#danf:http.router#',
            reloadingSequence: '#danf:event.sequencesContainer[danf:ajaxApp.followLink]#'
        }
    },
    formSubmitter: {
        class: 'danf:ajaxApp.formSubmitter',
        properties: {
            jquery: '#danf:vendor.jquery#',
            bodyProvider: '#danf:manipulation.bodyProvider#',
            history: '#danf:manipulation.history#',
            readyProcessor: '#danf:manipulation.readyProcessor#',
            router: '#danf:http.router#'
        }
    }
};
});

define('node_modules/danf/config/client/ajax-app/events',['require','exports','module'],function (require, exports, module) {'use strict';

module.exports = {
    dom: {
        'danf:ajaxApp.ready': {
            event: 'ready',
            sequences: [
                {
                    name: 'danf:manipulation.process'
                }
            ]
        },
        'danf:ajaxApp.autoloadLink.ready': {
            event: 'ready',
            selector: '[data-ajax*="autoload"]',
            sequences: [
                {
                    name: 'danf:ajaxApp.followLink'
                }
            ]
        },
        'danf:ajaxApp.click.link': {
            event: 'click',
            selector: 'a[data-ajax]',
            preventDefault: true,
            stopPropagation: true,
            sequences: [
                {
                    name: 'danf:ajaxApp.followLink'
                }
            ]
        },
        'danf:ajaxApp.click.submit': {
            event: 'click',
            selector: 'form[data-ajax] :submit',
            preventDefault: true,
            stopPropagation: true,
            sequences: [
                {
                    name: 'danf:ajaxApp.submitForm'
                }
            ]
        },
        'danf:ajaxApp.popstate': {
            event: 'popstate',
            selector: 'window',
            sequences: [
                {
                    name: 'danf:manipulation.navigate'
                }
            ]
        }
    }
};
});

define('node_modules/danf/config/client/ajax-app/sequences',['require','exports','module'],function (require, exports, module) {'use strict';

module.exports = {
    followLink: {
        operations: [
            {
                order: 0,
                service: 'danf:ajaxApp.linkFollower',
                method: 'follow',
                arguments: ['!event.target!'],
                scope: 'response'
            },
            {
                condition: function(stream) {
                    return stream.response && stream.response.status < 400;
                },
                order: 10,
                service: 'danf:ajaxApp.linkFollower',
                method: 'write',
                arguments: ['@response.text@', '@response.url@', '!event.target!', '!event!']
            }
        ]
    },
    submitForm: {
        operations: [
            {
                order: 0,
                service: 'danf:ajaxApp.formSubmitter',
                method: 'submit',
                arguments: ['!event.target!'],
                scope: 'response'
            },
            {
                condition: function(stream) {
                    return stream.response && stream.response.status < 400;
                },
                order: 10,
                service: 'danf:ajaxApp.formSubmitter',
                method: 'write',
                arguments: ['@response.text@', '@response.url@', '!event.target!']
            }
        ]
    }
};
});

define('node_modules/danf/config/common/configuration/interfaces',['require','exports','module'],function (require, exports, module) {'use strict';

module.exports = {
    module: {
        methods: {
            /**
             * Set a dependency of the module.
             *
             * @param {string} alias The alias of the dependency.
             * @param {danf:configuration.module} dependency The dependency module.
             */
            setDependency: {
                arguments: ['string/alias', 'danf:configuration.module/dependency']
            }
        },
        getters: {
            /**
             * Id.
             *
             * @return {string}
             */
            id: 'string',
            /**
             * Alias.
             *
             * @return {string}
             */
            alias: 'string',
            /**
             * Level.
             *
             * @return {number}
             */
            level: 'number',
            /**
             * Contract.
             *
             * @return {object}
             */
            contract: 'object',
            /**
             * Config.
             *
             * @return {object}
             */
            config: 'object',
            /**
             * Parent.
             *
             * @return {string}
             */
            parent: 'string',
            /**
             * Dependencies.
             *
             * @return {danf:configuration.module_object}
             */
            dependencies: 'danf:configuration.module_object'
        },
        setters: {
            /**
             * Id.
             *
             * @param {string}
             */
            id: 'string',
            /**
             * Alias.
             *
             * @param {string}
             */
            alias: 'string',
            /**
             * Level.
             *
             * @param {number}
             */
            level: 'number',
            /**
             * Contract.
             *
             * @param {object}
             */
            contract: 'object',
            /**
             * Config.
             *
             * @param {object}
             */
            config: 'object',
            /**
             * Parent.
             *
             * @param {string}
             */
            parent: 'string',
            /**
             * Dependencies.
             *
             * @param {danf:configuration.module_object}
             */
            dependencies: 'danf:configuration.module_object'
        }
    },
    modulesTree: {
        methods: {
            /**
             * Build the tree of the modules.
             *
             * @param {danf:configuration.module} root The danf root module.
             */
            build: {
                arguments: ['danf:configuration.module/root']
            },
            /**
             * Get the root module.
             *
             * @return {danf:configuration.module} The root module.
             */
            getRoot: {
                returns: 'danf:configuration.module'
            },
            /**
             * Get a module from its id.
             *
             * @param {string} id The id of the module.
             * @return {danf:configuration.module} The module.
             */
            get: {
                arguments: ['string/id'],
                returns: 'danf:configuration.module'
            },
            /**
             * Get the modules of a level.
             *
             * @param {number} level A level of definition.
             * @return {danf:configuration.module_array} The modules of the level.
             */
            getLevel: {
                arguments: ['number/level'],
                returns: 'danf:configuration.module_array'
            },
            /**
             * Get the modules with no hierarchy ordered by level.
             *
             * @param {boolean} inversed Inversed order?
             * @return {danf:configuration.module_array} The modules with no hierarchy.
             */
            getFlat: {
                arguments: ['boolean|undefined/inversed'],
                returns: 'danf:configuration.module_array'
            },
            /**
             * Get the child module of another module from its relative id.
             *
             * @param {danf:configuration.module} module The module.
             * @param {string} relativeId The child module id relative to the module.
             * @return {danf:configuration.module} The child module.
             */
            getChild: {
                arguments: ['danf:configuration.module/module', 'string/relativeId'],
                returns: 'danf:configuration.module'
            }
        },
        getters: {
            /**
             * Name of the application.
             *
             * @return {string}
             */
            appName: 'string'
        }
    },
    namespacer: {
        methods: {
            /**
             * Prefix a source with its namespace.
             *
             * @param {string} source The source.
             * @param {danf:configuration.module} The module.
             * @param {danf:configuration.modulesTree} modulesTree The modules tree.
             * @return {string} The prefixed source.
             */
            prefix: {
                arguments: ['string/source', 'danf:configuration.module/module', 'danf:configuration.modulesTree/modulesTree'],
                returns: 'string'
            },
            /**
             * Prefix a source with its namespace.
             *
             * @param {mixed} source The source.
             * @param {string} type The type of the references.
             * @param {danf:configuration.module} The module.
             * @param {danf:configuration.modulesTree} modulesTree The modules tree.
             * @return {mixed} The source with prefixed references.
             */
            prefixReferences: {
                arguments: ['mixed/source', 'string/delimiter', 'danf:configuration.module/module', 'danf:configuration.modulesTree/modulesTree'],
                returns: 'mixed'
            }
        }
    },
    processor: {
        methods: {
            /**
             * Process the config of the modules.
             *
             * @param {danf:configuration.modulesTree} modulesTree The modules tree.
             * @return {object} The processed config for the modules tree.
             * @api public
             */
            process: {
                arguments: ['danf:configuration.modulesTree/modulesTree'],
                returns: 'object'
            }
        }
    },
    sectionProcessor: {
        methods: {
            /**
             * Pre process the config.
             *
             * @param {object} The config.
             * @param {object} The config of the section.
             * @param {danf:configuration.modulesTree} modulesTree The modules tree.
             * @return {object} The processed config.
             */
            preProcess: {
                arguments: ['object/config', 'object/sectionConfig', 'danf:configuration.modulesTree|undefined/modulesTree'],
                returns: 'object'
            },
            /**
             * Process the config of the section.
             *
             * @param {danf:configuration.modulesTree} modulesTree The modules tree.
             * @param {string} environment The environment.
             * @return {object} The processed config.
             */
            process: {
                arguments: ['danf:configuration.modulesTree/modulesTree', 'string/environment'],
                returns: 'object'
            },
            /**
             * Post process the config.
             *
             * @param {object} The config.
             * @param {object} The config of the section.
             * @param {danf:configuration.modulesTree} modulesTree The modules tree.
             * @return {object} The processed config.
             */
            postProcess: {
                arguments: ['object/config', 'object/sectionConfig', 'danf:configuration.modulesTree|undefined/modulesTree'],
                returns: 'object'
            },
            /**
             * Interpret all the config sections of a module.
             *
             * @param {object} config The config of the module.
             * @param {danf:configuration.module} module The module.
             * @param {danf:configuration.modulesTree} modulesTree The modules tree.
             * @return {object} The interpreted config of the module.
             */
            interpretAllModuleConfig: {
                arguments: ['object/config', 'danf:configuration.module/module', 'danf:configuration.modulesTree/modulesTree'],
                returns: 'object'
            }
        },
        getters: {
            /**
             * Name of the section.
             *
             * @return {string}
             */
            name: 'string',
            /**
             * Contract that the config must respect.
             *
             * @return {object}
             */
            contract: 'object',
            /**
             * Whether or not the section must be processed in priority.
             *
             * @return {boolean}
             */
            priority: 'boolean'
        },
        setters: {
            /**
             * Contract that the config must respect.
             *
             * @param {object}
             */
            contract: 'object'
        }
    }
};
});

define('node_modules/danf/config/common/configuration/services',['require','exports','module'],function (require, exports, module) {'use strict';

module.exports = {
    modulesTree: {
        class: 'danf:configuration.modulesTree',
        properties: {
            appName: '%danf:context.app%'
        },
        lock: true
    },
    namespacer: {
        class: 'danf:configuration.namespacer',
        properties: {
            referenceTypes: '&danf:manipulation.referenceType&'
        }
    },
    processor: {
        class: 'danf:configuration.processor',
        properties: {
            configurationResolver: '#danf:configuration.configurationResolver#',
            referenceResolver: '#danf:manipulation.referenceResolver#',
            namespacer: '#danf:configuration.namespacer#',
            sectionProcessors: '&danf:configuration.sectionProcessor&',
            environment: '%danf:context.environment%'
        },
        lock: true
    },
    sectionProcessor: {
        class: 'danf:configuration.sectionProcessor',
        collections: ['danf:configuration.sectionProcessor'],
        properties: {
            configurationResolver: '#danf:configuration.configurationResolver#',
            referenceResolver: '#danf:manipulation.referenceResolver#',
            namespacer: '#danf:configuration.namespacer#'
        },
        children: {
            parameters: {
                class: 'danf:configuration.sectionProcessor.parameters',
                properties: {
                    name: 'parameters'
                }
            }
        }
    },
    configurationResolver: {
        parent: 'danf:manipulation.dataResolver',
        properties: {
            dataInterpreters: '&danf:configuration.configurationInterpreter&'
        }
    },
    configurationInterpreter: {
        collections: ['danf:configuration.configurationInterpreter'],
        children: {
            default: {
                class: 'danf:manipulation.dataInterpreter.default'
            },
            flatten: {
                class: 'danf:manipulation.dataInterpreter.flatten'
            },
            format: {
                class: 'danf:manipulation.dataInterpreter.format'
            },
            required: {
                class: 'danf:manipulation.dataInterpreter.required'
            },
            type: {
                class: 'danf:manipulation.dataInterpreter.type'
            },
            validate: {
                class: 'danf:manipulation.dataInterpreter.validate'
            },
            abstractNamespacer: {
                properties: {
                    namespacer: '#danf:configuration.namespacer#'
                },
                abstract: true
            },
            references: {
                parent: 'danf:configuration.configurationInterpreter.abstractNamespacer',
                class: 'danf:configuration.manipulation.dataInterpreter.references'
            },
            namespace: {
                parent: 'danf:configuration.configurationInterpreter.abstractNamespacer',
                class: 'danf:configuration.manipulation.dataInterpreter.namespace'
            }
        }
    },
    referenceType: {
        collections: ['danf:manipulation.referenceType'],
        class: 'danf:manipulation.referenceType',
        children: {
            config: {
                properties: {
                    name: '$',
                    delimiter: '$'
                }
            }
        }
    },
};
});

define('node_modules/danf/lib/common/configuration/processor',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/configuration/section-processor'],function (require, exports, module) {'use strict';

/**
 * Expose `Processor`.
 */
module.exports = Processor;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    SectionProcessor = require('node_modules/danf/lib/common/configuration/section-processor')
;

/**
 * Initialize a new processor for the config.
 */
function Processor() {
    this._sections = {};
}

Processor.defineImplementedInterfaces(['danf:configuration.processor']);

Processor.defineDependency('_configurationResolver', 'danf:manipulation.dataResolver');
Processor.defineDependency('_referenceResolver', 'danf:manipulation.referenceResolver');
Processor.defineDependency('_namespacer', 'danf:configuration.namespacer');
Processor.defineDependency('_sections', 'danf:configuration.sectionProcessor_object');
Processor.defineDependency('_environment', 'string');

/**
 * Configuration resolver.
 *
 * @var {danf:manipulation.dataResolver}
 * @api public
 */
Object.defineProperty(Processor.prototype, 'configurationResolver', {
    set: function(configurationResolver) {
        this._configurationResolver = configurationResolver;
    }
});

/**
 * Reference resolver.
 *
 * @var {danf:manipulation.referenceResolver}
 * @api public
 */
Object.defineProperty(Processor.prototype, 'referenceResolver', {
    set: function(referenceResolver) {
        this._referenceResolver = referenceResolver;
    }
});

/**
 * Namespacer.
 *
 * @var {danf:configuration.namespacer}
 * @api public
 */
Object.defineProperty(Processor.prototype, 'namespacer', {
    set: function(namespacer) {
        this._namespacer = namespacer;
    }
});

/**
 * Environment.
 *
 * @var {string}
 * @api public
 */
Object.defineProperty(Processor.prototype, 'environment', {
    set: function(environment) {
        this._environment = environment;
    }
});

/**
 * SSSection processors.
 *
 * @var {danf:configuration.sectionProcessor_object}
 * @api public
 */
Object.defineProperty(Processor.prototype, 'sectionProcessors', {
    set: function(sectionProcessors) {
        for (var i = 0; i < sectionProcessors.length; i++) {
            this.addSectionProcessor(sectionProcessors[i]);
        }
    }
});

/**
 * @interface {danf:configuration.processor}
 */
Processor.prototype.process = function(modulesTree) {
    var root = modulesTree.getRoot(),
        sections = utils.merge(this._sections, buildConfigSections(root, this._configurationResolver, this._referenceResolver, this._namespacer)),
        config = {}
    ;

    // Process the config for priority module.
    config = processConfig(config, sections, modulesTree, true, this._environment);

    // Pre process the config.
    var modules = modulesTree.getFlat(true);

    for (var name in sections) {
        var section = sections[name];

        for (var i = 0; i < modules.length; i++) {
            var module = modules[i];

            module.config = section.interpretAllModuleConfig(module.config || {}, module, modulesTree);
            section.contract = section.interpretAllModuleConfig(section.contract || {}, module, modulesTree);

            modules[i].config = section.preProcess(module.config, config[name] || {}, modulesTree);
            modules[i].config = section.preProcess(module.config, config['{0}/{1}'.format(name, 'dev')] || {}, modulesTree);
        }
    }

    // Process the config.
    config = processConfig(config, sections, modulesTree, false, this._environment);

    // Post process the config.
    for (var name in sections) {
        config = sections[name].postProcess(config, config[name] || {}, modulesTree);
        config = sections[name].postProcess(config, config['{0}/{1}'.format(name, 'dev')] || {}, modulesTree);
    }

    return config;
}

/**
 * Add a section processor.
 *
 * @param {danf:configuration.sectionProcessor} processor The processor of a section.
 * @api public
 */
Processor.prototype.addSectionProcessor = function(sectionProcessor) {
    addSectionProcessor(this._sections, sectionProcessor);
}

/**
 * Add a section processor.
 *
 * @param {object} The processors of the sections.
 * @param {danf:configuration.sectionProcessor} sectionProcessor The processor of a section.
 * @api private
 */
var addSectionProcessor = function(sections, sectionProcessor) {
    sections[sectionProcessor.name] = sectionProcessor;
}

/**
 * Build the config section processors of the module.
 *
 * @param {danf:configuration.module} module A module.
 * @param {danf:manipulation.dataResolver} configurationResolver The configuration resolver.
 * @param {danf:manipulation.referenceResolver} referenceResolver The reference resolver.
 * @param {danf:configuration.namespacer} namespacer The namespacer.
 * @api private
 */
var buildConfigSections = function(module, configurationResolver, referenceResolver, namespacer) {
    var sections = {};

    if (undefined === module.alias) {
        var sectionProcessor = new SectionProcessor();

        sectionProcessor.name = module.id;
        sectionProcessor.contract = module.contract;
        sectionProcessor.configurationResolver = configurationResolver;
        sectionProcessor.referenceResolver = referenceResolver;
        sectionProcessor.namespacer = namespacer;

        addSectionProcessor(
            sections,
            sectionProcessor
        );
    }

    for (var id in module.dependencies) {
        var dependency = module.dependencies[id];

        if ('string' !== typeof dependency) {
            sections = utils.merge(
                sections,
                buildConfigSections(
                    dependency,
                    configurationResolver,
                    referenceResolver,
                    namespacer
                )
            );
        }
    }

    return sections;
}

/**
 * Process the config.
 *
 * @param {object} The config.
 * @param {danf:configuration.sectionProcessor_object} sections The section processors.
 * @param {danf:configuration.modulesTree} modulesTree The modules tree.
 * @param {boolean} Whether or not this is a priority processing.
 * @param {string} The environment.
 * @return {object} The processed config.
 * @api private
 */
var processConfig = function(config, sections, modulesTree, priority, environment) {
    for (var name in sections) {
        var section = sections[name];

        if ((priority && section.priority)
            || (!priority && !section.priority)
        ) {
            var sectionConfig = section.process(modulesTree, environment);

            if (sectionConfig) {
                config[name] = sectionConfig;
            }
        }
    }

    return config;
}
});

define('node_modules/danf/config/common/configuration/classes',['require','exports','module','node_modules/danf/lib/common/configuration/mod','node_modules/danf/lib/common/configuration/modules-tree','node_modules/danf/lib/common/configuration/namespacer','node_modules/danf/lib/common/configuration/processor','node_modules/danf/lib/common/configuration/section-processor','node_modules/danf/lib/common/configuration/manipulation/data-interpreter/abstract-namespacer','node_modules/danf/lib/common/configuration/manipulation/data-interpreter/namespace','node_modules/danf/lib/common/configuration/manipulation/data-interpreter/references','node_modules/danf/lib/common/configuration/section-processor/parameters'],function (require, exports, module) {'use strict';

module.exports = {
    module: require('node_modules/danf/lib/common/configuration/mod'),
    modulesTree: require('node_modules/danf/lib/common/configuration/modules-tree'),
    namespacer: require('node_modules/danf/lib/common/configuration/namespacer'),
    processor: require('node_modules/danf/lib/common/configuration/processor'),
    sectionProcessor: require('node_modules/danf/lib/common/configuration/section-processor'),
    manipulation: {
        dataInterpreter: {
            abstractNamespacer: require('node_modules/danf/lib/common/configuration/manipulation/data-interpreter/abstract-namespacer'),
            namespace: require('node_modules/danf/lib/common/configuration/manipulation/data-interpreter/namespace'),
            references: require('node_modules/danf/lib/common/configuration/manipulation/data-interpreter/references')
        }
    },
    'sectionProcessor.parameters': require('node_modules/danf/lib/common/configuration/section-processor/parameters')
};
});

define('node_modules/danf/config/common/dependency-injection/interfaces',['require','exports','module'],function (require, exports, module) {'use strict';

module.exports = {
    servicesContainer: {
        methods: {
            /**
             * Set an alias to a service.
             *
             * @param {string} alias The alias.
             * @param {string} id The id of the service.
             */
            setAlias: {
                arguments: ['string/alias', 'string/id']
            },
            /**
             * Set the definition of a service.
             *
             * @param {string} id The id of the service.
             * @param {object} definition The definition.
             */
            setDefinition: {
                arguments: ['string/id', 'object/definition']
            },
            /**
             * Get the definition of a service.
             *
             * @param {string} id The id of the service.
             * @return {object} The definition.
             */
            getDefinition: {
                arguments: ['string/id'],
                returns: 'object'
            },
            /**
             * Whether or not a service is defined.
             *
             * @param {string} id The id of the service.
             * @return {boolean} True if the service is defined, false otherwise.
             */
            hasDefinition: {
                arguments: ['string/id'],
                returns: 'boolean'
            },
            /**
             * Merge two definitions.
             *
             * @param {object} parent The definition of the parent.
             * @param {object} child The definition of the child.
             * @return {object} The merged definition of the child.
             */
            mergeDefinitions: {
                arguments: ['object/parent', 'object/child'],
                returns: 'object'
            },
            /**
             * Build the definitions of the services and instantiate the corresponding services.
             *
             * @param {boolean} reset Whether or not resetting the list of existent services.
             */
            build: {
                arguments: ['boolean/reset']
            },
            /**
             * Finalize the building of the services.
             */
            finalize: {
                arguments: []
            },
            /**
             * Get the instantiation of a service (lazy instantiation).
             *
             * @param {string} id The id of the service.
             * @return {object|function} The service object.
             */
            get: {
                arguments: ['string/id'],
                returns: 'object|function'
            },
            /**
             * Set an already instantiated service.
             *
             * @param {string} id The id of the service.
             * @param {object|function} service The service object.
             */
            set: {
                arguments: ['string/id', 'object|function/service']
            },
            /**
             * Unset an instantiated service from the services container.
             *
             * @param {string} id The id of the service.
             */
            unset: {
                arguments: ['string/id']
            },
            /**
             * Whether or not a service is instantiated.
             *
             * @param {string} id The id of the service.
             * @return {boolean} True if the service is instantiated, false otherwise.
             */
            has: {
                arguments: ['string/id'],
                returns: 'boolean'
            },
            /**
             * Set a dependency.
             *
             * @param {string} id The id of the service.
             * @param {string} dependencyId The id of the dependent service.
             * @param {string} property The property handling the dependency.
             * @param {string|number|null} index The optional index or key of the property.
             */
            setDependency: {
                arguments: [
                    'string/id',
                    'string/dependencyId',
                    'string/property',
                    'string|number|null/index'
                ]
            }
        },
        getters: {
            /**
             * Config.
             *
             * @return {object}
             */
            config: 'object',
            /**
             * Config handled parameters.
             *
             * @return {object}
             */
            handledParameters: 'object'
        },
        setters: {
            /**
             * Config.
             *
             * @param {object}
             */
            config: 'object'
        }
    },
    serviceBuilder: {
        methods: {
            /**
             * Define a service.
             * Process all the service handlers for a definition.
             *
             * @param {object} service The service definition.
             * @return {object} The handled definition.
             */
            define: {
                arguments: ['object/service'],
                returns: 'object'
            },
            /**
             * Merge 2 service definitions.
             *
             * @param {object} parent The parent definition.
             * @param {object} child The child definition.
             * @return {object} The child merged definition.
             */
            merge: {
                arguments: ['object/parent', 'object/child'],
                returns: 'object'
            },
            /**
             * Instanciate a service.
             *
             * @param {object|null} instance The service instance.
             * @param {object} service The service definition.
             * @return {object|null} The handled instance.
             */
            instantiate: {
                arguments: ['object|null/instance', 'object/definition'],
                returns: 'object|null'
            },
            /**
             * Finalize a service.
             *
             * @param {object} instance The service instance.
             * @param {object} service The service definition.
             * @return {object} The handled instance.
             */
            finalize: {
                arguments: ['object|null/instance', 'object/definition'],
                returns: 'object'
            },
            /**
             * Update a service.
             *
             * @param {object} instance The service instance.
             * @param {object} service The service definition.
             * @return {object} The handled instance.
             */
            update: {
                arguments: ['object/instance', 'object/definition'],
                returns: 'object'
            }
        },
        getters: {
            /**
             * Contract its handled parameters should respect.
             *
             * @return {object}
             */
            contract: 'object',
            /**
             * Define order of execution.
             *
             * @return {number|null}
             */
            defineOrder: 'number|null',
            /**
             * Instantiate order of execution.
             *
             * @return {number|null}
             */
            instantiateOrder: 'number|null'
        }

    },
    provider: {
        methods: {
            /**
             * Provide an object.
             *
             * @param {object} properties The properties to inject to the provided object.
             * @return {object} The object.
             */
            provide: {
                arguments: ['object|null/properties'],
                returns: 'object'
            }
        },
        getters: {
            /**
             * Object provided type.
             *
             * @return {string}
             */
            providedType: 'string'
        }
    }
};
});

define('node_modules/danf/config/common/dependency-injection/services',['require','exports','module'],function (require, exports, module) {'use strict';

module.exports = {
    configuration: {
        children: {
            sectionProcessor: {
                parent: 'danf:configuration.sectionProcessor',
                children: {
                    services: {
                        class: 'danf:dependencyInjection.configuration.sectionProcessor.services',
                        properties: {
                            name: 'services',
                            servicesContainer: '#danf:dependencyInjection.servicesContainer#'
                        }
                    }
                }
            }
        }
    },
    referenceType: {
        collections: ['danf:manipulation.referenceType'],
        class: 'danf:manipulation.referenceType',
        children: {
            service: {
                properties: {
                    name: '#',
                    delimiter: '#',
                    allowsConcatenation: false
                }
            },
            serviceFactory: {
                properties: {
                    name: '>',
                    delimiter: '>',
                    size: 3,
                    allowsConcatenation: false
                }
            },
            serviceCollection: {
                properties: {
                    name: '&',
                    delimiter: '&',
                    allowsConcatenation: false
                }
            }
        }
    },
    objectProvider: {
        class: 'danf:dependencyInjection.objectProvider',
        properties: {
            interfacer: '#danf:object.interfacer#',
            classesContainer: '#danf:object.classesContainer#',
            debug: '%danf:context.debug%'
        },
        abstract: true
    },
    registry: {
        class: 'danf:dependencyInjection.registry',
        properties: {
            interfacer: '#danf:object.interfacer#'
        },
        abstract: true
    }
};
});

define('node_modules/danf/lib/common/dependency-injection/object-provider',['require','exports','module','node_modules/danf/lib/common/utils'],function (require, exports, module) {'use strict';

/**
 * Expose `ObjectProvider`.
 */
module.exports = ObjectProvider;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils');

/**
 * Initialize a new object provider.
 */
function ObjectProvider() {
    this.properties = {};
    this.debug = true;
}

ObjectProvider.defineImplementedInterfaces(['danf:dependencyInjection.provider']);

ObjectProvider.defineDependency('_class', 'function');
ObjectProvider.defineDependency('_interface', 'string|null');
ObjectProvider.defineDependency('_properties', 'mixed_object');
ObjectProvider.defineDependency('_debug', 'boolean');
ObjectProvider.defineDependency('_interfacer', 'danf:object.interfacer');
ObjectProvider.defineDependency('_classesContainer', 'danf:object.classesContainer');

/**
 * Init.
 */
ObjectProvider.prototype.__init = function() {
    if ('string' === typeof this._class && this._classesContainer) {
        this._class = this._classesContainer.get(this._class);
    }
    if ('function' === typeof this._class && this._interface) {
        checkInterface(this._class, this._interface);
    }
}

/**
 * Interface the class should implement (optional).
 *
 * @var {string}
 * @api public
 */
Object.defineProperty(ObjectProvider.prototype, 'interface', {
    set: function(interface_) {
        this._interface = interface_;

        this.__init();
    }
});

/**
 * Class of provided instances.
 *
 * @var {danf:object.interfacer}
 * @api public
 */
Object.defineProperty(ObjectProvider.prototype, 'class', {
    set: function(class_) {
        this._class = class_;

        this.__init();
    }
});

/**
 * Properties.
 *
 * @var {mixed_object}
 * @api public
 */
Object.defineProperty(ObjectProvider.prototype, 'properties', {
    set: function(properties) { this._properties = properties; }
});

/**
 * Whether or not the debug mode is active.
 *
 * @var {boolean}
 * @api public
 */
Object.defineProperty(ObjectProvider.prototype, 'debug', {
    set: function(debug) { this._debug = debug; }
});

/**
 * @interface {danf:dependencyInjection.provider}
 */
Object.defineProperty(ObjectProvider.prototype, 'providedType', {
    get: function() { return this._interface || 'object'; }
});

/**
 * Interfacer.
 *
 * @var {danf:object.interfacer}
 * @api public
 */
Object.defineProperty(ObjectProvider.prototype, 'interfacer', {
    set: function(interfacer) { this._interfacer = interfacer; }
});

/**
 * Classes container.
 *
 * @var {danf:object.classesContainer}
 * @api public
 */
Object.defineProperty(ObjectProvider.prototype, 'classesContainer', {
    set: function(classesContainer) {
        this._classesContainer = classesContainer;

        this.__init();
    }
});

/**
 * @interface {danf:dependencyInjection.provider}
 */
ObjectProvider.prototype.provide = function(properties) {
    var object = new this._class(),
        properties = utils.merge(this._properties, properties || {})
    ;

    for (var name in properties) {
        object[name] = properties[name];
    }

    // Check that all dependencies have been passed.
    if (this._debug) {
        Object.checkDependencies(object);
    }

    // Call __init method.
    if ('function' === typeof object.__init) {
        object.__init();
    }

    return (this._debug && this._interface)
        ? this._interfacer.addProxy(object, this._interface)
        : object
    ;
}

/**
 * Check if the class implements the interface.
 *
 * @param {function} class_ The class.
 * @param {string} interface_ The interface.
 * @throw {error} If the class does not implement the interface.
 * @api private
 */
var checkInterface = function(class_, interface_) {
    try {
        var object = Object.create(class_);

        Object.checkType(object, interface_);
    } catch (error) {
        if (error.instead) {
            throw new Error('The provided object should be {0}; {1} given instead.'.format(
                error.expected,
                error.instead
            ));
        }

        throw error;
    }
}
});

define('node_modules/danf/lib/common/dependency-injection/registry',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/manipulation/registry'],function (require, exports, module) {'use strict';

/**
 * Expose `Registry`.
 */
module.exports = Registry;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    BaseRegistry = require('node_modules/danf/lib/common/manipulation/registry')
;

/**
 * Initialize a new registry.
 */
function Registry() {
    BaseRegistry.call(this);
}

utils.extend(BaseRegistry, Registry);

Registry.defineImplementedInterfaces(['danf:dependencyInjection.provider']);

Registry.defineDependency('_interface', 'string|null');
Registry.defineDependency('_interfacer', 'danf:object.interfacer');

/**
 * Interface of instances (optional).
 *
 * @var {string}
 * @api public
 */
Object.defineProperty(Registry.prototype, 'interface', {
    set: function(interface_) {
        this._interface = interface_;

        if (this._interface) {
            for (var name in this._items) {
                checkInterface(this._items[name], this._interface);
            }
        }
    }
});

/**
 * @interface {danf:dependencyInjection.provider}
 */
Object.defineProperty(Registry.prototype, 'providedType', {
    get: function() { return this._interface; }
});

/**
 * Interfacer.
 *
 * @var {danf:object.interfacer}
 * @api public
 */
Object.defineProperty(Registry.prototype, 'interfacer', {
    set: function(interfacer) { this._interfacer = interfacer; }
});

/**
 * @interface {danf:manipulation.registry}
 */
Registry.prototype.register = function(name, item) {
    checkInterface(item, this._interface);

    this._items[name] = item;
}

/**
 * @interface {danf:dependencyInjection.provider}
 */
Registry.prototype.provide = function() {
    var args = Array.prototype.slice.call(arguments, 1, 2);

    return this.get(args[0]);
}

/**
 * Check if the class implements the interface.
 *
 * @param {function} class_ The class.
 * @param {string} interface_ The interface.
 * @throw {error} If the class does not implement the interface.
 * @api private
 */
var checkInterface = function(class_, interface_) {
    try {
        if (interface_) {
            Object.checkType(item, interface_);
        }
    } catch (error) {
        if (error.instead) {
            throw new Error('The registered object should be {0}; {1} given instead.'.format(
                error.expected,
                error.instead
            ));
        }

        throw error;
    }
}
});

define('node_modules/danf/config/common/dependency-injection/classes',['require','exports','module','node_modules/danf/lib/common/dependency-injection/services-container','node_modules/danf/lib/common/dependency-injection/object-provider','node_modules/danf/lib/common/dependency-injection/registry','node_modules/danf/lib/common/dependency-injection/service-builder/abstract-service-builder','node_modules/danf/lib/common/dependency-injection/service-builder/abstract','node_modules/danf/lib/common/dependency-injection/service-builder/alias','node_modules/danf/lib/common/dependency-injection/service-builder/children','node_modules/danf/lib/common/dependency-injection/service-builder/class','node_modules/danf/lib/common/dependency-injection/service-builder/declinations','node_modules/danf/lib/common/dependency-injection/service-builder/factories','node_modules/danf/lib/common/dependency-injection/service-builder/parent','node_modules/danf/lib/common/dependency-injection/service-builder/properties','node_modules/danf/lib/common/dependency-injection/service-builder/collections','node_modules/danf/lib/common/dependency-injection/configuration/section-processor/services'],function (require, exports, module) {'use strict';

module.exports = {
    servicesContainer: require('node_modules/danf/lib/common/dependency-injection/services-container'),
    objectProvider: require('node_modules/danf/lib/common/dependency-injection/object-provider'),
    registry: require('node_modules/danf/lib/common/dependency-injection/registry'),
    serviceBuilder: {
        abstractServiceBuilder: require('node_modules/danf/lib/common/dependency-injection/service-builder/abstract-service-builder'),
        abstract: require('node_modules/danf/lib/common/dependency-injection/service-builder/abstract'),
        alias: require('node_modules/danf/lib/common/dependency-injection/service-builder/alias'),
        children: require('node_modules/danf/lib/common/dependency-injection/service-builder/children'),
        class: require('node_modules/danf/lib/common/dependency-injection/service-builder/class'),
        declinations: require('node_modules/danf/lib/common/dependency-injection/service-builder/declinations'),
        factories: require('node_modules/danf/lib/common/dependency-injection/service-builder/factories'),
        parent: require('node_modules/danf/lib/common/dependency-injection/service-builder/parent'),
        properties: require('node_modules/danf/lib/common/dependency-injection/service-builder/properties'),
        collections: require('node_modules/danf/lib/common/dependency-injection/service-builder/collections')
    },
    configuration: {
        sectionProcessor: {
            services: require('node_modules/danf/lib/common/dependency-injection/configuration/section-processor/services')
        }
    }
};
});

define('node_modules/danf/config/common/event/interfaces',['require','exports','module'],function (require, exports, module) {'use strict';

module.exports = {
    notifier: {
        methods: {
            /**
             * Add an event listener.
             *
             * @param {danf:event.event} event The event.
             */
            addListener: {
                arguments: ['danf:event.event/event']
            },
            /**
             * Notify an event triggering.
             *
             * @param {danf:event.event} event The event.
             * @param {mixed} data The data associated with the triggered event.
             */
            notify: {
                arguments: ['danf:event.event/event', 'mixed/data']
            },
            /**
             * Merge a field of contract.
             *
             * @param {string} field The name of the field.
             * @param {mixed} parentValue The parent value.
             * @param {mixed} childValue The child value.
             */
            mergeContractField: {
                arguments: [
                    'string/field',
                    'mixed/parentValue',
                    'mixed/childValue'
                ]
            }
        },
        getters: {
            /**
             * Identifier name.
             *
             * @return {string}
             */
            name: 'string',
            /**
             * Contract that an event should respect in the configuration.
             *
             * @return {object}
             */
            contract: 'object'
        }
    },
    referencesResolver: {
        methods: {
            /**
             * Resolve references.
             *
             * @param {mixed} source The source of references.
             * @param {mixed} context The resolving context.
             * @param {string|null} inText An optionnal text specifying where the reference is declared (errors).
             * @return {mixed} The resolved references.
             */
            resolve: {
                arguments: [
                    'mixed/source',
                    'mixed/context',
                    'string|null/inText'
                ],
                returns: 'mixed'
            },
            /**
             * Resolve references of a specific type.
             *
             * @param {string} source The source of references.
             * @param {string} type The identifier of a reference type.
             * @param {mixed} context The resolving context.
             * @param {string|null} inText An optionnal text specifying where the reference is declared (errors).
             * @return {mixed} The resolved references.
             */
            resolveSpecific: {
                arguments: [
                    'string/source',
                    'string/type',
                    'mixed/context',
                    'string|null/inText'
                ],
                returns: 'mixed'
            }
        }
    },
    sequence: {
        methods: {
            /**
             * Execute the sequence.
             *
             * @param {object} input The input of the sequence.
             * @param {object} context The context of execution.
             * @param {string|null} scope The scope of execution in the stream.
             * @param {function|null} callback The optional callback.
             */
            execute: {
                arguments: [
                    'object/input',
                    'object/context',
                    'string|null/scope',
                    'function|null/callback'
                ]
            },
            /**
             * Execute the sequence from a forwarded execution.
             *
             * @param {danf:manipulation.flow} flow The current flow of execution.
             * @param {function|null} callback The optional callback.
             */
            forward: {
                arguments: [
                    'danf:manipulation.flow/flow',
                    'function|null/callback'
                ]
            }
        }
    },
    event: {
        methods: {
            /**
             * Trigger the execution of the event.
             *
             * @param {object|null} data The optional data related to the event.
             */
            trigger: {
                arguments: ['object|null/data']
            }
        },
        getters: {
            /**
             * Identifier name.
             *
             * @return {danf:event.notifier}
             */
            name: 'string',
            /**
             * Parameters.
             *
             * @return {object}
             */
            parameters: 'object',
            /**
             * Sequence.
             *
             * @return {danf:event.sequence}
             */
            sequence: 'danf:event.sequence'
        },
        setters: {
            /**
             * Notifier.
             *
             * @param {danf:event.notifier}
             */
            notifier: 'danf:event.notifier'
        }

    },
    sequencesContainer: {
        methods: {
            /**
             * Set an alias to a service.
             *
             * @param {string} alias The alias.
             * @param {string} id The id of the service.
             */
            setAlias: {
                arguments: ['string/alias', 'string/id']
            },
            /**
             * Set the definition of a service.
             *
             * @param {string} id The id of the service.
             * @param {object} definition The definition.
             */
            setDefinition: {
                arguments: ['string/id', 'object/definition']
            },
            /**
             * Get the definition of a service.
             *
             * @param {string} id The id of the service.
             * @return {object} The definition.
             */
            getDefinition: {
                arguments: ['string/id'],
                returns: 'object'
            },
            /**
             * Whether or not a service is defined.
             *
             * @param {string} id The id of the service.
             * @return {boolean} True if the service is defined, false otherwise.
             */
            hasDefinition: {
                arguments: ['string/id'],
                returns: 'boolean'
            },
            /**
             * Get the interpretation of a service.
             *
             * @param {string} id The id of the service.
             * @return {object} The interpretation.
             */
            getInterpretation: {
                arguments: ['string/id'],
                returns: 'object'
            },
            /**
             * Whether or not a service is interpreted.
             *
             * @param {string} id The id of the service.
             * @return {boolean} True if the service is interpreted, false otherwise.
             */
            hasInterpretation: {
                arguments: ['string/id'],
                returns: 'boolean'
            },
            /**
             * Build the definitions of the services and instantiate the corresponding services.
             *
             * @param {boolean} reset Whether or not resetting the list of existent services.
             */
            build: {
                arguments: ['boolean/reset']
            },
            /**
             * Get the instantiation of a service (lazy instantiation).
             *
             * @param {string} id The id of the service.
             * @return {object} The service object.
             */
            get: {
                arguments: ['string/id'],
                returns: 'object'
            },
            /**
             * Whether or not a service is instantiated.
             *
             * @param {string} id The id of the service.
             * @return {boolean} True if the service is instantiated, false otherwise.
             */
            has: {
                arguments: ['string/id'],
                returns: 'boolean'
            }
        },
        getters: {
            /**
             * Config handled parameters.
             *
             * @return {object}
             */
            handledParameters: 'object'
        }
    },
    eventsContainer: {
        methods: {
            /**
             * Set an alias to a service.
             *
             * @param {string} alias The alias.
             * @param {string} type The type of the event.
             * @param {string} id The id of the service.
             */
            setAlias: {
                arguments: ['string/alias', 'string/type', 'string/id']
            },
            /**
             * Set the definition of a service.
             *
             * @param {string} type The type of the event.
             * @param {string} id The id of the service.
             * @param {object} definition The definition.
             */
            setDefinition: {
                arguments: ['string/type', 'string/id', 'object/definition']
            },
            /**
             * Get the definition of a service.
             *
             * @param {string} type The type of the event.
             * @param {string} id The id of the service.
             * @return {object} The definition.
             */
            getDefinition: {
                arguments: ['string/type', 'string/id'],
                returns: 'object'
            },
            /**
             * Whether or not a service is defined.
             *
             * @param {string} type The type of the event.
             * @param {string} id The id of the service.
             * @return {boolean} True if the service is defined, false otherwise.
             */
            hasDefinition: {
                arguments: ['string/type', 'string/id'],
                returns: 'boolean'
            },
            /**
             * Build the definitions of the services and instantiate the corresponding services.
             *
             * @param {boolean} reset Whether or not resetting the list of existent services.
             */
            build: {
                arguments: ['boolean/reset']
            },
            /**
             * Get the instantiation of a service (lazy instantiation).
             *
             * @param {string} type The type of the event.
             * @param {string} id The id of the service.
             * @return {object} The service object.
             */
            get: {
                arguments: ['string/type', 'string/id'],
                returns: 'object'
            },
            /**
             * Whether or not a service is instantiated.
             *
             * @param {string} type The type of the event.
             * @param {string} id The id of the service.
             * @return {boolean} True if the service is instantiated, false otherwise.
             */
            has: {
                arguments: ['string/type', 'string/id'],
                returns: 'boolean'
            }
        }
    },
    collectionInterpreter: {
        methods: {
            /**
             * Interpret an operation on collection.
             *
             * @param {danf:manipulation.flow} flow The flow.
             * @param {function} callback The final callback.
             * @param {function} operation The operation.
             * @param {string|null} scope The optional scope.
             * @param {function|null} tributaryCallback The optional callback for the operation.
             * @param {array|object} operationArguments The arguments of the operation.
             * @param {function} retrieveContext The function allowing to retrieve the context.
             * @param {function} executeOperation The function allowing to execute the operation.
             * @param {function} endOperation The function allowing to end the operation.
             */
            interpret: {
                arguments: [
                    'danf:manipulation.flow/flow',
                    'function/callback',
                    'object/operation',
                    'string|null/scope',
                    'function|null/tributaryCallback',
                    'array|object/operationArguments',
                    'function/retrieveContext',
                    'function/executeOperation',
                    'function/endOperation'
                ]
            }
        },
        getters: {
            /**
             * Contract that a collection should respect in the configuration.
             *
             * @return {object}
             */
            contract: 'object'
        }
    },
    sequenceInterpreter: {
        methods: {
            /**
             * Build the sequencing shared context.
             *
             * @param {object} context The sequencing shared context.
             * @param {object} definition The definition of the sequence.
             */
            buildContext: {
                arguments: [
                    'object/context',
                    'object/definition'
                ]
            },
            /**
             * Interpret an operation on collection.
             *
             * @param {array} interpretation The interpretation of the sequence.
             * @param {object} definition The definition of the sequence.
             * @param {object} context The sequencing shared context.
             */
            interpret: {
                arguments: [
                    'array/interpretation',
                    'object/definition',
                    'object/context'
                ]
            }
        },
        getters: {
            /**
             * Contract that a sequence should respect in the configuration.
             *
             * @return {object}
             */
            contract: 'object',
            /**
             * Order of interpretation.
             *
             * @return {number}
             */
            order: 'number'
        },
        setters: {
            /**
             * Sequences container.
             *
             * @param {danf:event.sequencesContainer}
             */
            sequencesContainer: 'danf:event.sequencesContainer'
        }
    },
    flowContext: {
        extends: 'danf:manipulation.map'
    },
    logger: {
        methods: {
            /**
             * Log a message.
             *
             * @param {string} message The message.
             * @param {number} verbosity The verbosity level.
             * @param {number} indentation The indentation level.
             * @param {number|null} tributary The tributary.
             * @param {number|null} level The current logging level.
             * @param {date|null} startedAt The start date of the task.
             */
            log: {
                arguments: [
                    'string/message',
                    'number/verbosity',
                    'number/indentation',
                    'number|null/tributary',
                    'number|null/level',
                    'date|null/startedAt'
                ]
            }
        }
    }
};
});

define('node_modules/danf/config/common/event/services',['require','exports','module'],function (require, exports, module) {'use strict';

module.exports = {
    logger: {
        class: 'danf:event.logger',
        properties: {
            logger: '#danf:logging.logger#'
        }
    },
    flowContext: {
        class: 'danf:event.flowContext'
    },
    referencesResolver: {
        class: 'danf:event.referencesResolver',
        properties: {
            referenceResolver: '#danf:manipulation.referenceResolver#',
            flowContext: '#danf:event.flowContext#',
        }
    },
    sequenceProvider: {
        parent: 'danf:dependencyInjection.objectProvider',
        properties: {
            class: 'danf:event.sequence',
            interface: 'danf:event.sequence',
            properties: {
                mapProvider: '#danf:manipulation.mapProvider#',
                flowProvider: '#danf:manipulation.flowProvider#',
                uniqueIdGenerator: '#danf:manipulation.uniqueIdGenerator#'
            }
        }
    },
    eventProvider: {
        parent: 'danf:dependencyInjection.objectProvider',
        properties: {
            class: 'danf:event.event',
            interface: 'danf:event.event'
        }
    },
    sequencesContainer: {
        class: 'danf:event.sequencesContainer',
        properties: {
            flowDriver: '#danf:manipulation.flowDriver#',
            sequenceProvider: '#danf:event.sequenceProvider#',
            sequenceInterpreters: '&danf:event.sequenceInterpreter&'
        },
        registry: {
            method: 'get',
            namespace: [0]
        }
    },
    eventsContainer: {
        class: 'danf:event.eventsContainer',
        properties: {
            sequencesContainer: '#danf:event.sequencesContainer#',
            eventProvider: '#danf:event.eventProvider#',
            notifiers: '&danf:event.notifier&'
        },
        registry: {
            method: 'get',
            namespace: [1]
        }
    },
    collectionInterpreter: {
        class: 'danf:event.collectionInterpreter',
        properties: {
            referencesResolver: '#danf:event.referencesResolver#',
            flowDriver: '#danf:manipulation.flowDriver#',
            logger: '#danf:event.logger#',
            asynchronousCollections: '&danf:manipulation.asynchronousCollection&'
        }
    },
    sequenceInterpreter: {
        collections: ['danf:event.sequenceInterpreter'],
        properties: {
            logger: '#danf:event.logger#'
        },
        children: {
            abstract: {
                abstract: true
            },
            alias: {
                class: 'danf:event.sequenceInterpreter.alias'
            },
            children: {
                class: 'danf:event.sequenceInterpreter.children',
                properties: {
                    uniqueIdGenerator: '#danf:manipulation.uniqueIdGenerator#',
                    referencesResolver: '#danf:event.referencesResolver#',
                    collectionInterpreter: '#danf:event.collectionInterpreter#'
                }
            },
            collections: {
                class: 'danf:event.sequenceInterpreter.collections'
            },
            stream: {
                class: 'danf:event.sequenceInterpreter.stream',
                properties: {
                    dataResolver: '#danf:manipulation.dataResolver#'
                }
            },
            operations: {
                class: 'danf:event.sequenceInterpreter.operations',
                properties: {
                    referencesResolver: '#danf:event.referencesResolver#',
                    servicesContainer: '#danf:dependencyInjection.servicesContainer#',
                    collectionInterpreter: '#danf:event.collectionInterpreter#'
                }
            },
            parents: {
                class: 'danf:event.sequenceInterpreter.parents',
                properties: {
                    uniqueIdGenerator: '#danf:manipulation.uniqueIdGenerator#',
                    referencesResolver: '#danf:event.referencesResolver#',
                    collectionInterpreter: '#danf:event.collectionInterpreter#'
                }
            }
        }
    },
    notifier: {
        collections: ['danf:event.notifier'],
        properties: {
            dataResolver: '#danf:manipulation.dataResolver#'
        },
        children: {
            abstract: {
                abstract: true
            },
            event: {
                class: 'danf:event.notifier.event'
            }
        }
    },
    configuration: {
        children: {
            sectionProcessor: {
                parent: 'danf:configuration.sectionProcessor',
                children: {
                    events: {
                        class: 'danf:event.configuration.sectionProcessor.events',
                        properties: {
                            name: 'events',
                            collectionInterpreter: '#danf:event.collectionInterpreter#',
                            notifiers: '&danf:event.notifier&'
                        }
                    },
                    sequences: {
                        class: 'danf:event.configuration.sectionProcessor.sequences',
                        properties: {
                            name: 'sequences',
                            sequenceInterpreters: '&danf:event.sequenceInterpreter&'
                        }
                    }
                }
            }
        }
    }
};
});

define('node_modules/danf/lib/common/event/references-resolver',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `ReferencesResolver`.
 */
module.exports = ReferencesResolver;

/**
 * Initialize a new sequences references resolver.
 */
function ReferencesResolver() {
}

ReferencesResolver.defineImplementedInterfaces(['danf:event.referencesResolver']);

ReferencesResolver.defineDependency('_referenceResolver', 'danf:manipulation.referenceResolver');
ReferencesResolver.defineDependency('_flowContext', 'danf:event.flowContext');
ReferencesResolver.defineDependency('_config', 'object');

/**
 * Reference resolver.
 *
 * @var {danf:manipulation.referenceResolver}
 * @api public
 */
Object.defineProperty(ReferencesResolver.prototype, 'referenceResolver', {
    set: function(referenceResolver) {
        this._referenceResolver = referenceResolver
    }
});

/**
 * Flow context.
 *
 * @var {danf:event.flowContext}
 * @api public
 */
Object.defineProperty(ReferencesResolver.prototype, 'flowContext', {
    set: function(flowContext) {
        this._flowContext = flowContext
    }
});

/**
 * Config.
 *
 * @var {object}
 * @api public
 */
Object.defineProperty(ReferencesResolver.prototype, 'config', {
    set: function(config) { this._config = config; }
});

/**
 * @interface {danf:event.referencesResolver}
 */
ReferencesResolver.prototype.resolve = function(source, context, inText) {
    var resolvedReferences = source;

    if (source && 'object' === typeof source) {
        resolvedReferences = Array.isArray(source) ? [] : {};

        for (var key in source) {
            resolvedReferences[key] = this.resolve(source[key], context);
        }
    } else if ('string' === typeof resolvedReferences) {
        resolvedReferences = this._referenceResolver.resolve(resolvedReferences, '@', context, inText);

        if ('string' === typeof resolvedReferences) {
            resolvedReferences = this._referenceResolver.resolve(resolvedReferences, '$', this._config, inText);
        }

        if ('string' === typeof resolvedReferences) {
            resolvedReferences = this._referenceResolver.resolve(resolvedReferences, '!', this._flowContext.getAll(), inText);
        }
    }

    return resolvedReferences;
}

/**
 * @interface {danf:event.referencesResolver}
 */
ReferencesResolver.prototype.resolveSpecific = function(source, type, context, inText) {
    var resolvedReferences = source;

    if (source && 'object' === typeof source) {
        resolvedReferences = Array.isArray(source) ? [] : {};

        for (var key in source) {
            resolvedReferences[key] = this.resolve(source[key], context);
        }
    } else if ('string' === typeof resolvedReferences) {
        resolvedReferences = this._referenceResolver.resolve(resolvedReferences, type, context, inText);
    }

    return resolvedReferences;
}
});

define('node_modules/danf/lib/common/event/sequence',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `Sequence`.
 */
module.exports = Sequence;

/**
 * Static variable allowing to handle the asynchronous flow.
 *
 * @var {object}
 */
var __async = {};

/**
 * Call an async method.
 *
 * @param {object} target The async object.
 * @param {string|null} scope The scope.
 * @param {mixed...} arg1...N The arguments to pass to the method.
 */
if (!Function.prototype.__asyncCall) {
    Function.prototype.__asyncCall = function(target, scope) {
        var args = Array.prototype.slice.call(arguments, 2),
            self = this,
            flow = __async.flow,
            tributary = flow.addTributary(scope),
            result
        ;

        target.__asyncProcess(function(returnAsync) {
            result = self.apply(target, args);

            if (undefined !== result) {
                returnAsync(result);
            } else {
                returnAsync(function(stream) {
                    return stream;
                });
            }
        });

        flow.mergeTributary(tributary);

        return result;
    };
}

/**
 * Call an async method.
 *
 * @param {object} target The async object.
 * @param {string|null} scope The scope.
 * @param {mixed_array} arg1...N The arguments to pass to the method.
 * @param {function|null} format An optional function to format resulting stream.
 * @param {function|null} format An optional callback.
 */
if (!Function.prototype.__asyncApply) {
    Function.prototype.__asyncApply = function(target, scope, args, format, callback) {
        var self = this,
            flow = __async.flow,
            tributary = flow.addTributary(scope, format, callback),
            result
        ;

        target.__asyncProcess(function(returnAsync) {
            result = self.apply(target, args);

            if (undefined !== result) {
                returnAsync(result);
            } else {
                returnAsync(function(stream) {
                    return stream;
                });
            }
        });

        flow.mergeTributary(tributary);

        return result;
    };
}

/**
 * Get/set the current async flow.
 *
 * @param {object} asyncFlow The current async flow.
 * @api public
 */
if (!Object.getOwnPropertyDescriptor(Object.prototype, '__asyncFlow')) {
    Object.defineProperty(Object.prototype, '__asyncFlow', {
        get: function() { return __async.flow; },
        set: function(asyncFlow) {
            // Handle strange behavior of Object.getOwnPropertyNames().
            if (asyncFlow === true) {
                return;
            }

            __async.flow = asyncFlow;
        }
    });
}

/**
 * Process an async task.
 *
 * @param {function} callback The task callback.
 * @api public
 */
if (!Object.getOwnPropertyDescriptor(Object.prototype, '__asyncProcess')) {
    Object.defineProperty(Object.prototype, '__asyncProcess', {
        value: function(callback) {
            var flow = __async.flow,
                task = flow.wait(),
                end = function(returnedValue) {
                    flow.end(task, returnedValue);
                }
            ;

            callback.call(this, end);
        }
    });
}

/**
 * Initialize a new sequence.
 */
function Sequence() {
}

Sequence.defineImplementedInterfaces(['danf:event.sequence']);

Sequence.defineDependency('_operation', 'function');
Sequence.defineDependency('_flowProvider', 'danf:dependencyInjection.provider', 'danf:manipulation.flow');
Sequence.defineDependency('_mapProvider', 'danf:dependencyInjection.provider', 'danf:manipulation.map');
Sequence.defineDependency('_uniqueIdGenerator', 'danf:manipulation.uniqueIdGenerator');

/**
 * Main operation of the sequence.
 *
 * @var {function}
 * @api public
 */
Object.defineProperty(Sequence.prototype, 'operation', {
    set: function(operation) { this._operation = operation; }
});

/**
 * Flow provider.
 *
 * @var {danf:manipulation.provider<danf:manipulation.flow>}
 * @api public
 */
Object.defineProperty(Sequence.prototype, 'flowProvider', {
    set: function(flowProvider) { this._flowProvider = flowProvider; }
});

/**
 * Map provider.
 *
 * @var {danf:manipulation.provider<danf:manipulation.map>}
 * @api public
 */
Object.defineProperty(Sequence.prototype, 'mapProvider', {
    set: function(mapProvider) { this._mapProvider = mapProvider; }
});

/**
 * Unique id generator.
 *
 * @var {danf:manipulation.uniqueIdGenerator}
 * @api public
 */
Object.defineProperty(Sequence.prototype, 'uniqueIdGenerator', {
    set: function(uniqueIdGenerator) {
        this._uniqueIdGenerator = uniqueIdGenerator
    }
});

/**
 * @interface {danf:event.sequence}
 */
Sequence.prototype.execute = function(input, context, scope, callback) {
    var contextMap = this._mapProvider.provide({name: 'flow'});

    for (var key in context) {
        contextMap.set(key, context[key]);
    }

    var flow = this._flowProvider.provide({
            id: this._uniqueIdGenerator.generate(),
            stream: input,
            scope: scope,
            context: contextMap,
            callback: callback
        })
    ;

    return this._operation(flow);
}

/**
 * @interface {danf:event.sequence}
 */
Sequence.prototype.forward = function(flow, callback) {
    return this._operation(flow, callback);
}
});

define('node_modules/danf/lib/common/event/event',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `Event`.
 */
module.exports = Event;

/**
 * Initialize a new event.
 */
function Event() {
}

Event.defineImplementedInterfaces(['danf:event.event']);

Event.defineDependency('_name', 'string');
Event.defineDependency('_parameters', 'object');
Event.defineDependency('_sequence', 'danf:event.sequence');
Event.defineDependency('_notifier', 'danf:event.notifier');

/**
 * @interface {danf:event.event}
 */
Object.defineProperty(Event.prototype, 'name', {
    set: function(name) { this._name = name; },
    get: function() { return this._name; }
});

/**
 * @interface {danf:event.event}
 */
Object.defineProperty(Event.prototype, 'parameters', {
    set: function(parameters) { this._parameters = parameters; },
    get: function() { return this._parameters; }
});

/**
 * @interface {danf:event.event}
 */
Object.defineProperty(Event.prototype, 'sequence', {
    set: function(sequence) { this._sequence = sequence; },
    get: function() { return this._sequence; }
});

/**
 * @interface {danf:event.event}
 */
Object.defineProperty(Event.prototype, 'notifier', {
    set: function(notifier) { this._notifier = notifier; },
    get: function() { return this._notifier; }
});

/**
 * @interface {danf:event.event}
 */
Event.prototype.trigger = function(data) {
    this._notifier.notify(this, null != data ? data : {});
}
});

define('node_modules/danf/lib/common/event/sequences-container',['require','exports','module','node_modules/danf/lib/common/utils'],function (require, exports, module) {'use strict';

/**
 * Expose `SequencesContainer`.
 */
module.exports = SequencesContainer;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils');

/**
 * Initialize a new sequences container.
 */
function SequencesContainer() {
    this._definitions = {};
    this._context = {};
    this._sequenceInterpreters = [];
    this._handledParameters = {};

    resetSequences.call(this);
}

SequencesContainer.defineImplementedInterfaces(['danf:event.sequencesContainer', 'danf:manipulation.registryObserver']);

SequencesContainer.defineDependency('_flowDriver', 'danf:manipulation.flowDriver');
SequencesContainer.defineDependency('_sequenceProvider', 'danf:dependencyInjection.provider', 'danf:event.sequence');
SequencesContainer.defineDependency('_sequenceInterpreters', 'danf:event.sequenceInterpreter_array');

/**
 * Flow driver.
 *
 * @var {danf:manipulation.flowDriver}
 * @api public
 */
Object.defineProperty(SequencesContainer.prototype, 'flowDriver', {
    set: function(flowDriver) { this._flowDriver = flowDriver; }
});

/**
 * Sequence provider.
 *
 * @var {danf:dependencyInjection.provider<danf:manipulation.sequence>}
 * @api public
 */
Object.defineProperty(SequencesContainer.prototype, 'sequenceProvider', {
    set: function(sequenceProvider) { this._sequenceProvider = sequenceProvider; }
});

/**
 * Sequence provider.
 *
 * @var {danf:event.sequenceInterpreter_array}
 * @api public
 */
Object.defineProperty(SequencesContainer.prototype, 'sequenceInterpreters', {
    set: function(sequenceInterpreters) {
        for (var i in sequenceInterpreters) {
            this.addSequenceInterpreter(sequenceInterpreters[i]);
        }
    }
});

/**
 * @interface {danf:event.sequencesContainer}
 */
Object.defineProperty(SequencesContainer.prototype, 'handledParameters', {
    get: function() { return this._handledParameters }
});

/**
 * Add a sequence interpreter.
 *
 * @param {danf:event.sequenceInterpreter} sequenceInterpreter The sequence interpreter.
 * @api public
 */
SequencesContainer.prototype.addSequenceInterpreter = function(sequenceInterpreter) {
    Object.checkType(sequenceInterpreter, 'danf:event.sequenceInterpreter');

    var added = false,
        order = sequenceInterpreter.order
    ;

    // Set sequence container.
    sequenceInterpreter.sequencesContainer = this;

    // Register handled parameters.
    this._handledParameters = utils.merge(this._handledParameters, sequenceInterpreter.contract);

    // Register sequence interpreters.
    if (null != order) {
        for (var i = 0; i < this._sequenceInterpreters.length; i++) {
            var alreadyAddedSequenceInterpreter = this._sequenceInterpreters[i];

            if (order < alreadyAddedSequenceInterpreter.order) {
                this._sequenceInterpreters.splice(i, 0, sequenceInterpreter);
                added = true;

                break;
            }
        }

        if (!added) {
            this._sequenceInterpreters.push(sequenceInterpreter);
        }
    }
}

/**
 * @interface {danf:manipulation.registryObserver}
 */
SequencesContainer.prototype.handleRegistryChange = function(items, reset, name) {
    items = utils.clone(items);

    if (!reset) {
        // Register all the definitions.
        for (var id in items) {
            var definition = items[id];

            definition.id = id;
            this._definitions[id] = definition;
        }

        // Check not handled interpretation parameters.
        for (var id in this._definitions) {
            var definition = this._definitions[id];

            for (var parameter in definition) {
                if (!(parameter in {id: true}) && !(parameter in this._handledParameters)) {
                    throw new Error(
                        'The parameter "{0}" is not handled by any of the sequence interpreter in the interpretation of the sequence "{1}".'.format(
                            parameter,
                            id
                        )
                    );
                }
            }
        }

        // Instantiate the sequences.
        this.build(true);
    }
}

/**
 * @interface {danf:event.sequencesContainer}
 */
SequencesContainer.prototype.setAlias = function(alias, id) {
    this._aliases[alias] = id;
}

/**
 * @interface {danf:event.sequencesContainer}
 */
SequencesContainer.prototype.setDefinition = function(id, definition, rebuild) {
    definition.id = id;
    this._definitions[id] = definition;

    if (false !== rebuild) {
        this.build(true);
    }
}

/**
 * @interface {danf:event.sequencesContainer}
 */
SequencesContainer.prototype.getDefinition = function(id) {
    id = this._aliases[id] ? this._aliases[id] : id;

    if (!this.hasDefinition(id)) {
        throw new Error(
            'The sequence of id "{0}" does not exist.'.format(
                id
            )
        );
    }

    return this._definitions[id];
}

/**
 * @interface {danf:event.sequencesContainer}
 */
SequencesContainer.prototype.hasDefinition = function(id) {
    id = this._aliases[id] ? this._aliases[id] : id;

    return this._definitions[id] ? true : false;
}

/**
 * @interface {danf:event.sequencesContainer}
 */
SequencesContainer.prototype.getInterpretation = function(id) {
    id = this._aliases[id] ? this._aliases[id] : id;

    if (!this.hasInterpretation(id)) {
        this._interpretations[id] = interpret.call(
            this,
            this.getDefinition(id),
            this._context
        );
    }

    return this._interpretations[id];
}

/**
 * @interface {danf:event.sequencesContainer}
 */
SequencesContainer.prototype.hasInterpretation = function(id) {
    id = this._aliases[id] ? this._aliases[id] : id;

    return this._interpretations[id] ? true : false;
}

/**
 * @interface {danf:event.sequencesContainer}
 */
SequencesContainer.prototype.build = function(reset) {
    // Remove the built sequences.
    if (reset) {
        resetSequences.call(this);
    }

    // Build context.
    for (var id in this._definitions) {
        this._context = buildContext.call(this, this._context, this._definitions[id]);
    }

    // Interpret.
    for (var id in this._definitions) {
        if (!this.hasInterpretation(id)) {
            this._interpretations[id] = this.getInterpretation(id);
        }
    }

    // Build.
    for (var id in this._interpretations) {
        if (!this.has(id)) {
            this._sequences[id] = this.get(id);
            this._sequences[id].id = id;
        }
    }
}

/**
 * @interface {danf:event.sequencesContainer}
 */
SequencesContainer.prototype.get = function(id) {
    id = this._aliases[id] ? this._aliases[id] : id;

    if (!this.has(id)) {
        this._sequences[id] = build.call(this, this.getInterpretation(id));
        this._sequences[id].id = id;
    }

    return this._sequences[id];
}

/**
 * @interface {danf:event.sequencesContainer}
 */
SequencesContainer.prototype.has = function(id) {
    id = this._aliases[id] ? this._aliases[id] : id;

    return this._sequences[id] ? true : false;
}

/**
 * Reset the sequences.
 *
 * @api private
 */
var resetSequences = function() {
    this._context = {};
    this._interpretations = {};
    this._sequences = {};
    this._aliases = {};
}

/**
 * Build context for a sequence.
 *
 * @param {object} context The current context.
 * @param {object} definition The sequence definition.
 * @return {object} The new context.
 * @api private
 */
var buildContext = function(context, definition) {
    for (var i = 0; i < this._sequenceInterpreters.length; i++) {
        context = this._sequenceInterpreters[i].buildContext(context, definition);
    }

    return context;
}

/**
 * Interpret a sequence.
 *
 * @param {object} definition The sequence definition.
 * @return {object} The interpretation.
 * @api private
 */
var interpret = function(definition, context) {
    var interpretation = [];

    for (var i = 0; i < this._sequenceInterpreters.length; i++) {
        interpretation = this._sequenceInterpreters[i].interpret(
            interpretation,
            definition,
            context
        );
    }

    return interpretation;
}

/**
 * Build a sequence.
 *
 * @param {object} interpretation The sequence interpretation.
 * @return {function} The sequence.
 * @api private
 */
var build = function(interpretation) {
    var self = this,
        operations = []
    ;

    for (var i = 0; i < interpretation.length; i++) {
        operations.push(buildParallelOperations.call(this, interpretation[i].operations));
    }

    var operation = function(flow, callback) {
        var flowOperations = [];

        for (var i = 0; i < operations.length; i++) {
            (function(operation) {
                flowOperations.push(function(callback) {
                    return operation(flow, callback);
                });
            })(operations[i])
        }


        if (undefined === callback) {
            var task = flow.wait();

            callback = function() {
                flow.end(task);
            };
        }

        self._flowDriver.series(flowOperations, callback);
    };

    return this._sequenceProvider.provide({operation: operation});
}

/**
 * Build parallel operations of a sequence.
 *
 * @param {object} parallelOperations The operations.
 * @return {function} The sequence.
 * @api private
 */
var buildParallelOperations = function(operations) {
    var self = this;

    return function(flow, callback) {
        var flowOperations = [];

        for (var i = 0; i < operations.length; i++) {
            (function(operation) {
                flowOperations.push(function(callback) {
                    return operation(flow, callback);
                });
            })(operations[i])
        }

        var task = flow.wait(),
            parallelCallback = function() {
                flow.end(task);
                callback(null);
            }
        ;

        self._flowDriver.parallel(flowOperations, parallelCallback);
    };
}

});

define('node_modules/danf/lib/common/event/events-container',['require','exports','module','node_modules/danf/lib/common/utils'],function (require, exports, module) {'use strict';

/**
 * Expose `EventsContainer`.
 */
module.exports = EventsContainer;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils');

/**
 * Initialize a new events container.
 */
function EventsContainer() {
    this._definitions = {};
    this._notifiers = {};

    resetEvents.call(this);
}

EventsContainer.defineImplementedInterfaces(['danf:event.eventsContainer', 'danf:manipulation.registryObserver']);

EventsContainer.defineDependency('_sequencesContainer', 'danf:event.sequencesContainer');
EventsContainer.defineDependency('_eventProvider', 'danf:dependencyInjection.provider', 'danf:event.event');
EventsContainer.defineDependency('_notifiers', 'danf:event.notifier_object');

/**
 * Sequences container.
 *
 * @var {danf:event.sequencesContainer}
 * @api public
 */
Object.defineProperty(EventsContainer.prototype, 'sequencesContainer', {
    set: function(sequencesContainer) { this._sequencesContainer = sequencesContainer; }
});

/**
 * Event provider.
 *
 * @var {danf:dependencyInjection.provider<danf:event.event>}
 * @api public
 */
Object.defineProperty(EventsContainer.prototype, 'eventProvider', {
    set: function(eventProvider) { this._eventProvider = eventProvider; }
});

/**
 * Notifiers.
 *
 * @var {danf:event.notifier_array}
 * @api public
 */
Object.defineProperty(EventsContainer.prototype, 'notifiers', {
    set: function(notifiers) {
        this._notifiers = {};

        for (var i = 0; i < notifiers.length; i++) {
            this.setNotifier(notifiers[i]);
        }
    }
});

/**
 * Set a notifier.
 *
 * @param {danf:event.notifier} notifier The notifier.
 * @api public
 */
EventsContainer.prototype.setNotifier = function(notifier) {
    this._notifiers[notifier.name] = notifier;
    this._definitions[notifier.name] = {};
    this._events[notifier.name] = {};
    this._aliases[notifier.name] = {};
}

/**
 * @interface {danf:manipulation.registryObserver}
 */
EventsContainer.prototype.handleRegistryChange = function(items, reset, name) {
    if (!reset) {
        for (var type in items) {
            for (var id in items[type]) {
                this.setDefinition(type, id, items[type][id]);
            }
        }
    }

    this.build(false);
}

/**
 * @interface {danf:event.eventsContainer}
 */
EventsContainer.prototype.setAlias = function(alias, type, id) {
    checkTypeHandling.call(this, type);

    this._aliases[type][alias] = id;
}

/**
 * @interface {danf:event.eventsContainer}
 */
EventsContainer.prototype.setDefinition = function(type, id, definition) {
    checkTypeHandling.call(this, type);

    definition.id = id;
    this._definitions[type][id] = definition;
}

/**
 * @interface {danf:event.eventsContainer}
 */
EventsContainer.prototype.getDefinition = function(type, id) {
    checkTypeHandling.call(this, type);

    id = this._aliases[type][id] ? this._aliases[type][id] : id;

    if (!this.hasDefinition(type, id)) {
        throw new Error(
            'The event of type "{0}" and id "{1}" does not exist.'.format(
                type,
                id
            )
        );
    }

    return this._definitions[type][id];
}

/**
 * @interface {danf:event.eventsContainer}
 */
EventsContainer.prototype.hasDefinition = function(type, id) {
    checkTypeHandling.call(this, type);

    id = this._aliases[type][id] ? this._aliases[type][id] : id;

    return this._definitions[type][id] ? true : false;
}

/**
 * @interface {danf:event.eventsContainer}
 */
EventsContainer.prototype.build = function(reset) {
    // Remove the built events.
    if (reset) {
        resetEvents.call(this);
    }

    // Build.
    for (var type in this._definitions) {
        for (var id in this._definitions[type]) {
            if (!this.has(type, id)) {
                this._events[type][id] = this.get(type, id);
            }
        }
    }
}

/**
 * @interface {danf:event.eventsContainer}
 */
EventsContainer.prototype.get = function(type, id) {
    checkTypeHandling.call(this, type);

    id = this._aliases[type][id] ? this._aliases[type][id] : id;

    if (!this.has(type, id)) {
        var sequenceId = 'danf:event.{0}.{1}'.format(type, id),
            definition = this.getDefinition(type, id)
        ;

        this._sequencesContainer.setDefinition(
            sequenceId,
            {children: definition.sequences}
        );

        var notifier = getNotifier.call(this, type),
            sequence = this._sequencesContainer.get(sequenceId),
            event = this._eventProvider.provide({
                name: id,
                parameters: definition,
                sequence: sequence,
                notifier: notifier
            })
        ;

        notifier.addListener(event);

        this._events[type][id] = event;
    }

    return this._events[type][id];
}

/**
 * @interface {danf:event.eventsContainer}
 */
EventsContainer.prototype.has = function(type, id) {
    checkTypeHandling.call(this, type);

    id = this._aliases[type][id] ? this._aliases[type][id] : id;

    return this._events[type][id] ? true : false;
}

/**
 * Retrieve a notifier.
 *
 * @param {string} type The type handled by the notifier.
 * @return {danf:event.notifier} The notifier.
 * @throws {error} If the type is not handled.
 * @api private
 */
var getNotifier = function(type) {
    checkTypeHandling.call(this, type);

    return this._notifiers[type];
}

/**
 * Check if a type is handled.
 *
 * @param {string} type The type.
 * @throws {error} If the type is not handled.
 * @api private
 */
var checkTypeHandling = function(type) {
    if (undefined === this._notifiers[type]) {
        throw new Error(
            'No notifier found handling the event type "{0}".'.format(
                type
            )
        );
    }
}

/**
 * Reset the events.
 *
 * @api private
 */
var resetEvents = function() {
    this._events = {};
    this._aliases = {};
}
});

define('node_modules/danf/lib/common/event/collection-interpreter',['require','exports','module','node_modules/danf/lib/common/utils'],function (require, exports, module) {'use strict';

/**
 * Expose `CollectionInterpreter`.
 */
module.exports = CollectionInterpreter;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils');

/**
 * Initialize a new collection interpreter.
 */
function CollectionInterpreter() {
}

CollectionInterpreter.defineImplementedInterfaces(['danf:event.collectionInterpreter']);

CollectionInterpreter.defineDependency('_referencesResolver', 'danf:event.referencesResolver');
CollectionInterpreter.defineDependency('_flowDriver', 'danf:manipulation.flowDriver');
CollectionInterpreter.defineDependency('_logger', 'danf:event.logger');
CollectionInterpreter.defineDependency('_asynchronousCollections', 'danf:manipulation.asynchronousCollection_object');

/**
 * References resolver.
 *
 * @var {danf:event.referencesResolver}
 * @api public
 */
Object.defineProperty(CollectionInterpreter.prototype, 'referencesResolver', {
    set: function(referencesResolver) {
        this._referencesResolver = referencesResolver;
    }
});

/**
 * Flow driver.
 *
 * @var {danf:manipulation.flowDriver}
 * @api public
 */
Object.defineProperty(CollectionInterpreter.prototype, 'flowDriver', {
    set: function(flowDriver) {
        this._flowDriver = flowDriver;
    }
});

/**
 * Logger.
 *
 * @var {danf:logging.logger}
 * @api public
 */
Object.defineProperty(CollectionInterpreter.prototype, 'logger', {
    set: function(logger) {
        this._logger = logger
    }
});

/**
 * Asynchrounous collections.
 *
 * @var {danf:dependencyInjection.asynchronousCollection_array}
 * @api public
 */
Object.defineProperty(CollectionInterpreter.prototype, 'asynchronousCollections', {
    set: function(asynchronousCollections) {
        this._asynchronousCollections = {};

        for (var i in asynchronousCollections) {
            var asynchronousCollection = asynchronousCollections[i];

            this.setCollectionInterpreter(asynchronousCollection.method, asynchronousCollection, asynchronousCollection.alias);
        }
    }
});

/**
 * Add an asynchrounous collection.
 *
 * @param {string} method The method name.
 * @param {danf:dependencyInjection.asynchronousCollection} asynchronousCollection The asynchronous collection.
 * @param {string|null} alias The optional alias name.
 * @api public
 */
CollectionInterpreter.prototype.setCollectionInterpreter = function(method, asynchronousCollection, alias) {
    this._asynchronousCollections[method] = asynchronousCollection;

    if (undefined === this._asynchronousCollections[alias]) {
        this._asynchronousCollections[alias] = asynchronousCollection;
    }
}

/**
 * @interface {danf:event.collectionInterpreter}
 */
Object.defineProperty(CollectionInterpreter.prototype, 'contract', {
    value: {
        method: {
            type: 'string',
            default: 'forEachOf'
        },
        input: {
            type: 'string|mixed_array|mixed_object',
            required: true
        },
        parameters: {
            type: 'mixed_object',
            default: {}
        },
        aggregate: {
            type: 'boolean|function',
            default: false
        },
        scope: {
            type: 'string'
        }
    }
});

/**
 * @interface {danf:event.collectionInterpreter}
 */
CollectionInterpreter.prototype.interpret = function(
    flow,
    callback,
    operation,
    scope,
    tributaryCallback,
    operationArguments,
    retrieveContext,
    executeOperation,
    endOperation
) {
    var self = this,
        collection = operation.collection,
        asynchronousCollection = this._asynchronousCollections[collection.method],
        input = utils.clone(collection.input)
    ;

    if (undefined === asynchronousCollection) {
        throw new Error('No asynchronous collection "{0}" found'.format(collection.method));
    }

    if ('string' === typeof input) {
        input = self._referencesResolver.resolveSpecific(input, '@', flow.parentStream);
    }

    var tributary = flow.addTributary(
            scope,
            function(stream) {
                if (
                    null !== stream &&
                    'object' === typeof stream &&
                    Array.isArray(input) &&
                    true !== collection.aggregate
                ) {
                    var formattedData = [];

                    for (var key in stream) {
                        if (key == parseInt(key, 10)) {
                            formattedData.push(stream[key]);
                        }
                    }

                    stream = formattedData;
                }

                if ('function' === typeof collection.aggregate) {
                    stream = collection.aggregate(stream);
                }

                if (collection.scope) {
                    stream = utils.merge(input, stream, true);

                    for (var key in stream) {
                        delete stream[key]._;
                    }
                }

                return stream;
            },
            tributaryCallback
        ),
        task = flow.wait(),
        args = [asynchronousCollection.formatInput(input)]
    ;

    var startedAt = new Date(),
        loggingLevel = flow.currentLevel
    ;

    // Log start.
    self._logger.log(
        '<<green>>Collection <<bold>>{0}<</bold>> on <<bold>>{1}<</bold>> start'.format(collection.method, utils.stringify(input)),
        3,
        0,
        tributary,
        loggingLevel,
        startedAt
    );

    args.push(asynchronousCollection.wrapIterator(function(parameters) {
        var value = parameters.item,
            callback = parameters.callback,
            hasKey = parameters.key
        ;

        if ('object' === typeof value && hasKey) {
            value._ = parameters.key;
        }

        self.__asyncFlow = flow;

        flow.setTributary(tributary);

        var resolvedArguments = self._referencesResolver.resolve(operationArguments, retrieveContext());

        // Resolve arguments from the context of the collection.
        for (var name in resolvedArguments) {
            var argument = resolvedArguments[name];

            if (parameters.memo && 'string' === typeof argument) {
                argument = self._referencesResolver.resolveSpecific(argument, '~', parameters.memo);
            }

            if ('string' === typeof argument) {
                argument = self._referencesResolver.resolveSpecific(argument, '@', value);
            }

            resolvedArguments[name] = argument;
        }

        self.__asyncFlow = null;

        // Compute item scope.
        var scope = hasKey ? '.' : null;

        if (true !== collection.aggregate && hasKey) {
            scope = parameters.key;

            if (collection.scope) {
                scope = '{0}.{1}'.format(scope, collection.scope);
            }
        }

        executeOperation(asynchronousCollection, resolvedArguments, scope, callback);

        flow.mergeTributary(tributary);
    }));
    args.push(asynchronousCollection.wrapCallback(function(result) {
        if (undefined !== result) {
            var isCurrentTributary = flow.currentTributary === tributary;

            if (!isCurrentTributary) {
                flow.setTributary(tributary);
            }

            flow.currentStream = result;

            if (!isCurrentTributary) {
                flow.mergeTributary(tributary);
            }
        }

        // Log end.
        self._logger.log(
            '<<magenta>>Collection <<bold>>{0}<</bold>>{1} end'.format(
                collection.method,
                null != result ? ' with <<bold>>{1}<</bold>>'.format(utils.stringify(result)) : ''
            ),
            3,
            0,
            tributary,
            loggingLevel,
            startedAt
        );

        endOperation(result, task);
    }));

    // Handle collection specific parameters.
    var collectionParameters = {};

    for (var name in asynchronousCollection.parameters) {
        if (null == collection.parameters || undefined === collection.parameters[name]) {
            throw new Error(
                'The parameter "{0}" must be defined for the collection method "{1}".'.format(
                    name,
                    collection.method
                )
            );
        }

        collectionParameters[asynchronousCollection.parameters[name]] = name;
    }

    this.__asyncFlow = flow;

    var resolvedParameters = self._referencesResolver.resolve(collection.parameters, retrieveContext());

    this.__asyncFlow = null;

    for (var i = 0; i < 5; i++) {
        var name = collectionParameters[i];

        if (undefined !== name) {
            args.splice(i, 0, resolvedParameters[name]);
        }
    }

    // Call flow driver method.
    var method = this._flowDriver[asynchronousCollection.method];

    if (undefined === method) {
        throw new Error(
            'Method "{0}" not found (see "https://github.com/caolan/async" for available methods).'.format(
                collection.method
            )
        );
    }

    method.apply(this._flowDriver, args);
}
});

define('node_modules/danf/lib/common/event/flow-context',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `FlowContext`.
 */
module.exports = FlowContext;

/**
 * Initialize a new flow context.
 */
function FlowContext() {
}

FlowContext.defineImplementedInterfaces(['danf:event.flowContext']);

/**
 * @interface {danf:manipulation.flowContext}
 */
FlowContext.prototype.set = function(name, item) {
    var context = retrieveAsyncFlowContext.call(this);

    return context.set(name, item);
}

/**
 * @interface {danf:manipulation.flowContext}
 */
FlowContext.prototype.unset = function(name) {
    var context = retrieveAsyncFlowContext.call(this);

    return context.unset(name);
}

/**
 * @interface {danf:manipulation.flowContext}
 */
FlowContext.prototype.clear = function() {
    var context = retrieveAsyncFlowContext.call(this);

    return context.clear();
}

/**
 * @interface {danf:manipulation.flowContext}
 */
FlowContext.prototype.has = function(name) {
    var context = retrieveAsyncFlowContext.call(this);

    return context.has(name);
}

/**
 * @interface {danf:manipulation.flowContext}
 */
FlowContext.prototype.get = function(name) {
    var context = retrieveAsyncFlowContext.call(this);

    return context.get(name);
}

/**
 * @interface {danf:manipulation.flowContext}
 */
FlowContext.prototype.getAll = function() {
    var context = retrieveAsyncFlowContext.call(this);

    return context.getAll();
}

/**
 * Retrieve the current async flow context.
 *
 * @return {danf:manipulation.map} The context.
 * @api private
 */
var retrieveAsyncFlowContext = function() {
    var flow = this.__asyncFlow;

    if (null == flow) {
        throw new Error('No flow currently processing.');
    }

    return flow.context;
}
});

define('node_modules/danf/lib/common/event/logger',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `Logger`.
 */
module.exports = Logger;

/**
 * Initialize a new logger.
 */
function Logger() {
    this._counter = 0;
}

Logger.defineImplementedInterfaces(['danf:event.logger']);

Logger.defineDependency('_logger', 'danf:logging.logger');

/**
 * Logger.
 *
 * @var {danf:logging.logger}
 * @api public
 */
Object.defineProperty(Logger.prototype, 'logger', {
    set: function(logger) { this._logger = logger; }
});

/**
 * @interface {danf:event.logger}
 */
Logger.prototype.log = function(message, verbosity, indentation, tributary, level, startedAt) {
    indentation = indentation ? indentation : 0;

    var flow = this.__asyncFlow;

    tributary = null != tributary ? tributary : flow.currentTributary;
    indentation += null != level ? level : flow.getTributaryLevel(tributary);

    if (tributary < 10) {
        tributary = '00{0}'.format(tributary);
    } else if (tributary < 100) {
        tributary = '0{0}'.format(tributary);
    }

    var displayedMessage = '<<grey>>[{0}-{1}]<</grey>> '.format(
            flow.id.substr(0, 8),
            tributary
        )
    ;

    for (var i = 0; i < indentation; i++) {
        displayedMessage += '  ';
    }

    displayedMessage += message;

    if (startedAt) {
        displayedMessage += ' <<grey>>({0}ms)'.format(Date.now() - startedAt.getTime());
    }

    this._logger.log(displayedMessage, verbosity, 0);
}
});

define('node_modules/danf/lib/common/event/sequence-interpreter/abstract',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `Abstract`.
 */
module.exports = Abstract;

/**
 * Initialize a new abstract sequence interpreter.
 */
function Abstract() {
}

Abstract.defineImplementedInterfaces(['danf:event.sequenceInterpreter']);

Abstract.defineAsAbstract();

Abstract.defineDependency('_sequencesContainer', 'danf:event.sequencesContainer');
Abstract.defineDependency('_logger', 'danf:event.logger');

/**
 * Sequences container.
 *
 * @var {danf:event.sequencesContainer}
 * @api public
 */
Object.defineProperty(Abstract.prototype, 'sequencesContainer', {
    set: function(sequencesContainer) {
        this._sequencesContainer = sequencesContainer
    }
});

/**
 * Logger.
 *
 * @var {danf:logging.logger}
 * @api public
 */
Object.defineProperty(Abstract.prototype, 'logger', {
    set: function(logger) {
        this._logger = logger
    }
});

/**
 * @interface {danf:event.sequenceInterpreter}
 */
Object.defineProperty(Abstract.prototype, 'order', {
    get: function() { return this._order; }
});

/**
 * @interface {danf:event.sequenceInterpreter}
 */
Abstract.prototype.buildContext = function(context, definition) {
    return context;
}

/**
 * @interface {danf:event.sequenceInterpreter}
 */
Abstract.prototype.interpret = function(sequence, definition, context) {
    return sequence;
}

});

define('node_modules/danf/lib/common/event/sequence-interpreter/alias',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/event/sequence-interpreter/abstract'],function (require, exports, module) {'use strict';

/**
 * Expose `Alias`.
 */
module.exports = Alias;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    Abstract = require('node_modules/danf/lib/common/event/sequence-interpreter/abstract')
;

/**
 * Initialize a new alias sequence interpreter.
 */
function Alias() {
    Abstract.call(this);

    this._order = 600;
}

utils.extend(Abstract, Alias);

/**
 * @interface {danf:event.sequenceInterpreter}
 */
Object.defineProperty(Alias.prototype, 'contract', {
    value: {
        alias: {
            type: 'string',
            namespace: true
        }
    }
});

/**
 * @interface {danf:event.sequenceInterpreter}
 */
Alias.prototype.interpret = function(interpretation, definition, context) {
    if (definition.alias) {
        for (var parameter in definition) {
            if (
                !(parameter in {alias: true, id: true}) &&
                undefined !== definition[parameter]
            ) {
                throw new Error(
                    'The definition for "{0}" is an alias of the sequence "{1}" and cannot define another parameter.'.format(
                        definition.id,
                        definition.alias
                    )
                );
            }
        }
    }

    this._sequencesContainer.setAlias(definition.id, definition.alias);

    return interpretation;
}

});

define('node_modules/danf/lib/common/event/sequence-interpreter/embedded',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/event/sequence-interpreter/abstract'],function (require, exports, module) {'use strict';

/**
 * Expose `Embedded`.
 */
module.exports = Embedded;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    Abstract = require('node_modules/danf/lib/common/event/sequence-interpreter/abstract')
;

/**
 * Initialize a new embedded sequence interpreter.
 */
function Embedded() {
    Abstract.call(this);

    Object.hasGetter(this, 'embeddedName');
    Object.hasGetter(this, 'specificContract');
}

utils.extend(Abstract, Embedded);

Embedded.defineAsAbstract();

Embedded.defineDependency('_uniqueIdGenerator', 'danf:manipulation.uniqueIdGenerator');
Embedded.defineDependency('_referencesResolver', 'danf:event.referencesResolver');
Embedded.defineDependency('_collectionInterpreter', 'danf:event.collectionInterpreter');

/**
 * Unique id generator.
 *
 * @var {danf:manipulation.uniqueIdGenerator}
 * @api public
 */
Object.defineProperty(Embedded.prototype, 'uniqueIdGenerator', {
    set: function(uniqueIdGenerator) {
        this._uniqueIdGenerator = uniqueIdGenerator
    }
});

/**
 * References resolver.
 *
 * @var {danf:event.referencesResolver}
 * @api public
 */
Object.defineProperty(Embedded.prototype, 'referencesResolver', {
    set: function(referencesResolver) {
        this._referencesResolver = referencesResolver
    }
});

/**
 * Collection interpreter.
 *
 * @var {danf:event.collectionInterpreter}
 * @api public
 */
Object.defineProperty(Embedded.prototype, 'collectionInterpreter', {
    set: function(collectionInterpreter) {
        this._collectionInterpreter = collectionInterpreter
    }
});

/**
 * @interface {danf:event.sequenceInterpreter}
 */
Object.defineProperty(Embedded.prototype, 'contract', {
    get: function() {
        var contract = {};

        contract[this.embeddedName] = {
            type: 'embedded_array',
            embed: utils.merge(
                {
                    condition: {
                        type: 'function'
                    },
                    order: {
                        type: 'number',
                        default: 0
                    },
                    collection: {
                        type: 'embedded',
                        embed: this._collectionInterpreter.contract
                    },
                    input: {
                        type: 'mixed_object',
                        default: {}
                    },
                    output: {
                        type: 'mixed_object',
                        default: {}
                    }
                },
                this.specificContract
            )
        };

        return contract;
    }
});

/**
 * Interpret an embedded.
 *
 * @param {object} embedded The definition of the embedded.
 * @param {object} sequenceId The embedded sequence id.
 * @return {function} The interpreted embedded.
 * @api protected
 */
Embedded.prototype.interpretEmbedded = function(embedded, sequenceId) {
    var self = this;

    return function(flow, callback) {
        self.__asyncFlow = flow;

        // Check optional condition.
        if (embedded.condition) {
            if (!embedded.condition(flow.currentStream, utils.clone(flow.context.getAll()))) {
                callback();

                return;
            }
        }

        // Resolve input with the stream.
        var resolvedInput = {},
            collectionStream = utils.clone(flow.currentStream),
            startedAt,
            loggingLevel = 0
        ;

        if (embedded.input) {
            resolvedInput = self._referencesResolver.resolve(
                embedded.input,
                flow.currentStream,
                'the input for the sequence "{0}"'.format(sequenceId)
            );
        }

        // Create a specific scope for embedded sequence.
        var uniqueScope = self._uniqueIdGenerator.generate();

        // Handle case of a collection.
        if (embedded.collection) {
            flow.currentStream[uniqueScope] = collectionStream || {};

            self._collectionInterpreter.interpret(
                flow,
                callback,
                embedded,
                uniqueScope,
                function() {
                    if (embedded.output) {
                        var currentStream = flow.currentStream[uniqueScope];

                        // Resolve output with the resulting stream.
                        for (var key in embedded.output) {
                            var argument = embedded.output[key];

                            if (embedded.collection.aggregate) {
                                if ('string' === typeof argument) {
                                    argument = self._referencesResolver.resolveSpecific(argument, '@', currentStream);
                                }

                                flow.currentStream[key] = argument;
                            } else {
                                var resolvedOutput = Array.isArray(currentStream) ? [] : {};

                                for (var resolvedKey in currentStream) {
                                    var resolvedArgument = argument;

                                    if ('string' === typeof resolvedArgument) {
                                        resolvedArgument = self._referencesResolver.resolveSpecific(
                                            resolvedArgument,
                                            '@',
                                            currentStream[resolvedKey]
                                        );
                                    }

                                    resolvedOutput[resolvedKey] = resolvedArgument;
                                }

                                flow.currentStream[key] = resolvedOutput;
                            }
                        }
                    }

                    delete flow.currentStream[uniqueScope];

                    callback();
                },
                embedded.input,
                function() {
                    return flow.currentStream;
                },
                function(asynchronousCollection, resolvedArguments, scope, callback) {
                    self.__asyncFlow = flow;

                    var itemTributary = flow.addTributary(scope),
                        task = flow.wait()
                    ;

                    flow.currentStream = resolvedArguments;

                    startedAt = new Date();
                    loggingLevel = flow.getTributaryLevel(itemTributary);

                    // Log start.
                    self._logger.log(
                        '<<yellow>>Sequence <<bold>>{0}<</bold>> start'.format(sequenceId),
                        3,
                        0,
                        itemTributary,
                        loggingLevel,
                        startedAt
                    );

                    for (var key in resolvedArguments) {
                        var value = resolvedArguments[key];

                        // Log input.
                        self._logger.log(
                            '<<yellow>>> <<white>>{0}: {1}'.format(key, 'object' === typeof value ? utils.stringify(value) : value),
                            3,
                            1,
                            tributary,
                            loggingLevel
                        );
                    }

                    self._sequencesContainer.get(sequenceId).forward(flow, function() {
                        flow.end(task, function(stream) {
                            if (embedded.output) {
                                // Resolve output with the resulting stream.
                                for (var key in embedded.output) {
                                    var argument = embedded.output[key];

                                    if ('string' === typeof argument) {
                                        argument = self._referencesResolver.resolveSpecific(argument, '@', stream);
                                    }

                                    // Log output.
                                    self._logger.log(
                                        '<<blue>>< <<white>>{0}: {1}'.format(key, 'object' === typeof argument ? utils.stringify(argument) : argument),
                                        3,
                                        1,
                                        tributary,
                                        loggingLevel
                                    );

                                    stream[key] = argument;
                                }
                            }

                            for (var key in stream) {
                                var value = stream[key];

                                // Log current stream.
                                self._logger.log(
                                    '<<cyan>>{0}: {1}'.format(key, 'object' === typeof value ? utils.stringify(value) : value),
                                    3,
                                    1,
                                    tributary,
                                    loggingLevel
                                );
                            }

                            // Log end.
                            self._logger.log(
                                '<<blue>>Sequence <<bold>>{0}<</bold>> end'.format(sequenceId),
                                3,
                                0,
                                tributary,
                                loggingLevel,
                                startedAt
                            );
                        });

                        callback(null);
                    });

                    flow.mergeTributary(itemTributary);
                },
                function(result, task) {
                    flow.end(task);
                }
            );
        // Handle standard case.
        } else {
            flow.currentStream[uniqueScope] = resolvedInput;

            var currentStream = flow.currentStream[uniqueScope],
                tributary = flow.addTributary(uniqueScope, null, function() {
                    self.__asyncFlow = flow;

                    if (embedded.output) {
                        // Resolve output with the resulting stream.
                        for (var key in embedded.output) {
                            var argument = embedded.output[key];

                            if ('string' === typeof argument) {
                                argument = self._referencesResolver.resolveSpecific(argument, '@', currentStream);
                            }

                            flow.currentStream[key] = argument;

                            // Log output.
                            self._logger.log(
                                '<<blue>>< <<white>>{0}: {1}'.format(key, 'object' === typeof argument ? utils.stringify(argument) : argument),
                                3,
                                1,
                                tributary,
                                loggingLevel
                            );
                        }
                    }

                    delete flow.currentStream[uniqueScope];

                    for (var key in flow.currentStream) {
                        var value = flow.currentStream[key];

                        // Log current stream.
                        self._logger.log(
                            '<<cyan>>{0}: {1}'.format(key, 'object' === typeof value ? utils.stringify(value) : value),
                            3,
                            1,
                            tributary,
                            loggingLevel
                        );
                    }

                    // Log end.
                    self._logger.log(
                        '<<blue>>Sequence <<bold>>{0}<</bold>> end'.format(sequenceId),
                        3,
                        0,
                        tributary,
                        loggingLevel,
                        startedAt
                    );

                    callback();
                }),
                task = flow.wait()
            ;

            startedAt = new Date();
            loggingLevel = flow.getTributaryLevel(tributary);

            // Log start.
            self._logger.log(
                '<<yellow>>Sequence <<bold>>{0}<</bold>> start'.format(sequenceId),
                3,
                0,
                tributary,
                loggingLevel,
                startedAt
            );

            for (var key in resolvedInput) {
                var value = resolvedInput[key];

                // Log input.
                self._logger.log(
                    '<<yellow>>> <<white>>{0}: {1}'.format(key, 'object' === typeof value ? utils.stringify(value) : value),
                    3,
                    1,
                    tributary,
                    loggingLevel
                );
            }

            self._sequencesContainer.get(sequenceId).forward(flow, function() {
                flow.end(task);
            });

            flow.mergeTributary(tributary);
        }

        self.__asyncFlow = null;
    };
}
});

define('node_modules/danf/lib/common/event/sequence-interpreter/children',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/event/sequence-interpreter/embedded'],function (require, exports, module) {'use strict';

/**
 * Expose `Children`.
 */
module.exports = Children;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    Embedded = require('node_modules/danf/lib/common/event/sequence-interpreter/embedded')
;

/**
 * Initialize a new children sequence interpreter.
 */
function Children() {
    Embedded.call(this);

    this._order = 1200;
}

utils.extend(Embedded, Children);

/**
 * Embedded name.
 *
 * @var {string}
 * @api protected
 */
Object.defineProperty(Children.prototype, 'embeddedName', {
    value: 'children'
});

/**
 * Specific contract.
 *
 * @var {object}
 * @api protected
 */
Object.defineProperty(Children.prototype, 'specificContract', {
    value: {
        name: {
            type: 'string',
            required: true,
            namespace: true
        }
    }
});

/**
 * @interface {danf:event.sequenceInterpreter}
 */
Children.prototype.interpret = function(interpretation, definition, context) {
    if (definition.children) {
        for (var i = 0; i < definition.children.length; i++) {
            var operations = [],
                child = definition.children[i],
                order = child.order || 0
            ;

            for (var j = 0; j < interpretation.length; j++) {
                if (null != interpretation[j].order) {
                    if (interpretation[j].order === order) {
                        operations = interpretation[j].operations;
                        break;
                    } else if (interpretation[j].order > order) {
                        break;
                    }
                }
            }

            if (0 === operations.length) {
                if (j === operations.length - 1) {
                    interpretation.push(
                        {
                            order: order,
                            operations: operations
                        }
                    );
                } else {
                    interpretation.splice(
                        j,
                        0,
                        {
                            order: order,
                            operations: operations
                        }
                    );
                }
            }

            operations.push(interpretChild.call(this, child));
        }
    }

    return interpretation;
}

/**
 * Interpret a child.
 *
 * @param {object} child The definition of the child.
 * @return {function} The interpreted child.
 */
var interpretChild = function(child) {
    return this.interpretEmbedded(child, child.name);
}

});

define('node_modules/danf/lib/common/event/sequence-interpreter/collections',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/event/sequence-interpreter/abstract'],function (require, exports, module) {'use strict';

/**
 * Expose `Collections`.
 */
module.exports = Collections;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    Abstract = require('node_modules/danf/lib/common/event/sequence-interpreter/abstract')
;

/**
 * Initialize a new collections sequence interpreter.
 */
function Collections() {
    Abstract.call(this);

    this._order = 600;
    this._collections = {};
}

utils.extend(Abstract, Collections);

/**
 * @interface {danf:event.sequenceInterpreter}
 */
Object.defineProperty(Collections.prototype, 'contract', {
    value: {
        collections: {
            type: 'string_array',
            namespace: true,
            default: []
        }
    }
});

/**
 * @interface {danf:event.sequenceInterpreter}
 */
Collections.prototype.buildContext = function(context, definition) {
    if (undefined === context.collections) {
        context.collections = {};
    }

    if (definition.collections) {
        var collections = definition.collections;

        for (var i = 0; i < collections.length; i++) {
            var collection = collections[i];

            if (undefined === context.collections[collection]) {
                context.collections[collection] = [];
            }

            context.collections[collection].push(definition.id);
        }
    }

    return context;
}

});

define('node_modules/danf/lib/common/event/sequence-interpreter/stream',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/event/sequence-interpreter/abstract'],function (require, exports, module) {'use strict';

/**
 * Expose `Stream`.
 */
module.exports = Stream;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    Abstract = require('node_modules/danf/lib/common/event/sequence-interpreter/abstract')
;

/**
 * Initialize a new stream sequence interpreter.
 */
function Stream() {
    Abstract.call(this);

    this._order = 800;
}

utils.extend(Abstract, Stream);

/**
 * Data resolver.
 *
 * @var {danf:manipulation.dataResolver}
 * @api public
 */
Object.defineProperty(Stream.prototype, 'dataResolver', {
    set: function(dataResolver) {
        this._dataResolver = dataResolver
    }
});

/**
 * @interface {danf:event.sequenceInterpreter}
 */
Object.defineProperty(Stream.prototype, 'contract', {
    value: {
        stream: {
            type: 'mixed_object'
        }
    }
});

/**
 * @interface {danf:event.sequenceInterpreter}
 */
 Stream.prototype.interpret = function(interpretation, definition, context) {
    if (definition.stream) {
        interpretation.unshift({
            order: null,
            operations: [interpretStream.call(this, definition.stream, definition.id, definition)]
        });
    }

    return interpretation;
}

/**
 * Interpret an stream
 *
 * @param {object} stream The definition of the stream.
 * @param {string} id The identifier of the sequence.
 * @param {mixed_object} defintion The definition of the sequence.
 * @return {function} The interpreted stream.
 */
var interpretStream = function(stream, id, definition) {
    var self = this;

    return function(flow, callback) {
        definition.stream = self._dataResolver.resolve(
            flow.currentStream,
            stream,
            'sequence[{0}]'.format(id)
        );

        callback();
    };
}

});

define('node_modules/danf/lib/common/event/sequence-interpreter/operations',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/event/sequence-interpreter/abstract'],function (require, exports, module) {'use strict';

/**
 * Expose `Operations`.
 */
module.exports = Operations;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    Abstract = require('node_modules/danf/lib/common/event/sequence-interpreter/abstract')
;

/**
 * Initialize a new operations sequence interpreter.
 */
function Operations() {
    Abstract.call(this);

    this._order = 1000;
}

utils.extend(Abstract, Operations);

Operations.defineDependency('_referencesResolver', 'danf:event.referencesResolver');
Operations.defineDependency('_servicesContainer', 'danf:dependencyInjection.servicesContainer');
Operations.defineDependency('_collectionInterpreter', 'danf:event.collectionInterpreter');

/**
 * References resolver.
 *
 * @var {danf:event.referencesResolver}
 * @api public
 */
Object.defineProperty(Operations.prototype, 'referencesResolver', {
    set: function(referencesResolver) {
        this._referencesResolver = referencesResolver
    }
});

/**
 * Services container.
 *
 * @var {danf:dependencyInjection.servicesContainer}
 * @api public
 */
Object.defineProperty(Operations.prototype, 'servicesContainer', {
    set: function(servicesContainer) {
        this._servicesContainer = servicesContainer
    }
});

/**
 * Collection interpreter.
 *
 * @var {danf:event.collectionInterpreter}
 * @api public
 */
Object.defineProperty(Operations.prototype, 'collectionInterpreter', {
    set: function(collectionInterpreter) {
        this._collectionInterpreter = collectionInterpreter
    }
});

/**
 * @interface {danf:event.sequenceInterpreter}
 */
Object.defineProperty(Operations.prototype, 'contract', {
    get: function() {
        return {
            operations: {
                type: 'embedded_array',
                embed: {
                    condition: {
                        type: 'function'
                    },
                    order: {
                        type: 'number',
                        default: 0
                    },
                    collection: {
                        type: 'embedded',
                        embed: this._collectionInterpreter.contract
                    },
                    service: {
                        type: 'string',
                        required: true,
                        namespace: true
                    },
                    method: {
                        type: 'string',
                        required: true
                    },
                    arguments: {
                        type: 'mixed_array',
                        default: []
                    },
                    scope: {
                        type: 'string'
                    }
                }
            }
        }
    }
});

/**
 * @interface {danf:event.sequenceInterpreter}
 */
Operations.prototype.interpret = function(interpretation, definition, context) {
    if (definition.operations) {
        var orders = [],
            minOrder,
            previousOrder,
            hasOtherOperations = true
        ;

        // Build an ordered array of orders.
        while (hasOtherOperations) {
            hasOtherOperations = false;

            for (var i = 0; i < definition.operations.length; i++) {
                var order = definition.operations[i].order || 0;

                if (null == minOrder) {
                    minOrder = order;
                    hasOtherOperations = true;
                }

                if (
                    (minOrder === previousOrder || minOrder > order) &&
                    (null == previousOrder || previousOrder < order)
                ) {
                    minOrder = order;
                    hasOtherOperations = true;
                }
            }

            if (hasOtherOperations) {
                orders.push(minOrder);
                previousOrder = minOrder;
            }
        }

        for (var i = 0; i < orders.length; i++) {
            var order = orders[i],
                operations = []
            ;

            for (var j = 0; j < definition.operations.length; j++) {
                var operation = definition.operations[j];

                if ((operation.order || 0) === order) {
                    operations.push(interpretOperation.call(this, operation));
                }
            }

            interpretation.push({
                order: order,
                operations: operations
            });
        }
    }

    return interpretation;
}

/**
 * Interpret an operation
 *
 * @param {object} operation The definition of the operation.
 * @return {function} The interpreted operation.
 */
var interpretOperation = function(operation) {
    var service = this._servicesContainer.get(operation.service);

    if (null == service) {
        throw new Error(
            'The service "{0}" is not defined.'.format(
                operation.service
            )
        );
    }

    if ('.' !== operation.method && 'function' !== typeof service[operation.method]) {
        throw new Error(
            'The service "{0}" has no method "{1}".'.format(
                operation.service,
                operation.method
            )
        );
    } else if ('.' === operation.method && 'function' !== typeof service) {
        throw new Error(
            'The service "{0}" is not a function service.'.format(
                operation.service
            )
        );
    }

    var self = this;

    return function(flow, callback) {
        self.__asyncFlow = flow;

        var startedAt,
            loggingLevel = 0,
            tributary = flow.currentTributary
        ;

        // Check optional condition.
        if (operation.condition) {
            if (!operation.condition(flow.currentStream, utils.clone(flow.context.getAll()))) {
                callback();

                return;
            }
        }

        // Handle case of a collection.
        if (operation.collection) {
            self._collectionInterpreter.interpret(
                flow,
                callback,
                operation,
                operation.scope,
                null,
                operation.arguments,
                function() {
                    return flow.parentStream;
                },
                function(asynchronousCollection, resolvedArguments, scope, callback) {
                    self.__asyncFlow = flow;

                    var tributary = flow.tributaryCount,
                        startedAt = new Date()
                    ;

                    // Log start.
                    self._logger.log(
                        'Service <<bold>>{0}<</bold>> method <<bold>>{1}<</bold>> start'.format(operation.service, operation.method),
                        3,
                        2,
                        tributary,
                        loggingLevel,
                        startedAt
                    );

                    for (var i = 0; i < resolvedArguments.length; i++) {
                        var value = resolvedArguments[i];

                        // Log input.
                        self._logger.log(
                            '> <<white>>{0}: {1}'.format(i, 'object' === typeof value ? utils.stringify(value) : value),
                            3,
                            3,
                            tributary,
                            loggingLevel
                        );
                    }

                    // Call the target handler.
                    var method = '.' !== operation.method
                            ? service[operation.method]
                            : service
                    ;

                    method.__asyncApply(
                        service,
                        scope,
                        resolvedArguments,
                        null,
                        function(stream) {
                            self.__asyncFlow = flow;

                            if (null != scope) {
                                // Log output.
                                self._logger.log(
                                    '<<grey>>< <<white>>{0}: {1}'.format(operation.scope, 'object' === typeof stream ? utils.stringify(stream) : stream),
                                    3,
                                    3,
                                    tributary,
                                    loggingLevel
                                );
                            }

                            // Log end.
                            self._logger.log(
                                '<<grey>>Service <<bold>>{0}<</bold>> method <<bold>>{1}<</bold>> end'.format(operation.service, operation.method),
                                3,
                                2,
                                tributary,
                                loggingLevel,
                                startedAt
                            );

                            asynchronousCollection.executeIteratorCallback(
                                callback,
                                null,
                                stream
                            );
                        }
                    );

                    self.__asyncFlow = null;
                },
                function(result, task) {
                    callback(result);
                    flow.end(task);
                }
            );
        // Handle standard case.
        } else {
            var tributary = flow.tributaryCount;

            startedAt = new Date();
            loggingLevel = flow.currentLevel + 1;

            // Log start.
            self._logger.log(
                'Service <<bold>>{0}<</bold>> method <<bold>>{1}<</bold>> start'.format(operation.service, operation.method),
                3,
                0,
                tributary,
                loggingLevel,
                startedAt
            );

            var resolvedArguments = self._referencesResolver.resolve(operation.arguments, flow.currentStream);

            for (var i = 0; i < resolvedArguments.length; i++) {
                var value = resolvedArguments[i];

                // Log input.
                self._logger.log(
                    '> <<white>>{0}: {1}'.format(i, 'object' === typeof value ? utils.stringify(value) : value),
                    3,
                    1,
                    tributary,
                    loggingLevel
                );
            }

            // Call the target handler.
            var scope = operation.scope || '.',
                method = '.' !== operation.method
                    ? service[operation.method]
                    : service
            ;

            method.__asyncApply(
                service,
                scope,
                resolvedArguments,
                null,
                function(stream) {
                    self.__asyncFlow = flow;

                    if (null != scope) {
                        // Log output.
                        self._logger.log(
                            '<<grey>>< <<white>>{0}: {1}'.format(scope, 'object' === typeof stream ? utils.stringify(stream) : stream),
                            3,
                            1,
                            tributary,
                            loggingLevel
                        );
                    }

                    // Log end.
                    self._logger.log(
                        '<<grey>>Service <<bold>>{0}<</bold>> method <<bold>>{1}<</bold>> end'.format(operation.service, operation.method),
                        3,
                        0,
                        tributary,
                        loggingLevel,
                        startedAt
                    );

                    callback(null);
                }
            );
        }

        self.__asyncFlow = null;
    };
}

});

define('node_modules/danf/lib/common/event/sequence-interpreter/parents',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/event/sequence-interpreter/embedded'],function (require, exports, module) {'use strict';

/**
 * Expose `Parents`.
 */
module.exports = Parents;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    Embedded = require('node_modules/danf/lib/common/event/sequence-interpreter/embedded')
;

/**
 * Initialize a new parents sequence interpreter.
 */
function Parents() {
    Embedded.call(this);

    this._order = 1400;
}

utils.extend(Embedded, Parents);

/**
 * Embedded name.
 *
 * @var {string}
 * @api protected
 */
Object.defineProperty(Parents.prototype, 'embeddedName', {
    value: 'parents'
});

/**
 * Specific contract.
 *
 * @var {object}
 * @api protected
 */
Object.defineProperty(Parents.prototype, 'specificContract', {
    value: {
        target: {
            type: 'string',
            required: true,
            namespace: true
        }
    }
});

/**
 * @interface {danf:event.sequenceInterpreter}
 */
Parents.prototype.interpret = function(interpretation, definition, context) {
    if (definition.parents) {
        for (var i = 0; i < definition.parents.length; i++) {
            var parent = definition.parents[i],
                order = parent.order || 0,
                targets = parent.target
            ;

            if (-1 !== targets.indexOf('&'))
                targets = this._referencesResolver.resolveSpecific(
                    '&{0}&'.format(targets.replace(/&/g, '')),
                    '&',
                    context.collections
                )
            ;

            if ('string' === typeof targets) {
                targets = [targets];
            }

            for (var k = 0; k < targets.length; k++) {
                var operations = [],
                    parentInterpretation = this._sequencesContainer.getInterpretation(targets[k])
                ;

                for (var j = 0; j < parentInterpretation.length; j++) {
                    if (null != parentInterpretation[j].order) {
                        if (parentInterpretation[j].order === order) {
                            operations = parentInterpretation[j].operations;
                            break;
                        } else if (parentInterpretation[j].order > order) {
                            break;
                        }
                    }
                }

                if (0 === operations.length) {
                    if (j === operations.length - 1) {
                        parentInterpretation.push(
                            {
                                order: order,
                                operations: operations
                            }
                        );
                    } else {
                        parentInterpretation.splice(
                            j,
                            0,
                            {
                                order: order,
                                operations: operations
                            }
                        );
                    }
                }

                operations.push(interpretParent.call(this, parent, definition.id));
            }
        }
    }

    return interpretation;
}

/**
 * Interpret a parent.
 *
 * @param {object} parent The definition of the parent sequence.
 * @param {string} id The identifier of the sequence.
 * @return {function} The interpreted parent.
 */
var interpretParent = function(parent, id) {
    return this.interpretEmbedded(parent, id);
}

});

define('node_modules/danf/lib/common/event/notifier/abstract',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `Abstract`.
 */
module.exports = Abstract;

/**
 * Initialize a new abstract notifier.
 */
function Abstract() {
    this._listeners = [];

    Object.hasMethod(this, 'notifyEvent', true);
}

Abstract.defineImplementedInterfaces(['danf:event.notifier']);

Abstract.defineAsAbstract();

Abstract.defineDependency('_dataResolver', 'danf:manipulation.dataResolver');

/**
 * The data resolver.
 *
 * @var {danf:manipulation.dataResolver}
 * @api public
 */
Object.defineProperty(Abstract.prototype, 'dataResolver', {
    set: function(dataResolver) { this._dataResolver = dataResolver; }
});

/**
 * @interface {danf:event.notifier}
 */
Abstract.prototype.addListener = function(event) {
    this._listeners.push(event);

    this.addEventListener(event.name, event.parameters, event.sequence);
}

/**
 * Add an event listener.
 *
 * @param {string} name The name of the event.
 * @param {object} event The parameters of the event.
 * @param {danf:event.sequence} sequence The sequence to execute on event triggering.
 * @api protected
 */
Abstract.prototype.addEventListener = function(name, parameters, sequence) {
}

/**
 * @interface {danf:event.notifier}
 */
Abstract.prototype.notify = function(event, data) {
    if (undefined === event) {
        throw new Error('No event of name "{0}" found.'.format(event.name));
    }

    var contract = this.getEventDataContract(event);

    if (contract) {
        data = this._dataResolver.resolve(
            data,
            contract,
            'event[{0}][{1}].data'.format(this.name, event.name)
        );
    }

    this.notifyEvent(event.name, event.parameters, event.sequence, data);
}

/**
 * @interface {danf:event.notifier}
 */
Abstract.prototype.mergeContractField = function(field, parentValue, childValue) {
    if (undefined === childValue) {
        return parentValue;
    }

    if (Array.isArray(parentValue)) {
        if (Array.isArray(childValue)) {
            return parentValue.concat(childValue);
        }
    } else if ('object' === typeof parentValue) {
        if ('object' === typeof childValue) {
            for (var key in childValue) {
                parentValue[key] = childValue[key];
            }

            return parentValue;
        }
    }

    return childValue;
}

/**
 * Notify an event triggering.
 *
 * @param {string} name The name of the event.
 * @param {object} event The parameters of the event.
 * @param {danf:event.sequence} sequence The sequence to execute on event triggering.
 * @param {mixed} data The data associated with the triggered event.
 * @api protected
 */
Abstract.prototype.notifyEvent = null; // function(name, parameters, sequence, data) {}

/**
 * Get the contract that data should respect for an event.
 *
 * @param {danf:event.event} event The event.
 * @return {object} The contract.
 * @api protected
 */
Abstract.prototype.getEventDataContract = function(event) {
    return event.parameters.data;
}
});

define('node_modules/danf/lib/common/event/notifier/event',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/event/notifier/abstract'],function (require, exports, module) {'use strict';

/**
 * Expose `Event`.
 */
module.exports = Event;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    Abstract = require('node_modules/danf/lib/common/event/notifier/abstract')
;

/**
 * Initialize a new event notifier.
 */
function Event() {
    Abstract.call(this);
}

utils.extend(Abstract, Event);

/**
 * @interface {danf:event.notifier}
 */
Object.defineProperty(Event.prototype, 'name', {
    value: 'event'
});

/**
 * @interface {danf:event.notifier}
 */
Object.defineProperty(Event.prototype, 'contract', {
    value: {
        context: {
            type: 'mixed_object',
            default: {}
        },
        callback: {
            type: 'function'
        }
    }
});

/**
 * @inheritdoc
 */
Event.prototype.notifyEvent = function(name, parameters, sequence, data) {
    sequence.execute(data, parameters.context, '.', parameters.callback);
}
});

define('node_modules/danf/lib/common/event/configuration/section-processor/events',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/configuration/section-processor'],function (require, exports, module) {'use strict';

/**
 * Expose `Events`.
 */
module.exports = Events;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    SectionProcessor = require('node_modules/danf/lib/common/configuration/section-processor')
;

/**
 * Initialize a new section processor events for the config.
 */
function Events() {
    SectionProcessor.call(this);

    this._notifiers = [];
}

utils.extend(SectionProcessor, Events);

Events.defineDependency('_collectionInterpreter', 'danf:event.collectionInterpreter');
Events.defineDependency('_notifiers', 'danf:event.notifier_array');

/**
 * The collection interpreter.
 *
 * @var {danf:event.collectionInterpreter}
 * @api public
 */
Object.defineProperty(Events.prototype, 'collectionInterpreter', {
    set: function(collectionInterpreter) {
        this._collectionInterpreter = collectionInterpreter
    }
});

/**
 * The notifiers.
 *
 * @var {danf:event.notifier_array}
 * @api public
 */
Object.defineProperty(Events.prototype, 'notifiers', {
    set: function(notifiers) {
        this._notifiers = [];

        for (var i = 0; i < notifiers.length; i++) {
            this.addNotifier(notifiers[i]);
        }
    }
});

/**
 * Add a notifier.
 *
 * @param {danf:event.notifier} notifier The notifier.
 * @api public
 */
Events.prototype.addNotifier = function(notifier) {
    this._notifiers.push(notifier);
}

/**
 * @interface {danf:configuration.sectionProcessor}
 */
Object.defineProperty(Events.prototype, 'contract', {
    get: function() {
        var self = this,
            contract = {}
        ;

        for (var i = 0; i < this._notifiers.length; i++) {
            (function(i) {
                var notifier = self._notifiers[i],
                    notifierContract = notifier.contract
                ;

                Object.checkType(notifierContract, 'object');

                // Add sequences section.
                notifierContract.sequences = {
                    type: 'embedded_array',
                    embed: {
                        name: {
                            type: 'string',
                            required: true,
                            namespace: true
                        },
                        condition: {
                            type: 'function'
                        },
                        order: {
                            type: 'number',
                            default: 0
                        },
                        collection: {
                            type: 'embedded',
                            embed: self._collectionInterpreter.contract
                        },
                        input: {
                            type: 'mixed_object',
                            default: {}
                        },
                        output: {
                            type: 'mixed_object',
                            default: {}
                        }
                    }
                };

                // Add default data contract section if not already defined.
                if (null == notifierContract.data) {
                    notifierContract.data = {
                        type: 'object'
                    };
                }

                var currentContract = utils.clone(notifierContract),
                    builtContract = currentContract
                ;

                for (var i = 0; i <= 9; i++) {
                    currentContract.children = {
                        type: 'embedded_object',
                        embed: utils.clone(notifierContract)
                    };

                    currentContract = currentContract.children.embed;
                }

                contract[notifier.name] = {
                    format: function(value, parameters) {
                        if (parameters.final) {
                            var definitions = {};

                            for (var key in value) {
                                var itemDefinitions = mergeChildren(key, value[key], notifier);

                                for (var name in itemDefinitions) {
                                    definitions[name] = itemDefinitions[name];
                                }
                            }

                            return definitions;
                        }
                    },
                    type: 'embedded_object',
                    embed: builtContract,
                    namespace: true,
                    references: ['$'],
                };
            })(i);
        }

        return contract;
    },
    set: function(contract) { this._contract = contract; }
});

/**
 * Merge children definitions with parent one.
 *
 * @param {string} name The name of the definition.
 * @param {object} parent The parent definition.
 * @param {danf:event.notifier} notifier The event notifier.
 * @return {object} The merged definitions.
 * @api private
 */
var mergeChildren = function(name, parent, notifier) {
    var children = parent.children,
        definitions = {}
    ;

    if (children) {
        for (var childName in children) {
            var child = children[childName],
                childDefinitions = mergeChildren(childName, child, notifier);
            ;

            for (var childName in childDefinitions) {
                definitions['{0}.{1}'.format(name, childName)] = childDefinitions[childName];
            }
        }

        for (var childName in definitions) {
            var child = definitions[childName];

            for (var key in child) {
                child[key] = notifier.mergeContractField(key, utils.clone(parent[key]), child[key]);
            }
        }
    } else {
        definitions[name] = parent;
    }

    delete parent.children;

    return definitions;
}
});

define('node_modules/danf/lib/common/event/configuration/section-processor/sequences',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/configuration/section-processor'],function (require, exports, module) {'use strict';

/**
 * Expose `Sequences`.
 */
module.exports = Sequences;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    SectionProcessor = require('node_modules/danf/lib/common/configuration/section-processor')
;

utils.extend(SectionProcessor, Sequences);

/**
 * Initialize a new section processor sequences for the config.
 */
function Sequences() {
    SectionProcessor.call(this);
}

Sequences.defineDependency('_sequenceInterpreters', 'danf:event.sequenceInterpreter_array');

/**
 * The collection interpreter.
 *
 * @var {danf:event.collectionInterpreter}
 * @api public
 */
Object.defineProperty(Sequences.prototype, 'collectionInterpreter', {
    set: function(collectionInterpreter) {
        this._collectionInterpreter = collectionInterpreter
    }
});

/**
 * The sequence interpreters.
 *
 * @var {danf:event.notifier_array}
 * @api public
 */
Object.defineProperty(Sequences.prototype, 'sequenceInterpreters', {
    set: function(sequenceInterpreters) {
        this._sequenceInterpreters = [];

        for (var i = 0; i < sequenceInterpreters.length; i++) {
            this.addSequenceInterpreter(sequenceInterpreters[i]);
        }
    }
});

/**
 * Add a sequence interpreter.
 *
 * @param {danf:event.sequenceInterpreter} sequenceInterpreter The sequence interpreter.
 * @api public
 */
Sequences.prototype.addSequenceInterpreter = function(sequenceInterpreter) {
    this._sequenceInterpreters.push(sequenceInterpreter);
}

/**
 * @interface {danf:configuration.sectionProcessor}
 */
Object.defineProperty(Sequences.prototype, 'contract', {
    get: function() {
        var contract = {
                __any: {},
                type: 'embedded',
                namespace: true,
                references: ['$']
            }
        ;

        for (var i = 0; i < this._sequenceInterpreters.length; i++) {
            contract.__any = utils.merge(contract.__any, this._sequenceInterpreters[i].contract);
        }

        return contract;
    },
    set: function(contract) { this._contract = contract; }
});
});

define('node_modules/danf/config/common/event/classes',['require','exports','module','node_modules/danf/lib/common/event/references-resolver','node_modules/danf/lib/common/event/sequence','node_modules/danf/lib/common/event/event','node_modules/danf/lib/common/event/sequences-container','node_modules/danf/lib/common/event/events-container','node_modules/danf/lib/common/event/collection-interpreter','node_modules/danf/lib/common/event/flow-context','node_modules/danf/lib/common/event/logger','node_modules/danf/lib/common/event/sequence-interpreter/abstract','node_modules/danf/lib/common/event/sequence-interpreter/alias','node_modules/danf/lib/common/event/sequence-interpreter/children','node_modules/danf/lib/common/event/sequence-interpreter/collections','node_modules/danf/lib/common/event/sequence-interpreter/embedded','node_modules/danf/lib/common/event/sequence-interpreter/stream','node_modules/danf/lib/common/event/sequence-interpreter/operations','node_modules/danf/lib/common/event/sequence-interpreter/parents','node_modules/danf/lib/common/event/notifier/abstract','node_modules/danf/lib/common/event/notifier/event','node_modules/danf/lib/common/event/configuration/section-processor/events','node_modules/danf/lib/common/event/configuration/section-processor/sequences'],function (require, exports, module) {'use strict';

module.exports = {
    referencesResolver: require('node_modules/danf/lib/common/event/references-resolver'),
    sequence: require('node_modules/danf/lib/common/event/sequence'),
    event: require('node_modules/danf/lib/common/event/event'),
    sequencesContainer: require('node_modules/danf/lib/common/event/sequences-container'),
    eventsContainer: require('node_modules/danf/lib/common/event/events-container'),
    collectionInterpreter: require('node_modules/danf/lib/common/event/collection-interpreter'),
    flowContext: require('node_modules/danf/lib/common/event/flow-context'),
    logger: require('node_modules/danf/lib/common/event/logger'),
    sequenceInterpreter: {
        abstract: require('node_modules/danf/lib/common/event/sequence-interpreter/abstract'),
        alias: require('node_modules/danf/lib/common/event/sequence-interpreter/alias'),
        children: require('node_modules/danf/lib/common/event/sequence-interpreter/children'),
        collections: require('node_modules/danf/lib/common/event/sequence-interpreter/collections'),
        embedded: require('node_modules/danf/lib/common/event/sequence-interpreter/embedded'),
        stream: require('node_modules/danf/lib/common/event/sequence-interpreter/stream'),
        operations: require('node_modules/danf/lib/common/event/sequence-interpreter/operations'),
        parents: require('node_modules/danf/lib/common/event/sequence-interpreter/parents')
    },
    notifier: {
        abstract: require('node_modules/danf/lib/common/event/notifier/abstract'),
        event: require('node_modules/danf/lib/common/event/notifier/event')
    },
    configuration: {
        sectionProcessor: {
            events: require('node_modules/danf/lib/common/event/configuration/section-processor/events'),
            sequences: require('node_modules/danf/lib/common/event/configuration/section-processor/sequences')
        }
    }
};
});

define('node_modules/danf/lib/client/event/notifier/dom',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/event/notifier/abstract'],function (require, exports, module) {'use strict';

/**
 * Expose `Dom`.
 */
module.exports = Dom;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    Abstract = require('node_modules/danf/lib/common/event/notifier/abstract')
;

/**
 * Initialize a new jquery notifier.
 */
function Dom() {
    Abstract.call(this);
}

utils.extend(Abstract, Dom);

/**
 * @interface {danf:event.notifier}
 */
Object.defineProperty(Dom.prototype, 'name', {
    value: 'dom'
});

/**
 * @interface {danf:event.notifier}
 */
Object.defineProperty(Dom.prototype, 'contract', {
    value: {
        selector: {
            type: 'string'
        },
        delegate: {
            type: 'string'
        },
        event: {
            type: 'string',
            required: true
        },
        preventDefault: {
            type: 'boolean',
            default: false
        },
        stopPropagation: {
            type: 'boolean',
            default: false
        }
    }
});

/**
 * Jquery.
 *
 * @var {object}
 * @api public
 */
Object.defineProperty(Dom.prototype, 'jquery', {
    set: function(jquery) { this._jquery = jquery; }
});

/**
 * @inheritdoc
 */
Dom.prototype.addEventListener = function(name, parameters, sequence) {
    var $ = this._jquery,
        wrappedCallback = wrapCallback(
            name,
            sequence,
            parameters.preventDefault,
            parameters.stopPropagation
        ),
        doc = $(document)
    ;

    switch (parameters.event) {
        case 'danf':
            // Apply listeners on scope on triggering.

            break;
        case 'ready':
            doc.ready(function() {
                setTimeout(
                    function() {
                        if (parameters.selector) {
                            $(parameters.selector).each(function() {
                                wrappedCallback({target: this});
                            });
                        } else {
                            wrappedCallback({target: document});
                        }
                    },
                    10
                );
            });

            break;
        default:
            if (parameters.delegate) {
                doc.ready(function() {
                    if (parameters.selector) {
                        var selector = 'window' === parameters.selector ? window : parameters.selector;

                        $(selector).on(parameters.event, parameters.delegate, wrappedCallback);
                    } else {
                        $(document).on(parameters.event, parameters.delegate, wrappedCallback);
                    }
                });
            } else {
                doc.ready(function() {
                    if (parameters.selector) {
                        var selector = 'window' === parameters.selector ? window : parameters.selector;

                        $(selector).on(parameters.event, wrappedCallback);
                    } else {
                        $(document).on(parameters.event, wrappedCallback);
                    }
                });
            }
    }
}

/**
 * Apply listeners on a scope.
 *
 * @param {object} The scope JQuery element.
 * @api protected
 */
Dom.prototype.applyListeners = function(scope) {
    var $ = this._jquery,
        readyListeners = {},
        standardListeners = {},
        listeners = [standardListeners, readyListeners]
    ;

    // Unbind events on the scope.
    for (var name in this._listeners) {
        var parameters = this._listeners[name].parameters;

        if (parameters.selector && 'window' !== parameters.selector) {
            scope.find(parameters.selector).off();
        }

        if ('ready' === parameters.event) {
            readyListeners[name] = this._listeners[name];
        } else {
            standardListeners[name] = this._listeners[name];
        }
    }

    // Rebind standard then ready events on the scope.
    for (var i = 0; i < listeners.length; i++) {
        for (var name in listeners[i]) {
            var listener = listeners[i][name],
                parameters = listener.parameters,
                selector = 'window' === parameters.selector ? window : parameters.selector
            ;

            if (window !== selector) {
                var wrappedCallback = wrapCallback(
                        name,
                        listener.sequence,
                        parameters.preventDefault,
                        parameters.stopPropagation
                    )
                ;

                switch (parameters.event) {
                    case 'ready':
                        if (selector) {
                            $(selector).each(function() {
                                wrappedCallback({target: this});
                            });
                        } else {
                            wrappedCallback({target: document.documentElement});
                        }

                        break;
                    default:
                        if (selector) {
                            if (parameters.delegate) {
                                scope.find(selector).on(parameters.event, parameters.delegate, wrappedCallback);
                            } else {
                                scope.find(selector).on(parameters.event, wrappedCallback);
                            }
                        }
                }
            }
        }
    }
}

/**
 * @inheritdoc
 */
Dom.prototype.notifyEvent = function(name, parameters, sequence, data) {
    var $ = this._jquery;

    switch (parameters.event) {
        case 'danf':
            var scope = data.scope ? data.scope : $(document);

            this.applyListeners(scope);

            break;
        case 'ready':
            var wrappedCallback = wrapCallback(
                    name,
                    sequence,
                    parameters.preventDefault,
                    parameters.stopPropagation
                )
            ;

            wrappedCallback();

            break;
        default:
            if (parameters.selector) {
                var selector = 'window' === parameters.selector ? window : parameters.selector;

                $(selector).trigger(parameters.event, data);
            } else {
                $(document).trigger(parameters.event, data);
            }
    };
}

/**
 * Wrap the sequence mechanism in a jquery event type callback.
 *
 * @param {string} name The name of the event.
 * @param {danf:event.sequence} sequence The sequence.
 * @param {boolean} preventDefault Whether or not to prevent default behaviour (see jquery doc).
 * @param {boolean} stopPropagation Whether or not to stop the bubbling of the event (see jquery doc).
 */
var wrapCallback = function(name, sequence, preventDefault, stopPropagation) {
    return function(event) {
        var args = Array.prototype.slice.call(arguments, 1),
            stream = 'object' === typeof args[0] ? args[0] : {}
        ;

        stream.args = args;

        if (preventDefault) {
            event.preventDefault();
        }
        if (stopPropagation) {
            event.stopPropagation();
        }

        sequence.execute(
            stream,
            {
                name: name,
                event: event
            },
            '.'
        );
    }
}
});

define('node_modules/danf/config/client/event/classes',['require','exports','module','node_modules/danf/lib/client/event/notifier/dom'],function (require, exports, module) {'use strict';

module.exports = {
    notifier: {
        dom: require('node_modules/danf/lib/client/event/notifier/dom')
    }
};
});

define('node_modules/danf/config/client/event/services',['require','exports','module'],function (require, exports, module) {'use strict';

module.exports = {
    notifier: {
        children: {
            dom: {
                class: 'danf:event.notifier.dom',
                properties: {
                    jquery: '#danf:vendor.jquery#'
                }
            }
        }
    }
};
});

define('node_modules/danf/config/client/event/sequences',['require','exports','module'],function (require, exports, module) {'use strict';

module.exports = {
    process: {
        stream: {
            scope: {
                type: 'object',
                default: null
            }
        },
        operations: [
            {
                order: 0,
                condition: function(stream) {
                    return stream.scope ? true : false;
                },
                service: 'danf:event.notifier.dom',
                method: 'applyListeners',
                arguments: ['@scope@']
            }
        ],
        parents: [
            {
                order: -20,
                target: 'danf:manipulation.process',
                input: {
                    scope: '@scope@'
                }
            }
        ]
    }
};
});

define('node_modules/danf/config/common/manipulation/interfaces',['require','exports','module'],function (require, exports, module) {'use strict';

module.exports = {
    escaper: {
        methods: {
            /**
             * Escape strings.
             *
             * @param {mixed} source The source to look for the strings.
             * @param {string_array} strings The strings.
             *
             * @return {mixed} The escaped source.
             */
            escape: {
                arguments: [
                    'mixed/source',
                    'string_array/strings'
                ],
                returns: 'mixed'
            },
            /**
             * Unescape strings.
             *
             * @param {mixed} source The source to look for the strings.
             * @param {string_array} strings The strings.
             *
             * @return {string} The unescaped source.
             */
            unescape: {
                arguments: [
                    'mixed/source',
                    'string_array/strings'
                ],
                returns: 'mixed'
            }
        }
    },
    uniqueIdGenerator: {
        methods: {
            /**
             * Generate a unique id.
             *
             * @return {string} The unique id.
             */
            generate: {
                returns: 'string'
            }
        }
    },
    referenceResolver: {
        methods: {
            /**
             * Extract an existing reference in a source.
             *
             * @param {string} source The string where the reference occurred.
             * @param {string} type The type of the reference.
             * @param {string|null} inText An optionnal text specifying where the reference is declared (errors).
             * @return {string_array|null} The existing reference or null.
             */
            extract: {
                arguments: [
                    'string/source',
                    'string/type',
                    'string|null/inText'
                ],
                returns: 'string_array|null'
            },
            /**
             * Resolve the references occurring in a source.
             *
             * Examples:
             *
             *     source = %foo.bar%
             *     type = '%'
             *     context = { foo: { bar: 'ok' } }
             *     => returns 'ok'
             *
             *     source = I love %who%
             *     type = '%'
             *     context = { who: 'you' }
             *     => returns 'I love you'
             *
             *     source = I love %who%
             *     type = '%'
             *     context = { who: ['you', 'me'] }
             *     => returns ['I love you', 'I love me']
             *
             *     source = %who%
             *     type = '%'
             *     context = {
             *         who: {
             *             you: 'Johna Doe',
             *             me: 'John Doe'
             *         }
             *     }
             *     => returns { you: 'Johna Doe', me: 'John Doe' }
             *
             *     source = I love %who%
             *     type = '%'
             *     context = {
             *         who: {
             *             you: 'Johna Doe',
             *             me: 'John Doe'
             *         }
             *     }
             *     => returns ['I love you', 'I love me']
             *
             *     source = '%who.name.first% %who.name.last% is %who.age% and lives in %who.cities%',
             *     context = {
             *         who: [
             *             {
             *                 name: {
             *                     first: 'John',
             *                     last: 'Doe'
             *                 },
             *                 age: 25,
             *                 cities: ['Paris', 'New York']
             *             },
             *             {
             *                 name: {
             *                     first: 'Bobby',
             *                     last: 'Bob'
             *                 },
             *                 age: 28,
             *                 cities: ['Houston']
             *             },
             *         ]
             *     }
             *     => returns [
             *            'John Doe is 25 and lives in Paris',
             *            'John Doe is 25 and lives in New York',
             *            'Bobby Bob is 28 and lives in Houston'
             *        ]
             *
             * @param {string} source The string where the reference occurred.
             * @param {string} type The type of the reference.
             * @param {mixed} context The context allowing to resolve the reference.
             * @param {string|null} inText An optionnal text specifying where the reference is declared (errors).
             * @return {mixed} The resolved references.
             */
            resolve: {
                arguments: [
                    'string/source',
                    'string/type',
                    'mixed/context',
                    'string|null/inText'
                ],
                returns: 'mixed'
            }
        }
    },
    referenceType: {
        getters: {
            /**
             * Identifier name.
             *
             * @return {string}
             */
            name: 'string',
            /**
             * Delimiter.
             *
             * @return {string}
             */
            delimiter: 'string',
            /**
             * Size.
             *
             * if size = 1 & delimiter = % => %ref%
             * if size = 4 & delimiter = > => >ref>is>like>that>
             *
             * @return {number}
             */
            size: 'number',
            /**
             * Indexes of the reference which should be namespaced when asked.
             *
             * if size = 4 & delimiter = > & namespace = [0, 2] => >prefix:ref>is>prefix:like>that>
             *
             * @return {number_array}
             */
            namespace: 'number_array',
            /**
             * Whether or not the type allow the concatenation.
             *
             * @return {boolean}
             */
            allowsConcatenation: 'boolean'
        }
    },
    dataResolver: {
        methods: {
            /**
             * Merge two data from a contract.
             *
             * @param {mixed} data1 The first data.
             * @param {mixed} data2 The second data.
             * @param {object} contract The contract the data should respect.
             * @param {object} erase Should erase data1 with data2 if conflict?
             * @param {string} namespace The namespace of the data.
             * @param {object|null} parameters The additional parameters used for the resolving.
             * @param {boolean} isRoot Whether or not this is the root merging.
             * @return {mixed} The merged data.
             */
            merge: {
                arguments: [
                    'mixed/data1',
                    'mixed/data2',
                    'object/contract',
                    'boolean|undefined/erase',
                    'string|undefined/namespace',
                    'object|undefined/parameters',
                    'boolean|undefined/isRoot'
                ],
                returns: 'mixed'
            },
            /**
             * Resolve a data from a contract.
             *
             * @param {mixed} data The data.
             * @param {object} contract The contract the data should respect.
             * @param {string} namespace The optional namespace.
             * @param {object|null} parameters The additional parameters used for the resolving.
             * @param {boolean} isRoot Whether or not this is the root resolving.
             * @return {mixed} The resolved data.
             */
            resolve: {
                arguments: [
                    'mixed/data',
                    'object/contract',
                    'string|undefined/namespace',
                    'object|undefined/parameters',
                    'boolean|undefined/isRoot'
                ],
                returns: 'mixed'
            }
        }
    },
    dataInterpreter: {
        methods: {
            /**
             * Format a contract.
             *
             * @param {object} contract The contract.
             * @return {object} The formatted contract.
             */
            formatContract: {
                arguments: ['object/contract'],
                returns: 'object'
            },
            /**
             * Merge two data from a contract.
             *
             * @param {string} name The name of the data.
             * @param {mixed} value The passed value between data interpreters.
             * @param {mixed} data1 The first data.
             * @param {mixed} data2 The second data.
             * @param {object} contract The contract the data should respect.
             * @param {object} erase Should erase data1 with data2 if conflict?
             * @param {object|null} parameters The additional parameters used for the resolving.
             * @return {mixed} The resolved data.
             */
            merge: {
                arguments: [
                    'string/name',
                    'mixed/value',
                    'mixed/data1',
                    'mixed/data2',
                    'object/contract',
                    'boolean|undefined/erase',
                    'object|undefined/parameters'
                ],
                returns: 'mixed'
            },
            /**
             * Interpret a value from a contract.
             *
             * @param {string} name The name of the data.
             * @param {mixed} value The value.
             * @param {object} contract The contract the data should respect.
             * @param {object|null} parameters The additional parameters used for the resolving.
             * @return {mixed} The interpreted value.
             */
            interpret: {
                arguments: [
                    'string/name',
                    'mixed/value',
                    'object/contract',
                    'object|undefined/parameters'
                ],
                returns: 'mixed'
            }
        },
        getters: {
            /**
             * Order of execution.
             *
             * @return {number}
             */
            order: 'number'
        },
        setters: {
            /**
             * Data resolver.
             *
             * @param {danf:manipulation.dataResolver}
             */
            dataResolver: 'danf:manipulation.dataResolver'
        }
    },
    map: {
        methods: {
            /**
             * Set an item.
             *
             * @param {string|number} key The key.
             * @param {mixed} value The value.
             */
            set: {
                arguments: ['string|number/key', 'mixed/value']
            },
            /**
             * Unset an item.
             *
             * @param {string|number} key The key.
             */
            unset: {
                arguments: ['string|number/key']
            },
            /**
             * Clear all items.
             */
            clear: {
                arguments: []
            },
            /**
             * Whether or not a key exists.
             *
             * @param {string|number} key The key.
             * @return {boolean} True if the key exists, false otherwise.
             */
            has: {
                arguments: ['string|number/key'],
                returns: 'boolean'
            },
            /**
             * Get an item.
             *
             * @param {string|number} key The key.
             * @return {mixed} The value.
             * @throw {error} If the key does not exist.
             */
            get: {
                arguments: ['string|number/key'],
                returns: 'mixed'
            },
            /**
             * Get all the items.
             *
             * @return {object} The items.
             */
            getAll: {
                returns: 'object'
            }
        }
    },
    registry: {
        methods: {
            /**
             * Register an item.
             *
             * @param {string} name The identifier name of the item.
             * @param {mixed} item The item.
             */
            register: {
                arguments: ['string/name', 'mixed/item']
            },
            /**
             * Register a list of items.
             *
             * @param {object} items The list of items.
             */
            registerSet: {
                arguments: ['object/items']
            },
            /**
             * Deregister an item.
             *
             * @param {string} name The identifier name of the item.
             */
            deregister: {
                arguments: ['string/name']
            },
            /**
             * Deregister all items.
             */
            deregisterAll: {
                arguments: []
            },
            /**
             * Whether or not an item has been registered.
             *
             * @param {string} name The identifier name of the item.
             * @return {boolean} True if the item has been registered, false otherwise.
             */
            has: {
                arguments: ['string/name'],
                returns: 'boolean'
            },
            /**
             * Get a registered item from its name.
             *
             * @param {string} name The identifier name of the item.
             * @return {mixed} The item.
             * @throw {error} If the item is not registered.
             */
            get: {
                arguments: ['string/name'],
                returns: 'mixed'
            },
            /**
             * Get all the items.
             *
             * @return {object} The items.
             */
            getAll: {
                returns: 'object'
            }
        }
    },
    notifierRegistry: {
        extends: 'danf:manipulation.registry',
        methods: {
            /**
             * Add an observer notified on each change.
             *
             * @param {danf:manipulation.registryObserver} observer The observer.
             */
            addObserver: {
                arguments: ['danf:manipulation.registryObserver/observer']
            },
            /**
             * Remove an observer.
             *
             * @param {danf:manipulation.registryObserver} observer The observer.
             */
            removeObserver: {
                arguments: ['danf:manipulation.registryObserver/observer']
            },
            /**
             * Remove all observers.
             */
            removeAllObservers: {
                arguments: []
            }
        }
    },
    registryObserver: {
        methods: {
            /**
             * Handle a change coming from a registry.
             *
             * @param {object} items The items.
             * @param {boolean} reset Whether or not it is a reset.
             * @param {string} name The name of the registry.
             */
            handleRegistryChange: {
                arguments: [
                    'object/items',
                    'boolean/reset',
                    'string/name'
                ]
            }
        }
    },
    callbackExecutor: {
        methods: {
            /**
             * Execute a callback.
             *
             * @param {function} callback The callback.
             * @param {mixed} argN The N-th argument to pass to the callback.
             * @return {mixed} The return of the callback.
             */
            execute: {
                arguments: ['function/callback', 'mixed.../argN']
            }
        }
    },
    flow: {
        methods: {
            /**
             * Wait for a task to execute.
             *
             * @return {number} The id of the task.
             */
            wait: {
                arguments: [],
                returns: 'number'
            },
            /**
             * End a task.
             *
             * @param {number} task The id of the task.
             * @param {mixed|undefined} returnedValue The optional value returned by the task.
             */
            end: {
                arguments: ['number/task', 'mixed|undefined/returnedValue']
            },
            /**
             * Add a tributary and set the context as this tributary.
             *
             * @param {string|null} scope The optional scope.
             * @param {function|null} format The optional function allowing to format the result.
             * @param {function|null} format The optional final callback.
             * @return {number} The id of the tributary.
             */
            addTributary: {
                arguments: ['string|null/scope', 'function|null/format', 'function|null/callback'],
                returns: 'number'
            },
            /**
             * Set an already added tributary as context.
             *
             * @param {number} tributary The id of the tributary.
             */
            setTributary: {
                arguments: ['number/tributary']
            },
            /**
             * Merge tributary and set the context as its parent if the current
             * one was the merged tributary.
             *
             * @param {number} tributary The id of the tributary.
             */
            mergeTributary: {
                arguments: ['number/tributary']
            },
            /**
             * Retrieve a tributary embedded level.
             *
             * @param {number} tributary The id of the tributary.
             * @return {number} The embedded level.
             */
            getTributaryLevel: {
                arguments: ['number/tributary'],
                returns: 'number'
            }
        },
        getters: {
            /**
             * Unique identifier.
             *
             * @return {string}
             */
            id: 'string',
            /**
             * Context of execution.
             *
             * @return {danf:manipulation.map}
             */
            context: 'danf:manipulation.map',
            /**
             * Stream.
             *
             * @return {object}
             */
            stream: 'object',
            /**
             * Current stream.
             *
             * @return {object}
             */
            currentStream: 'object',
            /**
             * Parent stream of the current one.
             *
             * @return {object}
             */
            parentStream: 'object',
            /**
             * Current tributary.
             *
             * @return {string}
             */
            currentTributary: 'number',
            /**
             * Tributary count.
             *
             * @return {string}
             */
            tributaryCount: 'number',
            /**
             * Embedded level of the current tributary.
             *
             * @return {string}
             */
            currentLevel: 'number'
        },
        setters: {
            /**
             * Current stream.
             *
             * @param {object}
             */
            currentStream: 'object'
        }
    },
    flowDriver: {
        methods: {
            /**
             * Proxy to async collections method each.
             * (https://github.com/caolan/async#each)
             */
            each: {
                arguments: ['array/arr', 'function/iterator', 'function/callback']
            },
            /**
             * Proxy to async collections method eachSeries.
             * (https://github.com/caolan/async#eachSeries)
             */
            eachSeries: {
                arguments: ['array/arr', 'function/iterator', 'function/callback']
            },
            /**
             * Proxy to async collections method eachLimit.
             * (https://github.com/caolan/async#eachLimit)
             */
            eachLimit: {
                arguments: ['array/arr', 'number/limit', 'function/iterator', 'function/callback']
            },
            /**
             * Proxy to async collections method each.
             * (https://github.com/caolan/forEachOf#each)
             */
            forEachOf: {
                arguments: ['array|object/arr', 'function/iterator', 'function/callback']
            },
            /**
             * Proxy to async collections method eachSeries.
             * (https://github.com/caolan/async#forEachOfSeries)
             */
            forEachOfSeries: {
                arguments: ['array|object/arr', 'function/iterator', 'function/callback']
            },
            /**
             * Proxy to async collections method forEachOfLimit.
             * (https://github.com/caolan/async#eachLimit)
             */
            forEachOfLimit: {
                arguments: ['array|object/arr', 'number/limit', 'function/iterator', 'function/callback']
            },
            /**
             * Proxy to async collections method map.
             * (https://github.com/caolan/async#map)
             */
            map: {
                arguments: ['array/arr', 'function/iterator', 'function/callback']
            },
            /**
             * Proxy to async collections method mapSeries.
             * (https://github.com/caolan/async#mapSeries)
             */
            mapSeries: {
                arguments: ['array/arr', 'function/iterator', 'function/callback']
            },
            /**
             * Proxy to async collections method mapLimit.
             * (https://github.com/caolan/async#mapLimit)
             */
            mapLimit: {
                arguments: ['array/arr', 'number/limit', 'function/iterator', 'function/callback']
            },
            /**
             * Proxy to async collections method filter.
             * (https://github.com/caolan/async#filter)
             */
            filter: {
                arguments: ['array/arr', 'function/iterator', 'function/callback']
            },
            /**
             * Proxy to async collections method filterSeries.
             * (https://github.com/caolan/async#filterSeries)
             */
            filterSeries: {
                arguments: ['array/arr', 'function/iterator', 'function/callback']
            },
            /**
             * Proxy to async collections method reject.
             * (https://github.com/caolan/async#reject)
             */
            reject: {
                arguments: ['array/arr', 'function/iterator', 'function/callback']
            },
            /**
             * Proxy to async collections method rejectSeries.
             * (https://github.com/caolan/async#rejectSeries)
             */
            rejectSeries: {
                arguments: ['array/arr', 'function/iterator', 'function/callback']
            },
            /**
             * Proxy to async collections method reduce.
             * (https://github.com/caolan/async#reduce)
             */
            reduce: {
                arguments: ['array/arr', 'mixed/memo', 'function/iterator', 'function/callback']
            },
            /**
             * Proxy to async collections method reduceRight.
             * (https://github.com/caolan/async#reduceRight)
             */
            reduceRight: {
                arguments: ['array/arr', 'mixed/memo', 'function/iterator', 'function/callback']
            },
            /**
             * Proxy to async collections method detect.
             * (https://github.com/caolan/async#detect)
             */
            detect: {
                arguments: ['array/arr', 'function/iterator', 'function/callback']
            },
            /**
             * Proxy to async collections method detectSeries.
             * (https://github.com/caolan/async#detectSeries)
             */
            detectSeries: {
                arguments: ['array/arr', 'function/iterator', 'function/callback']
            },
            /**
             * Proxy to async collections method some.
             * (https://github.com/caolan/async#some)
             */
            some: {
                arguments: ['array/arr', 'function/iterator', 'function/callback']
            },
            /**
             * Proxy to async collections method every.
             * (https://github.com/caolan/async#every)
             */
            every: {
                arguments: ['array/arr', 'function/iterator', 'function/callback']
            },
            /**
             * Proxy to async collections method concat.
             * (https://github.com/caolan/async#concat)
             */
            concat: {
                arguments: ['array/arr', 'function/iterator', 'function/callback']
            },
            /**
             * Proxy to async collections method concatSeries.
             * (https://github.com/caolan/async#concatSeries)
             */
            concatSeries: {
                arguments: ['array/arr', 'function/iterator', 'function/callback']
            },
            /**
             * Proxy to async control flow method series.
             * (https://github.com/caolan/async#series)
             */
            series: {
                arguments: ['function_array|function_object/tasks', 'function|null/callback']
            },
            /**
             * Proxy to async control flow method parallel.
             * (https://github.com/caolan/async#parallel)
             */
            parallel: {
                arguments: ['function_array|function_object/tasks', 'function|null/callback']
            },
            /**
             * Proxy to async control flow method parallelLimit.
             * (https://github.com/caolan/async#parallelLimit)
             */
            parallelLimit: {
                arguments: ['function_array|function_object/tasks', 'number/limit', 'function|null/callback']
            },
            /**
             * Proxy to async control flow method whilst.
             * (https://github.com/caolan/async#whilst)
             */
            whilst: {
                arguments: ['function/test', 'function/fn', 'function/callback']
            },
            /**
             * Proxy to async control flow method doWhilst.
             * (https://github.com/caolan/async#doWhilst)
             */
            doWhilst: {
                arguments: ['function/fn', 'function/test', 'function/callback']
            },
            /**
             * Proxy to async control flow method until.
             * (https://github.com/caolan/async#until)
             */
            until: {
                arguments: ['function/test', 'function/fn', 'function/callback']
            },
            /**
             * Proxy to async control flow method doUntil.
             * (https://github.com/caolan/async#doUntil)
             */
            doUntil: {
                arguments: ['function/fn', 'function/test', 'function/callback']
            },
            /**
             * Proxy to async control flow method forever.
             * (https://github.com/caolan/async#forever)
             */
            forever: {
                arguments: ['function/fn', 'function/errback']
            },
            /**
             * Proxy to async control flow method compose.
             * (https://github.com/caolan/async#compose)
             */
            compose: {
                arguments: ['function.../fnN'],
                returns: 'function'
            },
            /**
             * Proxy to async control flow method seq.
             * (https://github.com/caolan/async#seq)
             */
            seq: {
                arguments: ['function.../fnN'],
                returns: 'function'
            },
            /**
             * Proxy to async control flow method applyEach.
             * (https://github.com/caolan/async#applyEach)
             */
            applyEach: {
                arguments: ['function_array|function_object/fns', 'mixed...|function/args|callback', 'function/callback']
            },
            /**
             * Proxy to async control flow method applyEachSeries.
             * (https://github.com/caolan/async#applyEachSeries)
             */
            applyEachSeries: {
                arguments: ['function_array|function_object/fns', 'mixed...|function/args|callback', 'function/callback']
            },
            /**
             * Proxy to async control flow method queue.
             * (https://github.com/caolan/async#queue)
             */
            queue: {
                arguments: ['function/worker', 'concurrency/number'],
                returns: 'object'
            },
            /**
             * Proxy to async control flow method priorityQueue.
             * (https://github.com/caolan/async#priorityQueue)
             */
            priorityQueue: {
                arguments: ['function/worker', 'concurrency/number']
            },
            /**
             * Proxy to async control flow method cargo.
             * (https://github.com/caolan/async#cargo)
             */
            cargo: {
                arguments: ['function/worker', 'concurrency|null/payload'],
                returns: 'object'
            },
            /**
             * Proxy to async control flow method auto.
             * (https://github.com/caolan/async#auto)
             */
            auto: {
                arguments: ['function_array|function_object/tasks', 'function|null/callback']
            },
            /**
             * Proxy to async control flow method retry.
             * (https://github.com/caolan/async#retry)
             */
            retry: {
                arguments: ['number|function/times|task', 'function|null/task|callback', 'function|null/callback']
            },
            /**
             * Proxy to async control flow method iterator.
             * (https://github.com/caolan/async#iterator)
             */
            iterator: {
                arguments: ['function_array|function_object/tasks'],
                returns: 'function'
            },
            /**
             * Proxy to async control flow method apply.
             * (https://github.com/caolan/async#apply)
             */
            apply: {
                arguments: ['function/fn', 'mixed...|null/args'],
                returns: 'function'
            },
            /**
             * Proxy to async control flow method nextTick.
             * (https://github.com/caolan/async#nextTick)
             */
            nextTick: {
                arguments: ['function/callback']
            },
            /**
             * Proxy to async control flow method nextTick.
             * (https://github.com/caolan/async#nextTick)
             */
            setImmediate: {
                arguments: ['function/callback']
            },
            /**
             * Proxy to async control flow method times.
             * (https://github.com/caolan/async#times)
             */
            times: {
                arguments: ['number/n', 'function/callback']
            },
            /**
             * Proxy to async control flow method timesSeries.
             * (https://github.com/caolan/async#timesSeries)
             */
            timesSeries: {
                arguments: ['number/n', 'function/callback']
            },
            /**
             * Proxy to async utils method memoize.
             * (https://github.com/caolan/async#memoize)
             */
            memoize: {
                arguments: ['function/fn', 'function|null/hasher'],
                returns: 'function'
            },
            /**
             * Proxy to async utils method unmemoize.
             * (https://github.com/caolan/async#unmemoize)
             */
            unmemoize: {
                arguments: ['function/fn', 'function|null/hasher']
            },
            /**
             * Proxy to async utils method log.
             * (https://github.com/caolan/async#log)
             */
            log: {
                arguments: ['function/fn', 'mixed...|null/args']
            },
            /**
             * Proxy to async utils method dir.
             * (https://github.com/caolan/async#dir)
             */
            dir: {
                arguments: ['function/fn', 'mixed...|null/args']
            }
        }
    },
    asynchronousCallback: {
        methods: {
            /**
             * Adapt asynchronous callback execution.
             *
             * @param {function} callback The callback.
             * @param {error} error The optional error.
             * @param {mixed} result The result.
             */
            execute: {
                arguments: ['function/callback', 'error|null/error', 'mixed/result']
            },
            /**
             * Adapt asynchronous callback.
             *
             * @param {function} callback The callback.
             * @return {function} The adapted callback.
             */
            wrap: {
                arguments: ['function/callback'],
                returns: 'function'
            }
        }
    },
    asynchronousInput: {
        methods: {
            /**
             * Format the input of a collection.
             *
             * @param {mixed} input The input.
             * @return {mixed} The formatted input.
             */
            format: {
                arguments: ['mixed/input'],
                returns: 'mixed'
            }
        }
    },
    asynchronousIterator: {
        methods: {
            /**
             * Adapt asynchronous iterator.
             *
             * @param {function} iterator The iterator.
             * @return {function} The adapted iterator.
             */
            wrap: {
                arguments: ['function/iterator'],
                returns: 'function'
            }
        }
    },
    asynchronousCollection: {
        methods: {
            /**
             * Format the input of a collection.
             *
             * @param {mixed} input The input.
             * @return {mixed} The formatted input.
             */
            formatInput: {
                arguments: ['mixed/input'],
                returns: 'mixed'
            },
            /**
             * Adapt asynchronous iterator.
             *
             * @param {function} iterator The iterator.
             * @return {function} The adapted iterator.
             */
            wrapIterator: {
                arguments: ['function/iterator'],
                returns: 'function'
            },
            /**
             * Adapt asynchronous callback execution.
             *
             * @param {function} callback The callback.
             * @param {error} error The optional error.
             * @param {mixed} result The result.
             */
            executeIteratorCallback: {
                arguments: ['function/callback', 'error|null/error', 'mixed/result']
            },
            /**
             * Adapt asynchronous callback.
             *
             * @param {function} callback The callback.
             * @return {function} The adapted callback.
             */
            wrapCallback: {
                arguments: ['function/callback'],
                returns: 'function'
            }
        },
        getters: {
            /**
             * Async method name.
             *
             * @return {string}
             */
            method: 'string',
            /**
             * Optional alias name.
             *
             * @return {string|null}
             */
            alias: 'string|null',
            /**
             * Parameters.
             *
             * @return {object}
             */
            parameters: 'object'
        }
    }
};

});

define('node_modules/danf/config/common/manipulation/services',['require','exports','module'],function (require, exports, module) {'use strict';

module.exports = {
    escaper: {
        class: 'danf:manipulation.escaper'
    },
    uniqueIdGenerator: {
        class: 'danf:manipulation.uniqueIdGenerator'
    },
    referenceResolver: {
        class: 'danf:manipulation.referenceResolver',
        properties: {
            referenceTypes: '&danf:manipulation.referenceType&'
        }
    },
    referenceType: {
        collections: ['danf:manipulation.referenceType'],
        class: 'danf:manipulation.referenceType',
        children: {
            parameter: {
                properties: {
                    name: '%',
                    delimiter: '%'
                }
            },
            context: {
                properties: {
                    name: '@',
                    delimiter: '@'
                }
            },
            globalContext: {
                properties: {
                    name: '!',
                    delimiter: '!'
                }
            },
            memory: {
                properties: {
                    name: '~',
                    delimiter: '~'
                }
            }
        }
    },
    dataResolver: {
        class: 'danf:manipulation.dataResolver',
        properties: {
            dataInterpreters: '&danf:manipulation.dataInterpreter&'
        }
    },
    dataInterpreter: {
        collections: ['danf:manipulation.dataInterpreter'],
        children: {
            default: {
                class: 'danf:manipulation.dataInterpreter.default'
            },
            flatten: {
                class: 'danf:manipulation.dataInterpreter.flatten'
            },
            format: {
                class: 'danf:manipulation.dataInterpreter.format'
            },
            required: {
                class: 'danf:manipulation.dataInterpreter.required'
            },
            type: {
                class: 'danf:manipulation.dataInterpreter.type'
            },
            validate: {
                class: 'danf:manipulation.dataInterpreter.validate'
            }
        }
    },
    callbackExecutor: {
        class: 'danf:manipulation.callbackExecutor'
    },
    mapProvider: {
        parent: 'danf:dependencyInjection.objectProvider',
        properties: {
            class: 'danf:manipulation.map',
            interface: 'danf:manipulation.map'
        }
    },
    flowDriver: {
        class: 'danf:manipulation.flowDriver',
        properties: {
            async: '#danf:vendor.async#'
        }
    },
    flowProvider: {
        parent: 'danf:dependencyInjection.objectProvider',
        properties: {
            class: 'danf:manipulation.flow',
            interface: 'danf:manipulation.flow'
        }
    },
    asynchronousCallback: {
        collections: ['danf:manipulation.asynchronousCallback'],
        children: {
            error: {
                class: 'danf:manipulation.asynchronousCallback.error'
            },
            errorResult: {
                class: 'danf:manipulation.asynchronousCallback.errorResult'
            },
            result: {
                class: 'danf:manipulation.asynchronousCallback.result'
            }
        }
    },
    asynchronousInput: {
        collections: ['danf:manipulation.asynchronousInput'],
        children: {
            array: {
                class: 'danf:manipulation.asynchronousInput.array'
            },
            object: {
                class: 'danf:manipulation.asynchronousInput.object'
            }
        }
    },
    asynchronousIterator: {
        collections: ['danf:manipulation.asynchronousIterator'],
        children: {
            collection: {
                class: 'danf:manipulation.asynchronousIterator.collection'
            },
            key: {
                class: 'danf:manipulation.asynchronousIterator.key'
            },
            memo: {
                class: 'danf:manipulation.asynchronousIterator.memo'
            }
        }
    },
    asynchronousCollection: {
        class: 'danf:manipulation.asynchronousCollection',
        collections: ['danf:manipulation.asynchronousCollection'],
        children: {
            each: {
                properties: {
                    method: 'each',
                    input: '#danf:manipulation.asynchronousInput.array#',
                    iterator: '#danf:manipulation.asynchronousIterator.collection#',
                    callback: '#danf:manipulation.asynchronousCallback.error#'
                }
            },
            eachSeries: {
                properties: {
                    method: 'eachSeries',
                    input: '#danf:manipulation.asynchronousInput.array#',
                    iterator: '#danf:manipulation.asynchronousIterator.collection#',
                    callback: '#danf:manipulation.asynchronousCallback.error#'
                }
            },
            eachLimit: {
                properties: {
                    method: 'eachLimit',
                    input: '#danf:manipulation.asynchronousInput.array#',
                    iterator: '#danf:manipulation.asynchronousIterator.collection#',
                    callback: '#danf:manipulation.asynchronousCallback.error#',
                    parameters: {
                        limit: 1
                    }
                }
            },
            forEachOf: {
                properties: {
                    method: 'forEachOf',
                    alias: '||',
                    input: '#danf:manipulation.asynchronousInput.object#',
                    iterator: '#danf:manipulation.asynchronousIterator.key#',
                    callback: '#danf:manipulation.asynchronousCallback.error#'
                }
            },
            forEachOfSeries: {
                properties: {
                    method: 'forEachOfSeries',
                    alias: '--',
                    input: '#danf:manipulation.asynchronousInput.object#',
                    iterator: '#danf:manipulation.asynchronousIterator.key#',
                    callback: '#danf:manipulation.asynchronousCallback.error#'
                }
            },
            forEachOfLimit: {
                properties: {
                    method: 'forEachOfLimit',
                    alias: '|-',
                    input: '#danf:manipulation.asynchronousInput.object#',
                    iterator: '#danf:manipulation.asynchronousIterator.key#',
                    callback: '#danf:manipulation.asynchronousCallback.error#',
                    parameters: {
                        limit: 1
                    }
                }
            },
            map: {
                properties: {
                    method: 'map',
                    input: '#danf:manipulation.asynchronousInput.array#',
                    iterator: '#danf:manipulation.asynchronousIterator.collection#',
                    callback: '#danf:manipulation.asynchronousCallback.errorResult#'
                }
            },
            mapSeries: {
                properties: {
                    method: 'mapSeries',
                    input: '#danf:manipulation.asynchronousInput.array#',
                    iterator: '#danf:manipulation.asynchronousIterator.collection#',
                    callback: '#danf:manipulation.asynchronousCallback.errorResult#'
                }
            },
            mapLimit: {
                properties: {
                    method: 'mapLimit',
                    input: '#danf:manipulation.asynchronousInput.array#',
                    iterator: '#danf:manipulation.asynchronousIterator.collection#',
                    callback: '#danf:manipulation.asynchronousCallback.errorResult#',
                    parameters: {
                        limit: 1
                    }
                }
            },
            filter: {
                properties: {
                    method: 'filter',
                    input: '#danf:manipulation.asynchronousInput.array#',
                    iterator: '#danf:manipulation.asynchronousIterator.collection#',
                    callback: '#danf:manipulation.asynchronousCallback.result#'
                }
            },
            filterSeries: {
                properties: {
                    method: 'filterSeries',
                    input: '#danf:manipulation.asynchronousInput.array#',
                    iterator: '#danf:manipulation.asynchronousIterator.collection#',
                    callback: '#danf:manipulation.asynchronousCallback.result#'
                }
            },
            reject: {
                properties: {
                    method: 'reject',
                    input: '#danf:manipulation.asynchronousInput.array#',
                    iterator: '#danf:manipulation.asynchronousIterator.collection#',
                    callback: '#danf:manipulation.asynchronousCallback.result#'
                }
            },
            rejectSeries: {
                properties: {
                    method: 'rejectSeries',
                    input: '#danf:manipulation.asynchronousInput.array#',
                    iterator: '#danf:manipulation.asynchronousIterator.collection#',
                    callback: '#danf:manipulation.asynchronousCallback.result#'
                }
            },
            reduce: {
                properties: {
                    method: 'reduce',
                    input: '#danf:manipulation.asynchronousInput.array#',
                    iterator: '#danf:manipulation.asynchronousIterator.memo#',
                    callback: '#danf:manipulation.asynchronousCallback.errorResult#',
                    parameters: {
                        memo: 1
                    }
                }
            },
            reduceRight: {
                properties: {
                    method: 'reduceRight',
                    input: '#danf:manipulation.asynchronousInput.array#',
                    iterator: '#danf:manipulation.asynchronousIterator.memo#',
                    callback: '#danf:manipulation.asynchronousCallback.errorResult#',
                    parameters: {
                        memo: 1
                    }
                }
            },
            detect: {
                properties: {
                    method: 'detect',
                    input: '#danf:manipulation.asynchronousInput.array#',
                    iterator: '#danf:manipulation.asynchronousIterator.collection#',
                    callback: '#danf:manipulation.asynchronousCallback.result#'
                }
            },
            detectSeries: {
                properties: {
                    method: 'detectSeries',
                    input: '#danf:manipulation.asynchronousInput.array#',
                    iterator: '#danf:manipulation.asynchronousIterator.collection#',
                    callback: '#danf:manipulation.asynchronousCallback.result#'
                }
            },
            sortBy: {
                properties: {
                    method: 'sortBy',
                    input: '#danf:manipulation.asynchronousInput.array#',
                    iterator: '#danf:manipulation.asynchronousIterator.collection#',
                    callback: '#danf:manipulation.asynchronousCallback.errorResult#'
                }
            },
            some: {
                properties: {
                    method: 'some',
                    input: '#danf:manipulation.asynchronousInput.array#',
                    iterator: '#danf:manipulation.asynchronousIterator.collection#',
                    callback: '#danf:manipulation.asynchronousCallback.result#'
                }
            },
            every: {
                properties: {
                    method: 'every',
                    input: '#danf:manipulation.asynchronousInput.array#',
                    iterator: '#danf:manipulation.asynchronousIterator.collection#',
                    callback: '#danf:manipulation.asynchronousCallback.result#'
                }
            },
            concat: {
                properties: {
                    method: 'concat',
                    input: '#danf:manipulation.asynchronousInput.array#',
                    iterator: '#danf:manipulation.asynchronousIterator.collection#',
                    callback: '#danf:manipulation.asynchronousCallback.errorResult#'
                }
            },
            concatSeries: {
                properties: {
                    method: 'concatSeries',
                    input: '#danf:manipulation.asynchronousInput.array#',
                    iterator: '#danf:manipulation.asynchronousIterator.collection#',
                    callback: '#danf:manipulation.asynchronousCallback.errorResult#'
                }
            }
        }
    }
};
});

define('node_modules/danf/lib/common/manipulation/escaper',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `Escaper`.
 */
module.exports = Escaper;

/**
 * Initialize a new escaper.
 */
function Escaper() {
}

Escaper.defineImplementedInterfaces(['danf:manipulation.escaper']);

/**
 * @interface {danf:manipulation.escaper}
 */
Escaper.prototype.escape = function(source, strings) {
    if ('object' === typeof source && undefined === source.__metadata) {
        for (var key in source) {
            source[key] = this.escape(source[key], strings);
        }
    } else if ('string' === typeof source) {
        for (var i in strings) {
            var string = strings[i];

            source = source.replace(
                new RegExp(string.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'g'), '\\{0}\\'.format(string)
            );
        }
    }

    return source;
}

/**
 * @interface {danf:manipulation.escaper}
 */
Escaper.prototype.unescape = function(source, strings) {
    if ('object' === typeof source && undefined === source.__metadata) {
        for (var key in source) {
            source[key] = this.unescape(source[key], strings);
        }
    } else if ('string' === typeof source) {
        for (var i in strings) {
            var string = strings[i];

            source = source.replace(
                new RegExp('\\\\{0}\\\\'.format(string.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')), 'g'), string
            );
        }
    }

    return source;
}
});

define('node_modules/danf/lib/common/manipulation/unique-id-generator',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `UniqueIdGenerator`.
 */
module.exports = UniqueIdGenerator;

/**
 * Initialize a new unique id generator.
 */
function UniqueIdGenerator() {
}

UniqueIdGenerator.defineImplementedInterfaces(['danf:manipulation.uniqueIdGenerator']);

/**
 * @interface {danf:manipulation.uniqueIdGenerator}
 */
UniqueIdGenerator.prototype.generate = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r&0x3 | 0x8)
        ;

        return v.toString(16);
    });
}
});

define('node_modules/danf/lib/common/manipulation/map',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `Map`.
 */
module.exports = Map;

/**
 * Initialize a new map.
 */
function Map() {
    this._items = {};
    this._name = '';
}

Map.defineImplementedInterfaces(['danf:manipulation.map']);

Map.defineDependency('_name', 'string|null');

/**
 * @interface {danf:manipulation.map}
 */
Object.defineProperty(Map.prototype, 'name', {
    get: function() { return this._name; },
    set: function(name) { this._name = name; }
});

/**
 * @interface {danf:manipulation.map}
 */
Map.prototype.set = function(name, item) {
    this._items[name] = item;
}

/**
 * @interface {danf:manipulation.map}
 */
Map.prototype.unset = function(name) {
    if (this._items[name]) {
        delete this._items[name];
    }
}

/**
 * @interface {danf:manipulation.map}
 */
Map.prototype.clear = function() {
    for (var name in this._items) {
        this.unset(name);
    }
}

/**
 * @interface {danf:manipulation.map}
 */
Map.prototype.has = function(name) {
    return this._items[name] ? true : false;
}

/**
 * @interface {danf:manipulation.map}
 */
Map.prototype.get = function(name) {
    if (!this.has(name)) {
        throw new Error(
            'The item "{0}" has not been set {1}.'.format(
                name,
                this._name ? 'in context "{0}"'.format(this._name) : ''
            )
        );
    }

    return this._items[name];
}

/**
 * @interface {danf:manipulation.map}
 */
Map.prototype.getAll = function() {
    // Build a return object in order to not pass the internal one.
    var items = {};

    for (var key in this._items) {
        items[key] = this._items[key];
    }

    return items;
}
});

define('node_modules/danf/lib/common/manipulation/callback-executor',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `CallbackExecutor`.
 */
module.exports = CallbackExecutor;

/**
 * Initialize a new callback executor.
 */
function CallbackExecutor() {}

CallbackExecutor.defineImplementedInterfaces(['danf:manipulation.callbackExecutor']);

/**
 * @interface {danf:manipulation.callbackExecutor}
 */
CallbackExecutor.prototype.execute = function(callback) {
    var args = Array.prototype.slice.call(arguments, 1);

    return callback.apply(this, args);
}
});

define('node_modules/danf/lib/common/manipulation/flow',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `Flow`.
 */
module.exports = Flow;

/**
 * Initialize a new flow.
 */
function Flow() {
    this._taskCounter = 0;
    this._tributaryCounter = 0;
    this._tributaries = {};
    this._hasEnded = false;
}

Flow.defineImplementedInterfaces(['danf:manipulation.flow']);

Flow.defineDependency('_id', 'string');
Flow.defineDependency('_context', 'danf:manipulation.map');

/**
 * Init.
 */
Flow.prototype.__init = function() {
    if (undefined === this._currentTributary) {
        this.addTributary(this._initialScope);
    }
}

/**
 * @interface {danf:manipulation.flow}
 */
Object.defineProperty(Flow.prototype, 'id', {
    get: function() { return this._id; },
    set: function(id) { this._id = id; }
});

/**
 * @interface {danf:manipulation.flow}
 */
Object.defineProperty(Flow.prototype, 'context', {
    get: function() { return this._context; },
    set: function(context) { this._context = context; }
});

/**
 * @interface {danf:manipulation.flow}
 */
Object.defineProperty(Flow.prototype, 'stream', {
    get: function() { return this._mainStream; },
    set: function(stream) {
        this._mainStream = stream;
        if (undefined === this._stream) {
            this._stream = stream;
        }
    }
});

/**
 * @interface {danf:manipulation.flow}
 */
Object.defineProperty(Flow.prototype, 'currentStream', {
    get: function() { return this._stream; },
    set: function(stream) {
        var tributaryData = this._tributaries[this._currentTributary];

        tributaryData.stream = stream;
        this._stream = stream;
    }
});

/**
 * @interface {danf:manipulation.flow}
 */
Object.defineProperty(Flow.prototype, 'parentStream', {
    get: function() {
        var tributaryData = this._tributaries[this._currentTributary];

        if (tributaryData.parent) {
            return this._tributaries[tributaryData.parent].stream;
        }

        return this._mainStream;
    }
});

/**
 * Set the initial scope.
 *
 * @param {string|null} scope The scope.
 */
Object.defineProperty(Flow.prototype, 'initialScope', {
    set: function(initialScope) {
        if (undefined !== this._currentTributary) {
            throw new Error(
                'Cannot define initial scope after initialization.'
            );
        }

        this._initialScope = initialScope;
    }
});

/**
 * Set the final callback
 *
 * @param {function|null} callback The callback.
 */
Object.defineProperty(Flow.prototype, 'callback', {
    set: function(callback) { this._callback = callback; }
});

/**
 * @interface {danf:manipulation.flow}
 */
Object.defineProperty(Flow.prototype, 'currentTributary', {
    get: function() { return this._currentTributary; }
});

/**
 * @interface {danf:manipulation.flow}
 */
Object.defineProperty(Flow.prototype, 'tributaryCount', {
    get: function() { return this._tributaryCounter; }
});

/**
 * @interface {danf:manipulation.flow}
 */
Object.defineProperty(Flow.prototype, 'currentLevel', {
    get: function() {
        return this.getTributaryLevel(this._currentTributary);
    }
});

/**
 * @interface {danf:manipulation.flow}
 */
Flow.prototype.wait = function() {
    if (this._hasEnded) {
        throw new Error('Cannot wait for a task on an already ended flow.')
    }

    var task = this._taskCounter++;

    this._tasks[task] = true;

    return task;
}

/**
 * @interface {danf:manipulation.flow}
 */
Flow.prototype.end = function(task, returnedValue) {
    if (this._hasEnded) {
        throw new Error('Cannot end a task on an already ended flow.')
    }

    for (var i = 0; i < this._tributaryCounter; i++) {
        var tributaryData = this._tributaries[i];

        if (undefined !== tributaryData && undefined !== tributaryData.tasks[task]) {
            this.setTributary(i);
            break;
        }
    }

    delete this._tasks[task];

    if ('function' === typeof returnedValue && undefined === returnedValue._returnedFunction) {
        returnedValue = returnedValue(this._stream);
    }

    var tributaryData = this._tributaries[this._currentTributary];

    if (undefined !== returnedValue) {
        tributaryData.stream = this._stream = returnedValue;
    }

    var hasEnded = tryTributaryDeletion.call(this, this._currentTributary);

    // Prevent processing a new end if the end has been triggered by a
    // tributary callback.
    if (hasEnded && !this._hasEnded) {
        var hasAllEnded = true;

        for (var i = 0; i < this._tributaryCounter; i++) {
            if (undefined !== this._tributaries[i]) {
                hasAllEnded = false;
                break;
            }
        }

        if (hasAllEnded) {
            this._hasEnded = true;

            if (this._callback) {
               this._callback(this._mainStream, this._context.getAll());
            }
        }
    }

    // Reset current tributary.
    if (undefined !== this._tributaries[this._currentTributary]) {
        this.setTributary(this._currentTributary);
    } else if (tributaryData.parent) {
        this.setTributary(tributaryData.parent);
    }
}

/**
 * @interface {danf:manipulation.flow}
 */
Flow.prototype.addTributary = function(scope, format, callback) {
    if (this._hasEnded) {
        throw new Error('Cannot add a tributary on an already ended flow.')
    }

    var tributary = this._tributaryCounter++;

    this._tasks = {};

    if (scope && '.' !== scope) {
        scope = String(scope);

        if (null != this._stream && 'object' !== typeof this._stream) {
            this._stream = null;
        }

        if (null != this._stream) {
            var scopePaths = extractScopePaths(scope),
                scopePath
            ;

            while (scopePath = scopePaths.shift()) {
                if (null != this._stream[scopePath]) {
                    this._stream = this._stream[scopePath];
                } else {
                    this._stream = null;
                    break;
                }
            }
        }
    }

    this._tributaries[tributary] = {
        tasks: this._tasks,
        stream: this._stream,
        scope: scope,
        parent: this._currentTributary,
        format: format,
        callback: callback
    };

    this._currentTributary = tributary;

    return tributary;
}

/**
 * @interface {danf:manipulation.flow}
 */
Flow.prototype.setTributary = function(tributary) {
    if (this._hasEnded) {
        return;//throw new Error('Cannot set a tributary on an already ended flow.')
    }
    if (undefined === this._tributaries[tributary]) {
        throw new Error('No existing tributary "{0}".'.format(tributary));
    }

    var currentTributaryData = this._tributaries[tributary];

    this._tasks = currentTributaryData.tasks;
    this._stream = currentTributaryData.stream;
    this._currentTributary = tributary;
}

/**
 * @interface {danf:manipulation.flow}
 */
Flow.prototype.mergeTributary = function(tributary) {
    if (
        !this._hasEnded &&
        this._tributaries[tributary] &&
        this._currentTributary === tributary
    ) {
        var mergedTributaryData = this._tributaries[tributary];

        if (undefined !== mergedTributaryData.parent) {
            this.setTributary(mergedTributaryData.parent);
        }
    }
}

/**
 * @interface {danf:manipulation.flow}
 */
Flow.prototype.getTributaryLevel = function(tributary) {
    var level = 0,
        tributaryData = this._tributaries[tributary]
    ;

    while (tributaryData.parent) {
        tributaryData = this._tributaries[tributaryData.parent];
        level++;
    }

    return level;
}

/**
 * Delete a tributary.
 *
 * @param {number} tributary The tributary.
 * @return {boolean} Whether or not the tributary has been deleted.
 * @api private
 */
var tryTributaryDeletion = function(tributary) {
    var tributaryData = this._tributaries[tributary],
        hasEnded = true
    ;

    if (null == tributaryData) {
        return;
    }

    for (var i = 0; i <= this._taskCounter; i++) {
        if (undefined !== tributaryData.tasks[i]) {
            hasEnded = false;
            break;
        }
    }

    // Handle no remaining task in the tributary case.
    if (hasEnded) {
        var hasChildrenEnded = true;

        for (var i = 0; i <= this._tributaryCounter; i++) {
            var otherTributaryData = this._tributaries[i];

            if (undefined !== otherTributaryData && otherTributaryData.parent === tributary) {
                hasChildrenEnded = false;
                break;
            }
        }

        // Handle no remaining children tributary case.
        if (hasChildrenEnded) {
            // Delete the tributary.
            this.mergeTributary(tributary);
            delete this._tributaries[tributary];

            if (tributaryData.format) {
                tributaryData.stream = tributaryData.format(tributaryData.stream);
            }

            if (undefined !== tributaryData.parent) {
                var currentTributaryData = tributaryData;

                // Impact parent tributary stream from its child tributary stream.
                while (currentTributaryData) {
                    var parentTributaryData = this._tributaries[currentTributaryData.parent];

                    if (parentTributaryData) {
                        var scope = currentTributaryData.scope;

                        if (scope) {
                            if ('.' !== scope) {
                                var scopePaths = extractScopePaths(scope),
                                    stream = null != parentTributaryData.stream && 'object' === typeof parentTributaryData.stream
                                        ? parentTributaryData.stream
                                        : {}
                                ;

                                if ((Array.isArray(stream[scopePaths[0]]) && scopePath != parseInt(scopePaths[0], 10))) {
                                    stream = {};
                                }

                                var streamRoot = stream,
                                    parentStream = {}
                                ;

                                for (var i = 0; i < scopePaths.length; i++) {
                                    var scopePath = scopePaths[i];

                                    if (Array.isArray(parentStream[scopePaths[i - 1]]) && scopePath != parseInt(scopePath, 10)) {
                                        parentStream[scopePaths[i - 1]] = {};
                                    }

                                    if (i === scopePaths.length - 1) {
                                        stream[scopePath] = tributaryData.stream;
                                    } else if (null == stream[scopePath] || 'object' !== typeof stream[scopePath]) {
                                        stream[scopePath] = {};
                                    }

                                    parentStream = stream;
                                    stream = stream[scopePath];
                                }

                                parentTributaryData.stream = streamRoot;

                                break;
                            } else {
                                parentTributaryData.stream = tributaryData.stream;
                            }
                        }
                    } else if (undefined === parentTributaryData && scope) {
                        this._mainStream = tributaryData.stream;
                        currentTributaryData.stream = this._mainStream;
                    }

                    currentTributaryData = parentTributaryData;
                }

                if (tributaryData.callback) {
                    tributaryData.callback(tributaryData.stream);
                }

                // Try to delete parent.
                tryTributaryDeletion.call(this, tributaryData.parent);
            } else {
                var scope = tributaryData.scope;

                if (scope) {
                    if ('.' !== scope) {
                        var stream = this._mainStream || {},
                            scopePaths = extractScopePaths(scope),
                            streamRoot = stream
                        ;

                        for (var i = 0; i < scopePaths.length; i++) {
                            var scopePath = scopePaths[i];

                            if (i === scopePaths.length - 1) {
                                stream[scopePath] = tributaryData.stream;
                            } else if ('object' !== typeof stream[scopePath]) {
                                stream[scopePath] = {};
                            }

                            stream = stream[scopePath];
                        }

                        this._mainStream = streamRoot;
                    } else {
                        this._mainStream = tributaryData.stream;
                    }
                }

                if (tributaryData.callback) {
                    tributaryData.callback(tributaryData.stream);
                }
            }

            return true;
        }
    }

    return false;
}

/**
 * Extract scope paths from scope.
 *
 * @param {string} scope The scope.
 * @return {string_array} The extracted scope paths.
 * @api private
 */
var extractScopePaths = function(scope) {
    scope = scope.replace(/`([^`]*)`/g, function(match) {
        return match.replace(/\./g, '%;%');
    });

    var scopePaths = scope.split('.');

    for (var i = 0; i < scopePaths.length; i++) {
        scopePaths[i] = scopePaths[i].replace(/%;%/g, '.').replace(/`/g, '');
    }

    return scopePaths;
}

});

define('node_modules/danf/lib/common/manipulation/flow-driver',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `FlowDriver`.
 */
module.exports = FlowDriver;

/**
 * Initialize a new flow driver.
 * This is a proxy of the async lib (https://github.com/caolan/async).
 */
function FlowDriver() {
}

FlowDriver.defineImplementedInterfaces(['danf:manipulation.flowDriver']);

FlowDriver.defineDependency('_async', 'object');

/**
 * Async lib.
 *
 * @var {object}
 * @api public
 */
Object.defineProperty(FlowDriver.prototype, 'async', {
    set: function(async) { this._async = async; }
});

// Collections (https://github.com/caolan/async#collections-1)
/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.each = function(arr, iterator, callback) {
    return this._async.each(arr, iterator, callback);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.eachSeries = function(arr, iterator, callback) {
    return this._async.eachSeries(arr, iterator, callback);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.eachLimit = function(arr, limit, iterator, callback) {
    return this._async.eachLimit(arr, limit, iterator, callback);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.forEachOf = function(obj, iterator, callback) {
    return this._async.forEachOf(obj, iterator, callback);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.forEachOfSeries = function(obj, iterator, callback) {
    return this._async.forEachOfSeries(obj, iterator, callback);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.forEachOfLimit = function(obj, limit, iterator, callback) {
    return this._async.forEachOfLimit(obj, limit, iterator, callback);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.map = function(arr, iterator, callback) {
    return this._async.map(arr, iterator, callback);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.mapSeries = function(arr, iterator, callback) {
    return this._async.mapSeries(arr, iterator, callback);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.mapLimit = function(arr, limit, iterator, callback) {
    return this._async.mapLimit(arr, limit, iterator, callback);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.filter = function(arr, iterator, callback) {
    return this._async.filter(arr, iterator, callback);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.filterSeries = function(arr, iterator, callback) {
    return this._async.filterSeries(arr, iterator, callback);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.reject = function(arr, iterator, callback) {
    return this._async.reject(arr, iterator, callback);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.rejectSeries = function(arr, iterator, callback) {
    return this._async.rejectSeries(arr, iterator, callback);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.reduce = function(arr, memo, iterator, callback) {
    return this._async.reduce(arr, memo, iterator, callback);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.reduceRight = function(arr, memo, iterator, callback) {
    return this._async.reduceRight(arr, memo, iterator, callback);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.detect = function(arr, iterator, callback) {
    return this._async.detect(arr, iterator, callback);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.detectSeries = function(arr, iterator, callback) {
    return this._async.detectSeries(arr, iterator, callback);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.sortBy = function(arr, iterator, callback) {
    return this._async.sortBy(arr, iterator, callback);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.some = function(arr, iterator, callback) {
    return this._async.some(arr, iterator, callback);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.every = function(arr, iterator, callback) {
    return this._async.every(arr, iterator, callback);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.concat = function(arr, iterator, callback) {
    return this._async.concat(arr, iterator, callback);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.concatSeries = function(arr, iterator, callback) {
    return this._async.concatSeries(arr, iterator, callback);
}

// Control Flow (https://github.com/caolan/async#control-flow-1)
/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.series = function(tasks, callback) {
    return this._async.series(tasks, callback);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.parallel = function(tasks, callback) {
    return this._async.parallel(tasks, callback);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.parallelLimit = function(tasks, limit, callback) {
    return this._async.parallelLimit(tasks, limit, callback);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.whilst = function(test, fn, callback) {
    return this._async.whilst(test, fn, callback);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.doWhilst = function(fn, test, callback) {
    return this._async.doWhilst(fn, test, callback);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.until = function(test, fn, callback) {
    return this._async.until(test, fn, callback);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.doUntil = function(fn, test, callback) {
    return this._async.doUntil(fn, test, callback);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.forever = function(fn, errback) {
    return this._async.forever(fn, errback);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.waterfall = function(tasks, callback) {
    return this._async.waterfall(tasks, callback);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.compose = function() {
    var args = Array.prototype.slice.call(arguments, 1);

    return this._async.compose.apply(this, args);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.seq = function() {
    var args = Array.prototype.slice.call(arguments, 1);

    return this._async.seq.apply(this, args);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.applyEach = function(/*fns, args..., callback*/) {
    var args = Array.prototype.slice.call(arguments, 1);

    return this._async.applyEach.apply(this, args);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.applyEachSeries = function(/*fns, args..., callback*/) {
    var args = Array.prototype.slice.call(arguments, 1);

    return this._async.applyEachSeries.apply(this, args);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.queue = function(worker, concurrency) {
    return this._async.queue(worker, concurrency);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.priorityQueue = function(worker, concurrency) {
    return this._async.priorityQueue(worker, concurrency);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.cargo = function(worker, payload) {
    return this._async.cargo(worker, payload);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.auto = function(tasks, callback) {
    return this._async.auto(tasks, callback);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.retry = function(times, tasks, callback) {
    return this._async.retry(times, tasks, callback);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.iterator = function(tasks) {
    return this._async.iterator(tasks);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.apply = function(/*function, arguments...*/) {
    var args = Array.prototype.slice.call(arguments, 1);

    return this._async.apply.apply(this, args);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.nextTick = function(callback) {
    return this._async.nextTick(callback);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.setImmediate = function(callback) {
    return this._async.setImmediate(callback);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.times = function(n, callback) {
    return this._async.times(n, callback);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.timesSeries = function(n, callback) {
    return this._async.timesSeries(n, callback);
}

// Utils (https://github.com/caolan/async#utils-1)
/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.memoize = function(fn, hasher) {
    return this._async.memoize(fn, hasher);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.unmemoize = function(fn) {
    return this._async.unmemoize(fn);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.log = function(/*function, arguments...*/) {
    var args = Array.prototype.slice.call(arguments, 1);

    return this._async.log.apply(this, args);
}

/**
 * @interface {danf:manipulation.flowDriver}
 */
FlowDriver.prototype.dir = function(/*function, arguments...*/) {
    var args = Array.prototype.slice.call(arguments, 1);

    return this._async.dir.apply(this, args);
}
});

define('node_modules/danf/lib/common/manipulation/data-interpreter/flatten',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/manipulation/data-interpreter/abstract'],function (require, exports, module) {'use strict';

/**
 * Expose `Flatten`.
 */
module.exports = Flatten;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    Abstract = require('node_modules/danf/lib/common/manipulation/data-interpreter/abstract')
;

/**
 * Initialize a new flatten data interpreter.
 */
function Flatten() {
}

utils.extend(Abstract, Flatten);

/**
 * @interface {danf:manipulation.dataInterpreter}
 */
Object.defineProperty(Flatten.prototype, 'order', {
    value: 800
});

/**
 * @interface {danf:manipulation.dataInterpreter}
 */
Flatten.prototype.interpret = function(name, value, contract, parameters) {
    // Flatten the value with the given separator if defined.
    if (undefined !== contract.flatten && 'object' === typeof value) {
        if (null != contract.flatten) {
            Object.checkType(contract.flatten, 'boolean|string');
        }

    	var separator = contract.flatten === true ? '.' : '' + contract.flatten;

    	value = utils.flatten(value, 100, separator);
    }

    return value;
}
});

define('node_modules/danf/lib/common/manipulation/data-interpreter/format',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/manipulation/data-interpreter/abstract'],function (require, exports, module) {'use strict';

/**
 * Expose `Format`.
 */
module.exports = Format;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    Abstract = require('node_modules/danf/lib/common/manipulation/data-interpreter/abstract')
;

/**
 * Initialize a new Format data interpreter.
 */
function Format() {
}

utils.extend(Abstract, Format);

/**
 * @interface {danf:manipulation.dataInterpreter}
 */
Object.defineProperty(Format.prototype, 'order', {
    value: 1200
});

/**
 * @interface {danf:manipulation.dataInterpreter}
 */
Format.prototype.interpret = function(name, value, contract, parameters) {
    // Format the value.
    if (null != value && contract.format) {
        Object.checkType(contract.format, 'function');

        var formattedValue = contract.format(value, parameters);

        if (null != formattedValue) {
            value = formattedValue;
        }
    }

    return value;
}
});

define('node_modules/danf/lib/common/manipulation/data-interpreter/validate',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/manipulation/data-interpreter/abstract'],function (require, exports, module) {'use strict';

/**
 * Expose `Validate`.
 */
module.exports = Validate;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    Abstract = require('node_modules/danf/lib/common/manipulation/data-interpreter/abstract')
;

/**
 * Initialize a new Validate data interpreter.
 */
function Validate() {
}

utils.extend(Abstract, Validate);

/**
 * @interface {danf:manipulation.dataInterpreter}
 */
Object.defineProperty(Validate.prototype, 'order', {
    value: 1800
});

/**
 * @interface {danf:manipulation.dataInterpreter}
 */
Validate.prototype.interpret = function(name, value, contract, parameters) {
    // Validate the value.
    if (
        (parameters.final || undefined === parameters.final) &&
        null != value &&
        contract.validate
    ) {
        Object.checkType(contract.validate, 'function');

        try {
            var validatedValue = contract.validate(value, parameters);
        } catch (error) {
            throw new Error(
                'The expected value for "{0}" is {1}; {2} given instead.'.format(
                    name,
                    error.message,
                    Object.getTypeString(value, true)
                )
            );
        }

        if (null != validatedValue) {
            value = validatedValue;
        }
    }

    return value;
}
});

define('node_modules/danf/lib/common/manipulation/asynchronous-callback/error',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `Error`.
 */
module.exports = Error;

/**
 * Initialize a new error asynchronous callback.
 */
function Error() {
}

Error.defineImplementedInterfaces(['danf:manipulation.asynchronousCallback']);

/**
 * @interface {danf:manipulation.asynchronousCallback}
 */
Error.prototype.execute = function(callback, error, result) {
    callback(error);
}

/**
 * @interface {danf:manipulation.asynchronousCallback}
 */
Error.prototype.wrap = function(callback) {
    return function(error) {
        if (error instanceof Error) {
            throw error;
        }

        callback();
    }
}
});

define('node_modules/danf/lib/common/manipulation/asynchronous-callback/error-result',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `ErrorResult`.
 */
module.exports = ErrorResult;

/**
 * Initialize a new error result asynchronous callback.
 */
function ErrorResult() {
}

ErrorResult.defineImplementedInterfaces(['danf:manipulation.asynchronousCallback']);

/**
 * @interface {danf:manipulation.asynchronousCallback}
 */
ErrorResult.prototype.execute = function(callback, error, result) {
    callback(error, result);
}

/**
 * @interface {danf:manipulation.asynchronousCallback}
 */
ErrorResult.prototype.wrap = function(callback) {
    return function(error, result) {
        if (error instanceof ErrorResult) {
            throw error;
        }

        callback(result);
    }
}
});

define('node_modules/danf/lib/common/manipulation/asynchronous-callback/result',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `Result`.
 */
module.exports = Result;

/**
 * Initialize a new result asynchronous callback.
 */
function Result() {
}

Result.defineImplementedInterfaces(['danf:manipulation.asynchronousCallback']);

/**
 * @interface {danf:manipulation.asynchronousCallback}
 */
Result.prototype.execute = function(callback, error, result) {
    callback(result);
}

/**
 * @interface {danf:manipulation.asynchronousCallback}
 */
Result.prototype.wrap = function(callback) {
    return function(result) {
        callback(result);
    }
}
});

define('node_modules/danf/lib/common/manipulation/asynchronous-input/array',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `Array_`.
 */
module.exports = Array_;

/**
 * Initialize a new array asynchronous input.
 */
function Array_() {
}

Array_.defineImplementedInterfaces(['danf:manipulation.asynchronousInput']);

/**
 * @interface {danf:manipulation.asynchronousInput}
 */
Array_.prototype.format = function(input) {
    if ('object' === typeof input && !Array.isArray(input)) {
        var formattedInput = [];

        for (var key in input) {
            formattedInput.push(input[key]);
        }

        input = formattedInput;
    }

    try {
        Object.checkType(input, 'array');
    } catch (error) {
        if (error.instead) {
            throw new Error('The input of the collection should be {0}; {1} given instead.'.format(
                error.expected,
                error.instead
            ));
        }

        throw error;
    }

    return input;
}
});

define('node_modules/danf/lib/common/manipulation/asynchronous-input/object',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `Object_`.
 */
module.exports = Object_;

/**
 * Initialize a new object asynchronous input.
 */
function Object_() {
}

Object_.defineImplementedInterfaces(['danf:manipulation.asynchronousInput']);

/**
 * @interface {danf:manipulation.asynchronousInput}
 */
Object_.prototype.format = function(input) {
    try {
        Object.checkType(input, 'object|array');
    } catch (error) {
        if (error.instead) {
            throw new Error('The input of the collection should be {0}; {1} given instead.'.format(
                error.expected,
                error.instead
            ));
        }

        throw error;
    }

    return input;
}
});

define('node_modules/danf/lib/common/manipulation/asynchronous-iterator/collection',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `Collection`.
 */
module.exports = Collection;

/**
 * Initialize a new collection asynchronous iterator.
 */
function Collection() {
}

Collection.defineImplementedInterfaces(['danf:manipulation.asynchronousIterator']);

/**
 * @interface {danf:manipulation.asynchronousIterator}
 */
Collection.prototype.wrap = function(iterator) {
    return function(item, callback) {
        iterator({
            item: item,
            callback: callback
        });
    }
}
});

define('node_modules/danf/lib/common/manipulation/asynchronous-iterator/key',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `Key`.
 */
module.exports = Key;

/**
 * Initialize a new key asynchronous iterator.
 */
function Key() {
}

Key.defineImplementedInterfaces(['danf:manipulation.asynchronousIterator']);

/**
 * @interface {danf:manipulation.asynchronousIterator}
 */
Key.prototype.wrap = function(iterator) {
    return function(item, key, callback) {
        iterator({
            item: item,
            key: key,
            callback: callback
        });
    }
}
});

define('node_modules/danf/lib/common/manipulation/asynchronous-iterator/memo',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `Memo`.
 */
module.exports = Memo;

/**
 * Initialize a new memo asynchronous iterator.
 */
function Memo() {
}

Memo.defineImplementedInterfaces(['danf:manipulation.asynchronousIterator']);

/**
 * @interface {danf:manipulation.asynchronousIterator}
 */
Memo.prototype.wrap = function(iterator) {
    return function(memo, item, callback) {
        iterator({
            item: item,
            memo: memo,
            callback: callback
        });
    }
}
});

define('node_modules/danf/lib/common/manipulation/asynchronous-collection',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `AsynchronousCollection`.
 */
module.exports = AsynchronousCollection;

/**
 * Initialize a new asynchronous collection.
 */
function AsynchronousCollection() {
    this._parameters = {};
}

AsynchronousCollection.defineImplementedInterfaces(['danf:manipulation.asynchronousCollection']);

AsynchronousCollection.defineDependency('_method', 'string');
AsynchronousCollection.defineDependency('_alias', 'string|null');
AsynchronousCollection.defineDependency('_parameters', 'mixed_object');
AsynchronousCollection.defineDependency('_input', 'danf:manipulation.asynchronousInput');
AsynchronousCollection.defineDependency('_iterator', 'danf:manipulation.asynchronousIterator');
AsynchronousCollection.defineDependency('_callback', 'danf:manipulation.asynchronousCallback');

/**
 * Async method name.
 *
 * @var {string}
 * @api public
 */
Object.defineProperty(AsynchronousCollection.prototype, 'method', {
    set: function(method) { this._method = method; },
    get: function() { return this._method; }
});

/**
 * Optional alias name.
 *
 * @var {string|null}
 * @api public
 */
Object.defineProperty(AsynchronousCollection.prototype, 'alias', {
    set: function(alias) { this._alias = alias; },
    get: function() { return this._alias; }
});

/**
 * Parameters.
 *
 * @var {mixed_object}
 * @api public
 */
Object.defineProperty(AsynchronousCollection.prototype, 'parameters', {
    set: function(parameters) { this._parameters = parameters; },
    get: function() { return this._parameters; }
});

/**
 * Input type.
 *
 * @var {danf:manipulation.asynchronousInput}
 * @api public
 */
Object.defineProperty(AsynchronousCollection.prototype, 'input', {
    set: function(input) { this._input = input; }
});

/**
 * Iterator.
 *
 * @var {danf:manipulation.asynchronousIterator}
 * @api public
 */
Object.defineProperty(AsynchronousCollection.prototype, 'iterator', {
    set: function(iterator) { this._iterator = iterator; }
});

/**
 * Callback.
 *
 * @var {danf:manipulation.asynchronousCallback}
 * @api public
 */
Object.defineProperty(AsynchronousCollection.prototype, 'callback', {
    set: function(callback) { this._callback = callback; }
});

/**
 * @interface {danf:manipulation.asynchronousCollection}
 */
AsynchronousCollection.prototype.formatInput = function(input) {
    return this._input.format(input);
}

/**
 * @interface {danf:manipulation.asynchronousCollection}
 */
AsynchronousCollection.prototype.wrapIterator = function(iterator) {
    return this._iterator.wrap(iterator);
}

/**
 * @interface {danf:manipulation.asynchronousCollection}
 */
AsynchronousCollection.prototype.executeIteratorCallback = function(callback, error, result) {
    this._callback.execute(callback, error, result);
}

/**
 * @interface {danf:manipulation.asynchronousCollection}
 */
AsynchronousCollection.prototype.wrapCallback = function(callback) {
    return this._callback.wrap(callback);
}
});

define('node_modules/danf/config/common/manipulation/classes',['require','exports','module','node_modules/danf/lib/common/manipulation/escaper','node_modules/danf/lib/common/manipulation/unique-id-generator','node_modules/danf/lib/common/manipulation/reference-resolver','node_modules/danf/lib/common/manipulation/reference-type','node_modules/danf/lib/common/manipulation/data-resolver','node_modules/danf/lib/common/manipulation/map','node_modules/danf/lib/common/manipulation/registry','node_modules/danf/lib/common/manipulation/notifier-registry','node_modules/danf/lib/common/manipulation/callback-executor','node_modules/danf/lib/common/manipulation/flow','node_modules/danf/lib/common/manipulation/flow-driver','node_modules/danf/lib/common/manipulation/data-interpreter/abstract','node_modules/danf/lib/common/manipulation/data-interpreter/default','node_modules/danf/lib/common/manipulation/data-interpreter/flatten','node_modules/danf/lib/common/manipulation/data-interpreter/format','node_modules/danf/lib/common/manipulation/data-interpreter/required','node_modules/danf/lib/common/manipulation/data-interpreter/type','node_modules/danf/lib/common/manipulation/data-interpreter/validate','node_modules/danf/lib/common/manipulation/asynchronous-callback/error','node_modules/danf/lib/common/manipulation/asynchronous-callback/error-result','node_modules/danf/lib/common/manipulation/asynchronous-callback/result','node_modules/danf/lib/common/manipulation/asynchronous-input/array','node_modules/danf/lib/common/manipulation/asynchronous-input/object','node_modules/danf/lib/common/manipulation/asynchronous-iterator/collection','node_modules/danf/lib/common/manipulation/asynchronous-iterator/key','node_modules/danf/lib/common/manipulation/asynchronous-iterator/memo','node_modules/danf/lib/common/manipulation/asynchronous-collection'],function (require, exports, module) {'use strict';

module.exports = {
    escaper: require('node_modules/danf/lib/common/manipulation/escaper'),
    uniqueIdGenerator: require('node_modules/danf/lib/common/manipulation/unique-id-generator'),
    referenceResolver: require('node_modules/danf/lib/common/manipulation/reference-resolver'),
    referenceType: require('node_modules/danf/lib/common/manipulation/reference-type'),
    dataResolver: require('node_modules/danf/lib/common/manipulation/data-resolver'),
    map: require('node_modules/danf/lib/common/manipulation/map'),
    registry: require('node_modules/danf/lib/common/manipulation/registry'),
    notifierRegistry: require('node_modules/danf/lib/common/manipulation/notifier-registry'),
    callbackExecutor: require('node_modules/danf/lib/common/manipulation/callback-executor'),
    flow: require('node_modules/danf/lib/common/manipulation/flow'),
    flowDriver: require('node_modules/danf/lib/common/manipulation/flow-driver'),
    dataInterpreter: {
        abstract: require('node_modules/danf/lib/common/manipulation/data-interpreter/abstract'),
        default: require('node_modules/danf/lib/common/manipulation/data-interpreter/default'),
        flatten: require('node_modules/danf/lib/common/manipulation/data-interpreter/flatten'),
        format: require('node_modules/danf/lib/common/manipulation/data-interpreter/format'),
        required: require('node_modules/danf/lib/common/manipulation/data-interpreter/required'),
        type: require('node_modules/danf/lib/common/manipulation/data-interpreter/type'),
        validate: require('node_modules/danf/lib/common/manipulation/data-interpreter/validate')
    },
    asynchronousCallback: {
        error: require('node_modules/danf/lib/common/manipulation/asynchronous-callback/error'),
        errorResult: require('node_modules/danf/lib/common/manipulation/asynchronous-callback/error-result'),
        result: require('node_modules/danf/lib/common/manipulation/asynchronous-callback/result')
    },
    asynchronousInput: {
        array: require('node_modules/danf/lib/common/manipulation/asynchronous-input/array'),
        object: require('node_modules/danf/lib/common/manipulation/asynchronous-input/object')
    },
    asynchronousIterator: {
        collection: require('node_modules/danf/lib/common/manipulation/asynchronous-iterator/collection'),
        key: require('node_modules/danf/lib/common/manipulation/asynchronous-iterator/key'),
        memo: require('node_modules/danf/lib/common/manipulation/asynchronous-iterator/memo')
    },
    asynchronousCollection: require('node_modules/danf/lib/common/manipulation/asynchronous-collection')
};
});

define('node_modules/danf/config/client/manipulation/events',['require','exports','module'],function (require, exports, module) {'use strict';

module.exports = {
    dom: {
        'danf:manipulation.danf': {
            event: 'danf'
        }
    }
};
});

define('node_modules/danf/config/client/manipulation/interfaces',['require','exports','module'],function (require, exports, module) {'use strict';

module.exports = {
    bodyProvider: {
        methods: {
            /**
             * Provide the jquery body element.
             *
             * @return {object} The optional dom or jquery specific document.
             */
            provide: {
                arguments: ['object|null/document'],
                returns: 'object'
            }
        }
    },
    readyProcessor: {
        methods: {
            /**
             * Process a ready sequence on a scope element.
             *
             * @param {object} scope The scope element.
             */
            process: {
                arguments: ['object/scope']
            }
        }
    },
    history: {
        methods: {
            /**
             * Initialize the first history state.
             *
             * @param {object} event The event object.
             * @param {object} data The data associated to the event.
             */
            initialize: {},
            /**
             * Push a history state.
             *
             * @param {string|null} path The path.
             * @param {object|null} state The state.
             */
            push: {
                arguments: ['string|null/path', 'object|null/state']
            },
            /**
             * Replace the current history state.
             *
             * @param {string|null} path The path.
             * @param {object|null} state The state.
             */
            replace: {
                arguments: ['string|null/path', 'object|null/state']
            },
            /**
             * Replace the current history state if path is the same
             * as the current one, push otherwise.
             *
             * @param {string|null} path The path.
             * @param {object|null} state The state.
             */
            set: {
                arguments: ['string|null/path', 'object|null/state']
            },
            /**
             * Navigate to a history state.
             *
             * @param {object} state The state.
             */
            navigate: {
                arguments: ['object/state']
            }
        }
    }
};
});

define('node_modules/danf/config/client/manipulation/services',['require','exports','module'],function (require, exports, module) {'use strict';

module.exports = {
    bodyProvider: {
        class: 'danf:manipulation.bodyProvider',
        properties: {
            jquery: '#danf:vendor.jquery#'
        }
    },
    readyProcessor: {
        class: 'danf:manipulation.readyProcessor',
        properties: {
            jquery: '#danf:vendor.jquery#',
            processingEvent: '#danf:event.eventsContainer[dom][danf:manipulation.danf]#'
        }
    },
    history: {
        class: 'danf:manipulation.history',
        properties: {
            jquery: '#danf:vendor.jquery#',
            bodyProvider: '#danf:manipulation.bodyProvider#',
            readyProcessor: '#danf:manipulation.readyProcessor#'
        }
    }
};
});

define('node_modules/danf/config/client/manipulation/sequences',['require','exports','module'],function (require, exports, module) {'use strict';

module.exports = {
    process: {
        stream: {
            scope: {
                type: 'object',
                default: null
            }
        },
        operations: [
            {
                order: -10,
                condition: function(stream) {
                    return stream.scope ? false : true;
                },
                service: 'danf:manipulation.history',
                method: 'initialize',
                arguments: ['@scope@']
            }
        ]
    },
    navigate: {
        operations: [
            {
                order: 0,
                service: 'danf:manipulation.history',
                method: 'navigate',
                arguments: ['!event.originalEvent.state!']
            }
        ]
    }
};
});

define('node_modules/danf/lib/client/manipulation/body-provider',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `BodyProvider`.
 */
module.exports = BodyProvider;

/**
 * Initialize a new body provider.
 */
function BodyProvider() {
}

BodyProvider.defineImplementedInterfaces(['danf:manipulation.bodyProvider']);

BodyProvider.defineDependency('_jquery', 'function');

/**
 * JQuery.
 *
 * @var {function}
 * @api public
 */
Object.defineProperty(BodyProvider.prototype, 'jquery', {
    set: function(jquery) { this._jquery = jquery; }
});

/**
 * @interface {danf:manipulation.bodyProvider}
 */
BodyProvider.prototype.provide = function(doc) {
    var $ = this._jquery,
        fromSpecificDocument = doc ? true : false,
        doc = fromSpecificDocument ? $(doc) : $(document)
    ;

    if (fromSpecificDocument) {
        var wrapper = $(document.createElement('div'));

        wrapper.wrapInner(doc);
        doc = wrapper;
    }

    var body = doc.find('#body')

    if (0 === body.length) {
        if (fromSpecificDocument) {
            body = doc.find('body');

            if (body.length === 0) {
                body = doc;
            }
        } else {
            body = $(document.body);
        }
    }

    return body;
}
});

define('node_modules/danf/lib/client/manipulation/ready-processor',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `ReadyProcessor`.
 */
module.exports = ReadyProcessor;

/**
 * Initialize a new ready trigger.
 */
function ReadyProcessor() {
}

ReadyProcessor.defineImplementedInterfaces(['danf:manipulation.readyProcessor']);

ReadyProcessor.defineDependency('_jquery', 'function');
ReadyProcessor.defineDependency('_processingEvent', 'danf:event.event');

/**
 * JQuery.
 *
 * @var {function}
 * @api public
 */
Object.defineProperty(ReadyProcessor.prototype, 'jquery', {
    set: function(jquery) { this._jquery = jquery; }
});

/**
 * Processing event.
 *
 * @var {danf:event.event}
 * @api public
 */
Object.defineProperty(ReadyProcessor.prototype, 'processingEvent', {
    set: function(processingEvent) { this._processingEvent = processingEvent; }
});

/**
 * @interface {danf:manipulation.readyProcessor}
 */
ReadyProcessor.prototype.process = function(scope) {
    this._processingEvent.trigger(
        {scope: (scope ? this._jquery(scope) : null)}
    );
}
});

define('node_modules/danf/lib/client/manipulation/history',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `History`.
 */
module.exports = History;

/**
 * Initialize a new history.
 */
function History() {
}

History.defineImplementedInterfaces(['danf:manipulation.history']);

History.defineDependency('_jquery', 'function');
History.defineDependency('_bodyProvider', 'danf:manipulation.bodyProvider');
History.defineDependency('_readyProcessor', 'danf:manipulation.readyProcessor');

/**
 * JQuery.
 *
 * @var {function}
 * @api public
 */
Object.defineProperty(History.prototype, 'jquery', {
    set: function(jquery) { this._jquery = jquery; }
});

/**
 * Body provider.
 *
 * @var {danf:manipulation.bodyProvider}
 * @api public
 */
Object.defineProperty(History.prototype, 'bodyProvider', {
    set: function(bodyProvider) { this._bodyProvider = bodyProvider; }
});

/**
 * Ready processor.
 *
 * @var {danf:manipulation.readyProcessor}
 * @api public
 */
Object.defineProperty(History.prototype, 'readyProcessor', {
    set: function(readyProcessor) { this._readyProcessor = readyProcessor; }
});

/**
 * @interface {danf:manipulation.history}
 */
History.prototype.initialize = function() {
    if (null == window.history.state) {
        var path = getCurrentPath();

        this.replace(
            path,
            {
                path: path,
                content: getBodyContent.call(this)
            }
        );
    }
}

/**
 * @interface {danf:manipulation.history}
 */
History.prototype.push = function(path, state) {
    if (window.history.pushState) {
        state = state || {};
        state.path = path;
        state.content = getBodyContent.call(this);

        window.history.pushState(
            state,
            '',
            null != path ? path : getCurrentPath()
        );
    }
}

/**
 * @interface {danf:manipulation.history}
 */
History.prototype.replace = function(path, state) {
    if (window.history.replaceState) {
        state = state || {};
        state.path = path;
        state.content = getBodyContent.call(this);

        window.history.replaceState(
            state,
            '',
            null != path ? path : getCurrentPath()
        );
    }
}

/**
 * @interface {danf:manipulation.history}
 */
History.prototype.set = function(path, state) {
    if (window.history.state && window.history.state.path === path) {
        this.replace(path, state);
    } else {
        this.push(path, state);
    }
}

/**
 * @interface {danf:manipulation.history}
 */
History.prototype.navigate = function(state) {
    var $ = this._jquery,
        content = state.content,
        body = $(document.body)
    ;

    if (content) {
        if (body.html() !== content) {
            body.html(content);

            // Trigger an ajax ready event with the new integrated
            // data as scope.
            this._readyProcessor.process(body);
        }
    }
}

/**
 * Retrieve the body content.
 *
 * @return {string} The body content.
 * @api private
 */
var getBodyContent = function() {
    return this._jquery(document.body).html();
}

/**
 * Retrieve the current path.
 *
 * @return {string} The current path.
 * @api private
 */
var getCurrentPath = function() {
    return '{0}{1}'.format(window.location.pathname, window.location.search);
}
});

define('node_modules/danf/config/client/manipulation/classes',['require','exports','module','node_modules/danf/lib/client/manipulation/body-provider','node_modules/danf/lib/client/manipulation/ready-processor','node_modules/danf/lib/client/manipulation/history'],function (require, exports, module) {'use strict';

module.exports = {
    bodyProvider: require('node_modules/danf/lib/client/manipulation/body-provider'),
    readyProcessor: require('node_modules/danf/lib/client/manipulation/ready-processor'),
    history: require('node_modules/danf/lib/client/manipulation/history')
};
});

define('node_modules/danf/config/common/logging/interfaces',['require','exports','module'],function (require, exports, module) {'use strict';

module.exports = {
    logger: {
        methods: {
            /**
             * Log a message.
             *
             * @param {string} message The message.
             * @param {number} verbosity The verbosity level.
             * @param {number|null} indentation The optional indentation level.
             */
            log: {
                arguments: [
                    'string/message',
                    'number/verbosity',
                    'number|null/indentation'
                ]
            }
        }
    }
};
});

define('node_modules/danf/lib/common/logging/logger',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `Logger`.
 */
module.exports = Logger;

/**
 * Initialize a new logger.
 */
function Logger() {
    this._styles = {};
}

Logger.defineImplementedInterfaces(['danf:logging.logger']);

Logger.defineDependency('_verbosity', 'number');
Logger.defineDependency('_styles', 'string_object');
Logger.defineDependency('_chalk', 'object|null');

/**
 * Verbosity level.
 *
 * @var {number}
 * @api public
 */
Object.defineProperty(Logger.prototype, 'verbosity', {
    set: function(verbosity) { this._verbosity = verbosity; }
});

/**
 * Styles.
 *
 * @var {string_object}
 * @api public
 */
Object.defineProperty(Logger.prototype, 'styles', {
    set: function(styles) { this._styles = styles; }
});

/**
 * Chalk lib.
 *
 * @var {object}
 * @api public
 */
Object.defineProperty(Logger.prototype, 'chalk', {
    set: function(chalk) { this._chalk = chalk; }
});

/**
 * @interface {danf:logging.logger}
 */
Logger.prototype.log = function(message, verbosity, indentation) {
    // Do not log higher verbosity levels.
    // The lower is the verbosity level the lower is the verbosity.
    if (verbosity > this._verbosity) {
        return;
    }

    var parts = message.split(/<<(\/?[\w-]+)>>/),
        displayedMessage = '',
        attributes = {},
        indentation = indentation ? indentation : 0
    ;

    for (var i = 0; i < indentation; i++) {
        displayedMessage += '  ';
    }

    for (var i = 0; i < parts.length; i++) {
        if (0 === i % 2) {
            var style = this._chalk || {};

            for (var attribute in attributes) {
                if (style[attribute]) {
                    style = style[attribute];
                }
            }

            displayedMessage += this._chalk === style || null == this._chalk
                ? parts[i]
                : style(parts[i])
            ;
        } else {
            var remove = '/' === parts[i].charAt(0);

            attributes = setAttributes.call(
                this,
                (remove ? parts[i].substr(1) : parts[i]).split('-'),
                attributes,
                remove
            );
        }
    }

    console.log(displayedMessage);
}

/**
 * Add or remove attributes.
 *
 * @param {string_array} affectedAttributes The affected attributes.
 * @param {boolean_object} attributes The current attributes list.
 * @param {boolean} remove Whether or not it is a removing of attributes.
 * @return {boolean_object} attributes The new attributes list.
 * @api private
 */
var setAttributes = function(affectedAttributes, attributes, remove) {
    for (var j = 0; j < affectedAttributes.length; j++) {
        var attribute = affectedAttributes[j];

        if (this._styles[attribute]) {
            attributes = setAttributes.call(
                this,
                this._styles[attribute].split('-'),
                attributes,
                remove
            );
        } else {
            if (remove) {
                delete attributes[attribute];
            } else {
                attributes[attribute] = true;
            }
        }
    }

    return attributes;
}
});

define('node_modules/danf/config/common/logging/classes',['require','exports','module','node_modules/danf/lib/common/logging/logger'],function (require, exports, module) {'use strict';

module.exports = {
    logger: require('node_modules/danf/lib/common/logging/logger')
};
});

define('node_modules/danf/config/client/logging/services',['require','exports','module'],function (require, exports, module) {'use strict';

module.exports = {
    logger: {
        class: 'danf:logging.logger',
        properties: {
            verbosity: '%danf:context.verbosity%',
            styles: {
                error: 'red',
                warning: 'yellow'
            }
        }
    }
};
});

define('node_modules/danf/config/common/object/interfaces',['require','exports','module'],function (require, exports, module) {'use strict';

module.exports = {
    classesContainer: {
        methods: {
            /**
             * Set the definition of a class.
             *
             * @param {string} id The id of the class.
             * @param {function} class The class.
             */
            setDefinition: {
                arguments: ['string/id', 'function/class']
            },
            /**
             * Get the definition of a class.
             *
             * @param {string} id The id of the class.
             * @return {object} The class.
             */
            getDefinition: {
                arguments: ['string/id'],
                returns: 'object'
            },
            /**
             * Whether or not a class is defined.
             *
             * @param {string} id The id of the class.
             * @return {boolean} True if the class is defined, false otherwise.
             */
            hasDefinition: {
                arguments: ['string/id'],
                returns: 'boolean'
            },
            /**
             * Build the definitions of the classes applying the class processors.
             */
            build: {
                arguments: []
            },
            /**
             * Get a processed class.
             *
             * @param {string} id The id of the class.
             * @return {function} The class.
             */
            get: {
                arguments: ['string/id'],
                returns: 'function'
            },
            /**
             * Whether or not a class has been processed.
             *
             * @param {string} id The id of the class.
             * @return {boolean} True if the class has been processed, false otherwise.
             */
            has: {
                arguments: ['string/id'],
                returns: 'boolean'
            }
        }
    },
    interfacesContainer: {
        methods: {
            /**
             * Set the definition of an interface.
             *
             * @param {string} id The id of the interface.
             * @param {object} definition The definition of the interface.
             */
            setDefinition: {
                arguments: ['string/id', 'object/definition']
            },
            /**
             * Get the definition of an interface.
             *
             * @param {string} id The id of the interface.
             * @return {object} The definition of the interface.
             */
            getDefinition: {
                arguments: ['string/id'],
                returns: 'object'
            },
            /**
             * Whether or not an interface is defined.
             *
             * @param {string} id The id of the interface.
             * @return {boolean} True if the interface is defined, false otherwise.
             */
            hasDefinition: {
                arguments: ['string/id'],
                returns: 'boolean'
            },
            /**
             * Build the definitions of the interfaces.
             */
            build: {
                arguments: []
            },
            /**
             * Get an interface.
             *
             * @param {string} id The id of the interface.
             * @return {danf:object.interface} The interface.
             */
            get: {
                arguments: ['string/id'],
                returns: 'danf:object.interface'
            },
            /**
             * Whether or not an interface has been processed.
             *
             * @param {string} id The id of the interface.
             * @return {boolean} True if the interface exists, false otherwise.
             */
            has: {
                arguments: ['string/id'],
                returns: 'boolean'
            }
        }
    },
    'interface': {
        methods: {
            /**
             * Whether or not the interface define a method.
             *
             * @param {string} methodName The name of the method.
             * @return {boolean} True if the interface define the method, false otherwise.
             * @throw {error} If the interface is not defined.
             */
            hasMethod: {
                arguments: ['string/name', 'string/methodName'],
                returns: 'boolean'
            },
            /**
             * Get a method of the interface.
             *
             * @param {string} methodName The name of the method.
             * @return {object} The method.
             * @throw {error} If the method of the interface is not defined.
             */
            getMethod: {
                arguments: ['string/name', 'string/methodName'],
                returns: 'object'
            },
            /**
             * Whether or not the interface define a getter.
             *
             * @param {string} getterName The name of the getter.
             * @return {boolean} True if the interface define the getter, false otherwise.
             * @throw {error} If the interface is not defined.
             */
            hasGetter: {
                arguments: ['string/name', 'string/getterName'],
                returns: 'boolean'
            },
            /**
             * Get a getter of the interface.
             *
             * @param {string} getterName The name of the getter.
             * @return {object} The getter.
             * @throw {error} If the getter of the interface is not defined.
             */
            getGetter: {
                arguments: ['string/name', 'string/getterName'],
                returns: 'string'
            },
            /**
             * Whether or not the interface define a setter.
             *
             * @param {string} setterName The name of the setter.
             * @return {boolean} True if the interface define the setter, false otherwise.
             * @throw {error} If the interface is not defined.
             */
            hasSetter: {
                arguments: ['string/name', 'string/setterName'],
                returns: 'boolean'
            },
            /**
             * Get a setter of the interface.
             *
             * @param {string} setterName The name of the setter.
             * @return {object} The setter.
             * @throw {error} If the setter of the interface is not defined.
             */
            getSetter: {
                arguments: ['string/name', 'string/setterName'],
                returns: 'string'
            }
        },
        getters: {
            /**
             * Name.
             *
             * @return {string}
             */
            name: 'string',
            /**
             * Name of the extended interface.
             *
             * @return {string}
             */
            'extends': 'string',
            /**
             * Methods.
             *
             * @return {mixed_object_object}
             */
            methods: 'mixed_object_object',
            /**
             * Getters.
             *
             * @return {string_object}
             */
            getters: 'string_object',
            /**
             * Setters.
             *
             * @return {string_object}
             */
            setters: 'string_object'
        }
    },
    interfacer: {
        methods: {
            /**
             * Add a proxy on an object to ensure the respect of an interface.
             *
             * @param {object} object The object.
             * @param {string} interfaceName The name of the interface.
             */
            addProxy: {
                arguments: ['object/object', 'string/interfaceName']
            }
        }
    },
    classProcessor: {
        methods: {
            /**
             * Process a class.
             *
             * @param {function}
             */
            process: {
                arguments: ['function/class']
            }
        },
        getters: {
            /**
             * Order of execution.
             *
             * @return {number}
             */
            order: 'number'
        },
        setters: {
            /**
             * Classes container.
             *
             * @param {danf:object.classesContainer}
             */
            classesContainer: 'danf:object.classesContainer'
        }
    }
};
});

define('node_modules/danf/config/common/object/services',['require','exports','module'],function (require, exports, module) {'use strict';

module.exports = {
    classesContainer: {
        class: 'danf:object.classesContainer',
        properties: {
            classProcessors: '&danf:object.classProcessor&'
        },
        lock: true
    },
    interfacesContainer: {
        class: 'danf:object.interfacesContainer',
        lock: true
    },
    interfacer: {
        class: 'danf:object.interfacer',
        properties: {
            debug: '%danf:context.debug%',
            interfacesContainer: '#danf:object.interfacesContainer#'
        }
    },
    classProcessor: {
        collections: ['danf:object.classProcessor'],
        children: {
            extender: {
                class: 'danf:object.classProcessor.extender'
            },
            interfacer: {
                class: 'danf:object.classProcessor.interfacer',
                properties: {
                    interfacesContainer: '#danf:object.interfacesContainer#'
                }
            }
        }
    },
    configuration: {
        children: {
            sectionProcessor: {
                parent: 'danf:configuration.sectionProcessor',
                children: {
                    interfaces: {
                        class: 'danf:object.configuration.sectionProcessor.interfaces',
                        properties: {
                            name: 'interfaces'
                        }
                    },
                    classes: {
                        class: 'danf:object.configuration.sectionProcessor.classes',
                        properties: {
                            name: 'classes'
                        }
                    }
                }
            }
        }
    },
};
});

define('node_modules/danf/lib/common/object/configuration/section-processor/interfaces',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/configuration/section-processor'],function (require, exports, module) {'use strict';

/**
 * Expose `Interfaces`.
 */
module.exports = Interfaces;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    SectionProcessor = require('node_modules/danf/lib/common/configuration/section-processor')
;

utils.extend(SectionProcessor, Interfaces);

/**
 * Initialize a new section processor interfaces for the config.
 */
function Interfaces() {
    SectionProcessor.call(this);

    this.contract = {
        __any: {
            extends: {
                type: 'string'
            },
            methods: {
                type: 'embedded_object',
                embed: {
                    arguments: {
                        type: 'string_array',
                        default: []
                    },
                    returns: {
                        type: 'string'
                    }
                },
                default: {}
            },
            getters: {
                type: 'string_object',
                default: {}
            },
            setters: {
                type: 'string_object',
                default: {}
            }
        },
        type: 'embedded',
        namespace: true
    };
}

/**
 * @interface {danf:configuration.sectionProcessor}
 */
Interfaces.prototype.interpretModuleConfig = function(config, module, modulesTree) {
    for (var interfaceName in config) {
        var interface_ = config[interfaceName];

        // Handle method arguments namespacing.
        if (interface_.methods) {
            for (var name in interface_.methods) {
                var method = interface_.methods[name];

                if (method.arguments) {
                    for (var i = 0; i < method.arguments.length; i++) {
                        method.arguments[i] = namespaceType.call(
                            this,
                            method.arguments[i],
                            module,
                            modulesTree
                        );
                    }
                }
            }
        }

        // Handle getters namespacing.
        if (interface_.getters) {
            for (var name in interface_.getters) {
                interface_.getters[name] = namespaceType.call(
                    this,
                    interface_.getters[name],
                    module,
                    modulesTree
                );
            }
        }

        // Handle setters namespacing.
        if (interface_.setters) {
            for (var name in interface_.setters) {
                interface_.setters[name] = namespaceType.call(
                    this,
                    interface_.setters[name],
                    module,
                    modulesTree
                );
            }
        }
    }

    return config;
}

/**
 * Namespace a type.
 *
 * @param {string} type The type.
 * @param {danf:configuration.module} module The module.
 * @param {danf:configuration.modulesTree} modulesTree The modules tree.
 * @return {string} The namespaced type.
 * @api private
 */
var namespaceType = function(type, module, modulesTree) {
    var argument = type.split('/'),
        types = argument[0].split('|')
    ;

    for (var i = 0; i < types.length; i++) {
        if (Object.isInterfaceType(types[i])) {
            types[i] = this._namespacer.prefix(types[i], module, modulesTree);
        }
    }

    type = types.join('|');

    return argument[1] ? '{0}/{1}'.format(type, argument[1]) : type;
}
});

define('node_modules/danf/lib/common/object/configuration/section-processor/classes',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/configuration/section-processor'],function (require, exports, module) {'use strict';

/**
 * Expose `Classes`.
 */
module.exports = Classes;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    SectionProcessor = require('node_modules/danf/lib/common/configuration/section-processor')
;

/**
 * Initialize a new section processor classes for the config.
 */
function Classes(name) {
    SectionProcessor.call(this);

    this.contract = {
        __any: null,
        type: 'function',
        namespace: true,
        flatten: '.'
    };
}

utils.extend(SectionProcessor, Classes);

/**
 * @interface {danf:configuration.sectionProcessor}
 */
Classes.prototype.interpretModuleConfig = function(config, module, modulesTree) {
    for (var className in config) {
        var class_ = config[className];

        if (class_.__metadata.dependencies) {
            for (var property in class_.__metadata.dependencies) {
                var dependency = class_.__metadata.dependencies[property],
                    types = dependency.type.split('|')
                ;

                for (var i = 0; i < types.length; i++) {
                    if (Object.isInterfaceType(types[i])) {
                        types[i] = this._namespacer.prefix(types[i], module, modulesTree);
                    }
                }

                dependency.type = types.join('|');

                if (dependency.providedType) {
                    if (Object.isInterfaceType(dependency.providedType)) {
                        dependency.providedType = this._namespacer.prefix(dependency.providedType, module, modulesTree);
                    }
                }
            }
        }

        if (class_.__metadata.extends) {
            class_.__metadata.extends = this._namespacer.prefix(class_.__metadata.extends, module, modulesTree);
        }

        if (class_.__metadata.implements) {
            for (var i = 0; i < class_.__metadata.implements.length; i++) {
                class_.__metadata.implements[i] = this._namespacer.prefix(class_.__metadata.implements[i], module, modulesTree);
            }
        }

        class_.__metadata.module = module.id;
    }

    return config;
}
});

define('node_modules/danf/config/common/object/classes',['require','exports','module','node_modules/danf/lib/common/object/classes-container','node_modules/danf/lib/common/object/interface','node_modules/danf/lib/common/object/interfaces-container','node_modules/danf/lib/common/object/interfacer','node_modules/danf/lib/common/object/class-processor/abstract','node_modules/danf/lib/common/object/class-processor/extender','node_modules/danf/lib/common/object/class-processor/interfacer','node_modules/danf/lib/common/object/configuration/section-processor/interfaces','node_modules/danf/lib/common/object/configuration/section-processor/classes'],function (require, exports, module) {'use strict';

module.exports = {
    classesContainer: require('node_modules/danf/lib/common/object/classes-container'),
    'interface': require('node_modules/danf/lib/common/object/interface'),
    interfacesContainer: require('node_modules/danf/lib/common/object/interfaces-container'),
    interfacer: require('node_modules/danf/lib/common/object/interfacer'),
    classProcessor: {
        abstract: require('node_modules/danf/lib/common/object/class-processor/abstract'),
        extender: require('node_modules/danf/lib/common/object/class-processor/extender'),
        interfacer: require('node_modules/danf/lib/common/object/class-processor/interfacer')
    },
    configuration: {
        sectionProcessor: {
            interfaces: require('node_modules/danf/lib/common/object/configuration/section-processor/interfaces'),
            classes: require('node_modules/danf/lib/common/object/configuration/section-processor/classes')
        }
    }
};
});

define('node_modules/danf/config/common/http/interfaces',['require','exports','module'],function (require, exports, module) {'use strict';

module.exports = {
    route: {
        methods: {
            /**
             * Match a path, a HTTP method and a host.
             *
             * @param {string} path The path.
             * @param {string} method The HTTP method.
             * @param {string|null} host The host, default localhost.
             * @return {boolean} True if the route match, false otherwise.
             */
            match: {
                arguments: [
                    'string/path',
                    'string/method',
                    'string|null/host'
                ],
                returns: 'boolean'
            },
            /**
             * Resolve a path from parameters.
             *
             * @param {object|string} parameters The parameters.
             * @return {string} The resolved path.
             * @throw {error} if there is a missing parameter.
             */
            resolve: {
                arguments: ['object|string/parameters'],
                returns: 'string'
            },
            /**
             * Follow a route.
             *
             * @param {object|null} parameters The request parameters.
             * @param {object|null} headers The request headers.
             * @param {object|null} meta The request metadata (path, protocol, host, ...).
             * @throw {error} if the url doest not match the route.
             */
            follow: {
                arguments: [
                    'object|string|null/parameters',
                    'object|null/headers',
                    'object|null/meta'
                ]
            }
        },
        getters: {
            /**
             * Path.
             *
             * @return {string}
             */
            path: 'string',
            /**
             * HTTP method.
             *
             * @return {string}
             */
            method: 'string',
            /**
             * Associated request event.
             *
             * @return {danf:event.event}
             */
            event: 'danf:event.event'
        }
    },
    router: {
        methods: {
            /**
             * Get a route.
             *
             * @param {string} name The identifier name of the route.
             * @return {danf:http.route} The route.
             * @throw {error} if the route does not exist.
             */
            get: {
                arguments: ['string/name'],
                returns: 'mixed'
            },
            /**
             * Set a route.
             *
             * @param {string} name The identifier name of the route.
             * @param {danf:http.route} route The route.
             */
            set: {
                arguments: [
                    'string/name',
                    'danf:http.route/route'
                ]
            },
            /**
             * Unset a route.
             *
             * @param {string} name The identifier name of the route.
             */
            unset: {
                arguments: [
                    'string/key',
                    'string|null/path',
                    'string|null/domain'
                ]
            },
            /**
             * Find a route from a URL/path and a HTTP method.
             *
             * @param {string|object} url The path/URL string or parsed.
             * @param {string|null} method The HTTP method.
             * @param {boolean|null} throwException Whether or not to throw an exception if no route found, default false.
             * @return {danf:http.route|null} The route or null if no route found and throwException is false.
             * @throw {error} if the route does not exist and throwException is true.
             */
            find: {
                arguments: [
                    'string|object/url',
                    'string|null/method',
                    'boolean|null/throwException'
                ],
                returns: 'danf:http.route|null'
            },
            /**
             * Follow a route from a URL/path and a HTTP method.
             *
             * @param {string} url The URL or path.
             * @param {string|null} method The HTTP method.
             * @param {object|null} parameters The request parameters.
             * @param {object|null} parameters The request headers.
             * @throw {error} if the route does not exist.
             */
            follow: {
                arguments: [
                    'string/url',
                    'string/method',
                    'object|null/parameters',
                    'object|null/headers'
                ]
            },
            /**
             * Parse an url.
             *
             * @param {string} url The URL.
             * @return {object} The parsed URL.
             * @throw {error} if the URL is not well formatted.
             */
            parse: {
                arguments: ['string/url'],
                returns: 'object'
            },
            /**
             * Parse a querystring.
             *
             * @param {string} querystring The querystring.
             * @return {object} The parsed parameters.
             */
            parseQuerystring: {
                arguments: ['string/querystring'],
                returns: 'object'
            }
        }
    },
    cookiesRegistry: {
        methods: {
            /**
             * Get a cookie.
             *
             * @param {string} key The key.
             * @return {mixed} The value.
             */
            get: {
                arguments: ['string/key'],
                returns: 'mixed'
            },
            /**
             * Set a cookie.
             *
             * @param {string} key The key.
             * @param {string} value The value.
             * @param {date|null} expiresAt The date of expiration.
             * @param {string|null} path The optional path.
             * @param {string|null} domain The optional domain.
             * @param {boolean|null} isSecure Whether or not this is a secure cookie.
             * @param {boolean|null} isHttpOnly Whether or not this is a http only cookie.
             */
            set: {
                arguments: [
                    'string/key',
                    'mixed/value',
                    'date|null/expiresAt',
                    'string|null/path',
                    'string|null/domain',
                    'boolean|null/isSecure',
                    'boolean|null/isHttpOnly'
                ]
            },
            /**
             * Unset a cookie.
             *
             * @param {string} key The key.
             * @param {string|null} path The optional path.
             * @param {string|null} domain The optional domain.
             */
            unset: {
                arguments: [
                    'string/key',
                    'string|null/path',
                    'string|null/domain'
                ]
            }
        }
    }
};
});

define('node_modules/danf/lib/common/http/route',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `Route`.
 */
module.exports = Route;

/**
 * Initialize a new route.
 */
function Route() {
}

Route.defineImplementedInterfaces(['danf:http.route']);

Route.defineDependency('_path', 'string|regexp');
Route.defineDependency('_hostname', 'string');
Route.defineDependency('_port', 'number|null');
Route.defineDependency('_method', 'string');
Route.defineDependency('_event', 'danf:event.event');

/**
 * Path.
 *
 * @var {string}
 * @api public
 */
Object.defineProperty(Route.prototype, 'path', {
    set: function(path) {
        path = formatPath(path);

        this._path = path;

        // Handle case where path is already a regexp.
        if (path instanceof RegExp) {
            this._regexp = path;
        // Handle string path.
        } else {
            var pattern = -1 !== path.indexOf('?')
                    ? '^{0}$'
                    : '^{0}(?:\\/|\\?.*)?$'
            ;

            this._regexp = new RegExp(pattern.format(path
                .replace(/[-[\]{}()*+?.,\\^$\/|#\s]/g, '\\$&')
                .replace(/(\/|=):[^\/]+/g, '$1[^\\/]+')
            ));
        }
    },
    get: function() { return this._path; }
});

/**
 * Host.
 *
 * @var {string}
 * @api public
 */
Object.defineProperty(Route.prototype, 'host', {
    set: function(host) {
        var hostParts = host.toLowerCase().split(':');

        this._hostname = hostParts[0];
        this._port = hostParts[1];
    },
    get: function() {
        return this._port
            ? '{0}:{1}'.format(this._hostname, this._port)
            : this._hostname
        ;
    }
});

/**
 * Hostname.
 *
 * @var {string}
 * @api public
 */
Object.defineProperty(Route.prototype, 'hostname', {
    set: function(hostname) { this._hostname = hostname.toLowerCase(); },
    get: function() { return this._hostname; }
});

/**
 * Port.
 *
 * @var {string}
 * @api public
 */
Object.defineProperty(Route.prototype, 'port', {
    set: function(port) { this._port = port; },
    get: function() { return this._port; }
});

/**
 * HTTP method.
 *
 * @var {string}
 * @api public
 */
Object.defineProperty(Route.prototype, 'method', {
    set: function(method) { this._method = method.toUpperCase(); },
    get: function() { return this._method; }
});

/**
 * Event.
 *
 * @var {danf:event.event}
 * @api public
 */
Object.defineProperty(Route.prototype, 'event', {
    set: function(event) { this._event = event; },
    get: function() { return this._event; }
});

/**
 * @interface {danf:event.route}
 */
Route.prototype.match = function(path, method, host) {
    return ((!host && 'localhost' === this.host) || this.host === host)
        && method.toUpperCase() === this._method
        && this._regexp.test(formatPath(path))
    ;
}

/**
 * @interface {danf:event.route}
 */
Route.prototype.resolve = function(parameters) {
    var self = this;

    if ('string' !== typeof this.path) {
        throw new Error(
            'Cannot resolve route [{0}]"{1}" defined by a regular expression.'.format(
                this._method,
                this._path
            )
        );
    }

    return this._path.replace(/(\/):([^\/?]+)|(=):([^&]+)(?:&|$)/g, function(match, $1, $2, $3, $4) {
        if (
            'object' !== typeof parameters
            || ($1 && null == parameters[$2])
            || ($3 && null == parameters[$4])
        ) {
            throw new Error(
                'Route [{0}]"{1}" needs a parameter "{2}".'.format(
                    self._method,
                    self._path,
                    $2 || $4
                )
            );
        }

        return '{0}{1}'.format($1 || $3, $1 ? parameters[$2] : parameters[$4]);
    });
}

/**
 * @interface {danf:event.route}
 */
Route.prototype.follow = function(parameters, headers, meta) {
    var hasMetaPath = meta && meta.path,
        hasMetaHost = meta && meta.host,
        path = hasMetaPath ? meta.path : this.resolve(parameters),
        host = hasMetaHost ? meta.host : this.host,
        data = {},
        params = parameters
    ;

    data.path = path;
    data.method = this._method;
    data.headers = headers || {};

    // Try to match informations coming from metadata.
    if (hasMetaPath || hasMetaHost) {
        if (
            !this.match(
                path,
                this._method,
                host
            )
        ) {
            throw new Error(
                'Path "{0}" for host "{1}" does not match route [{2}]"{3}" of "{4}".'.format(
                    path,
                    host,
                    this._method,
                    this._path,
                    this.host
                )
            );
        }
    }

    // Clone parameters and remove those which are in the query string.
    if (!hasMetaPath && 'object' === typeof parameters) {
        params = {};

        for (var key in parameters) {
            params[key] = parameters[key];
        }
    }

    data.parameters = params;

    // Add meta data.
    if (meta && meta.protocol) {
        data.protocol = meta.protocol;
    }
    data.hostname = this._hostname;
    if (this._port) {
        data.port = this._port;
    }

    this._event.trigger(data);
}

/**
 * Format a path.
 *
 * @param {string} path The path.
 * @return {string} The formatted path.
 * @api private
 */
var formatPath = function(path) {
    if ('string' === typeof path) {
        if (!/^\//.test(path)) {
            path = '/' + path;
        }
    }

    return path;
}
});

define('node_modules/danf/lib/common/http/router',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `Router`.
 */
module.exports = Router;

/**
 * Initialize a new router.
 */
function Router() {
    this._routes = {};
    this._methodRoutes = {};
}

Router.defineImplementedInterfaces(['danf:http.router', 'danf:manipulation.registryObserver']);

Router.defineDependency('_routeProvider', 'danf:dependencyInjection.provider', 'danf:http.route');
Router.defineDependency('_eventsContainer', 'danf:event.eventsContainer');
Router.defineDependency('_routes', 'danf:http.route_object');

/**
 * Route provider.
 *
 * @var {danf:manipulation.provider<danf:http.route>}
 * @api public
 */
Object.defineProperty(Router.prototype, 'routeProvider', {
    set: function(routeProvider) { this._routeProvider = routeProvider; }
});

/**
 * Events container.
 *
 * @var {danf:event.eventsContainer}
 * @api public
 */
Object.defineProperty(Router.prototype, 'eventsContainer', {
    set: function(eventsContainer) { this._eventsContainer = eventsContainer; }
});

/**
 * @interface {danf:manipulation.registryObserver}
 */
Router.prototype.handleRegistryChange = function(items, reset, name) {
    if (items['request']) {
        for (var id in items['request']) {
            if (!reset) {
                var request = items['request'][id];

                for (var i = 0; i < request.methods.length; i++) {
                    this.set(
                        id,
                        this._routeProvider.provide({
                            path: request.path,
                            host: request.host,
                            method: request.methods[i],
                            event: this._eventsContainer.get('request', id)
                        })
                    );
                }
            } else {
                this.unset(id);
            }
        }
    }
}

/**
 * @interface {danf:http.router}
 */
Router.prototype.set = function(name, route) {
    if (this._routes[name]) {
        this.unset(name);
    }

    this._routes[name] = route;

    // Use a method routes indexation to increase performances.
    var method = route.method.toUpperCase();

    if (undefined === this._methodRoutes[method]) {
        this._methodRoutes[method] = {};
    }
    this._methodRoutes[method][name] = route;
}

/**
 * @interface {danf:http.router}
 */
Router.prototype.get = function(name) {
    if (null == this._routes[name]) {
        throw new Error('No route of name "{0}" found.'.format(name));
    }

    return this._routes[name];
}

/**
 * @interface {danf:http.router}
 */
Router.prototype.unset = function(name) {
    delete this._routes[name];

    for (var method in this._methodRoutes) {
        delete this._methodRoutes[method][name];
    }
}

/**
 * @interface {danf:http.router}
 */
Router.prototype.find = function(url, method, throwException) {
    // Parse URL in case of a URL string.
    if ('string' === typeof url) {
        url = this.parse(url);
    }

    var method = method.toUpperCase(),
        path = url.path,
        host = url.host
    ;

    if (!/^\//.test(path)) {
        path = '/' + path;
    }

    // Take the first matching route.
    var routes = this._methodRoutes[method];

    for (var name in routes) {
        if (routes[name].match(path, method, host)) {
            return routes[name];
        }
    }

    if (throwException) {
        throw new Error('No route [{0}]"{1}" found for host "{2}".'.format(
            method,
            path,
            host ? host : 'localhost'
        ));
    }

    return null;
}

/**
 * @interface {danf:http.router}
 */
Router.prototype.follow = function(url, method, parameters, headers) {
    if ('string' === typeof parameters) {
        parameters = this.parseQuerystring(parameters);
    } else if (null == parameters) {
        parameters = {};
    }

    var parsedUrl = this.parse(url);

    for (var key in parsedUrl.parameters) {
        parameters[key] = parsedUrl.parameters[key];
    }

    this.find(parsedUrl, method, true).follow(
        parameters,
        headers,
        parsedUrl
    );
}

/**
 * @interface {danf:http.router}
 */
Router.prototype.parse = function(url) {
    if (!/^(http|\/)/.test(url)) {
        url = '/{0}'.format(url);
    }

    var match = url.match(/^(?:(https?\:)\/\/)?((?:([^:\/?#]*)?)(?:\:([0-9]+))?)?((\/[^?#]*)(\?[^#]*|))(#.*|)$/);

    if (null === match) {
        throw new Error('The url "{0}" is not well formatted.'.format(url));
    }

    var parsedUrl = {
            protocol: match[1],
            host: match[2],
            hostname: match[3],
            port: match[4],
            path: match[5] || '/',
            pathname: match[6] || '/',
            search: match[7] || '',
            hash: match[8] || '',
        },
        parameters = {}
    ;

    // Extract parameters.
    if (parsedUrl.search) {
        parameters = this.parseQuerystring(parsedUrl.search);
    }

    parsedUrl.parameters = parameters;

    return parsedUrl;
}

/**
 * @interface {danf:http.router}
 */
Router.prototype.parseQuerystring = function(querystring) {
    if (/^\?/.test(querystring)) {
        querystring = querystring.slice(1);
    }

    var parameters = {},
        query = querystring.split('&')
    ;

    for (var i = 0; i < query.length; i++) {
        var field = query[i].split('='),
            key = decodeURIComponent(field[0]),
            value = field[1] ? decodeURIComponent(field[1]) : ''
        ;

        if ('' === key) {
            continue;
        }

        if (undefined === parameters[key]) {
            parameters[key] = value;
        } else if (Array.isArray(parameters[key])) {
            parameters[key].push(value);
        } else {
            parameters[key] = [parameters[key], value];
        }
    }

    return parameters;
}
});

define('node_modules/danf/lib/common/http/abstract-cookies-registry',['require','exports','module'],function (require, exports, module) {'use strict';

/**
 * Expose `AbstractRegistry`.
 */
module.exports = AbstractRegistry;

/**
 * Initialize a new cookies registry.
 */
function AbstractRegistry() {
}

AbstractRegistry.defineImplementedInterfaces(['danf:http.cookiesRegistry']);

AbstractRegistry.defineAsAbstract();

/**
 * Format a cookie value.
 *
 * @param {string} value The value.
 * @param {date|null} expireAt The date of expiration.
 * @param {string|null} path The optional path.
 * @param {string|null} domain The optional domain.
 * @param {boolean|null} isSecure Whether or not this is a secure cookie.
 * @param {boolean|null} isHttpOnly Whether or not this is a http only cookie.
 * @return {string} The formatted value.
 * @api protected
 */
AbstractRegistry.prototype.formatCookieValue = function(value, expireAt, path, domain, isSecure, isHttpOnly) {
    return '{0}{1}{2}{3}{4}{5}'.format(
        encodeURIComponent(value),
        expireAt ? '; expires={0}'.format(expireAt.toUTCString()) : '',
        path ?  '; path={0}'.format(path) : '',
        domain ?  '; domain={0}'.format(domain) : '',
        isSecure ?  '; secure' : '',
        isHttpOnly ?  '; httpOnly' : ''
    );
}
});

define('node_modules/danf/config/common/http/classes',['require','exports','module','node_modules/danf/lib/common/http/route','node_modules/danf/lib/common/http/router','node_modules/danf/lib/common/http/abstract-cookies-registry'],function (require, exports, module) {'use strict';

module.exports = {
    route: require('node_modules/danf/lib/common/http/route'),
    router: require('node_modules/danf/lib/common/http/router'),
    abstractCookiesRegistry: require('node_modules/danf/lib/common/http/abstract-cookies-registry')
};
});

define('node_modules/danf/config/common/http/services',['require','exports','module'],function (require, exports, module) {'use strict';

module.exports = {
    router: {
        class: 'danf:http.router',
        properties: {
            routeProvider: '#danf:http.routeProvider#',
            eventsContainer: '#danf:event.eventsContainer#'
        },
        registry: {
            method: 'get',
            namespace: [0]
        }
    },
    routeProvider: {
        parent: 'danf:dependencyInjection.objectProvider',
        properties: {
            class: 'danf:http.route',
            interface: 'danf:http.route'
        }
    }
}
});

define('node_modules/danf/lib/client/http/cookies-registry',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/http/abstract-cookies-registry'],function (require, exports, module) {'use strict';

/**
 * Expose `CookiesRegistry`.
 */
module.exports = CookiesRegistry;

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    Abstract = require('node_modules/danf/lib/common/http/abstract-cookies-registry')
;

/**
 * Initialize a new cookies registry.
 */
function CookiesRegistry() {
}

utils.extend(Abstract, CookiesRegistry);

/**
 * @interface {danf:http.CookiesRegistry}
 */
CookiesRegistry.prototype.get = function(key) {
    var regexp = new RegExp("(?:(?:^|.*;)\\s*{0}\\s*\\=\\s*([^;]*).*$)|^.*$".format(key));

    return document.cookie.replace(regexp, '$1') || null;
}

/**
 * @interface {danf:http.CookiesRegistry}
 */
CookiesRegistry.prototype.set = function(key, value, expiresAt, path, domain, isSecure, isHttpOnly) {
    document.cookie = '{0}={1}'.format(
        encodeURIComponent(key),
        this.formatCookieValue(value, expiresAt, path, domain, isSecure, isHttpOnly)
    );
}

/**
 * @interface {danf:http.CookiesRegistry}
 */
CookiesRegistry.prototype.unset = function(key, path, domain) {
    document.cookie = '{0}={1}'.format(
        encodeURIComponent(key),
        this.formatCookieValue('', new Date(0), path, domain)
    );
}
});

define('node_modules/danf/lib/common/http/event/notifier/request',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/event/notifier/abstract'],function (require, exports, module) {'use strict';

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    Abstract = require('node_modules/danf/lib/common/event/notifier/abstract')
;

/**
 * Expose `Request`.
 */
module.exports = Request;

/**
 * Initialize a new request notifier.
 */
function Request() {
    Abstract.call(this);
}

utils.extend(Abstract, Request);

/**
 * @interface {danf:event.notifier}
 */
Object.defineProperty(Request.prototype, 'name', {
    value: 'request'
});

/**
 * @interface {danf:event.notifier}
 */
Object.defineProperty(Request.prototype, 'contract', {
    get: function () {
        var specificContract = this.getSpecificContract(),
            contract = {
                path: {
                    format: function(value) {
                        return formatPath(value);
                    },
                    type: 'string',
                    required: true
                },
                host: {
                    type: 'string',
                    default: 'localhost'
                },
                methods: {
                    format: function(value) {
                        if ('string' === typeof value) {
                            value = [value];
                        }

                        if (Array.isArray(value)) {
                            for (var i = 0; i < value.length; i++) {
                                value[i] = value[i].toUpperCase();
                            }

                            return value;
                        }
                    },
                    type: 'string_array',
                    required: true,
                    validate: function(value) {
                        if (value.length === 0) {
                            throw new Error('an array with at least one HTTP method');
                        }

                        for (var i = 0; i < value.length; i++) {
                            if (!isHttpMethod(value[i])) {
                                throw new Error('an array with valid HTTP methods');
                            }
                        }
                    }
                },
                headers: {
                    type: 'string_object',
                    default: {}
                },
                parameters: {
                    type: 'object'
                },
                data: {
                    type: 'mixed',
                    validate: function(value) {
                        if (value != null) {
                            throw new Error(
                               'The field "data" must not be defined for a request event; use field "parameters" instead.'
                            );
                        }
                    }
                }
            }
        ;

        return utils.merge(contract, specificContract);
    }
});

/**
 * @interface {danf:event.notifier}
 */
Request.prototype.mergeContractField = function(field, parentValue, childValue) {
    switch (field) {
        case 'path':
            return (parentValue || '') + (childValue || '');
    }

    return Request.Parent.prototype.mergeContractField.call(this, field, parentValue, childValue);
}

/**
 * Get the specific contract that a request event kind should respect.
 *
 * @param {danf:event.event} event The event.
 * @return {object} The contract.
 * @api protected
 */
Request.prototype.getSpecificContract = function() {
    return {};
};

/**
 * @inheritdoc
 */
Request.prototype.getEventDataContract = function(event) {
    var specificContract = this.getEventDataSpecificContract(),
        contract = {
            path: {
                format: function(value) {
                    return formatPath(value);
                },
                type: 'string',
                required: true
            },
            method: {
                format: function(value) {
                    if ('string' === typeof value) {
                        return value.toUpperCase();
                    }
                },
                type: 'string',
                required: true,
                validate: function(value) {
                    if (!isHttpMethod(value)) {
                        throw new Error('a valid HTTP method');
                    }

                    var isDefinedMethod = false;

                    for (var i = 0; i < event.parameters.methods.length; i++) {
                        if (event.parameters.methods[i] === value) {
                            isDefinedMethod = true;
                            break;
                        }
                    }

                    if (!isDefinedMethod) {
                        throw new Error('one of ["{0}"]'.format(
                            event.parameters.methods.join('", "')
                        ));
                    }
                }
            },
            hostname: {
                type: 'string',
            },
            port: {
                type: 'number',
            },
            protocol: {
                format: function(value) {
                    if ('string' === typeof value && !/:$/.test(value)) {
                        return value + ':';
                    }
                },
                type: 'string',
                default: 'http'
            },
            parameters: {
                type: 'object|string',
                default: ''
            },
            headers: {
                type: 'object',
                default: {}
            }
        }
    ;

    return utils.merge(contract, specificContract);
};

/**
 * Get the specific contract that data should respect for an event kind.
 *
 * @param {danf:event.event} event The event.
 * @return {object} The contract.
 * @api protected
 */
Request.prototype.getEventDataSpecificContract = function(event) {
    return {};
}

/**
 * Whether or not it is a valid HTTP method.
 *
 * @return {boolean} True if this is a valid HTTP method, false otherwise.
 * @api private
 */
var isHttpMethod = function(method) {
    return method in {
        GET: true,
        HEAD: true,
        POST: true,
        OPTIONS: true,
        CONNECT: true,
        TRACE: true,
        PUT: true,
        PATCH: true,
        DELETE: true
    };
}

/**
 * Format a path.
 *
 * @param {string} path The path.
 * @return {string} The formatted path.
 * @api private
 */
var formatPath = function(path) {
    if ('string' === typeof value) {
        path = '/' !== value[0] ? '/' + value : value;
    }

    return path;
}

});

define('node_modules/danf/lib/client/http/event/notifier/request',['require','exports','module','node_modules/danf/lib/common/utils','node_modules/danf/lib/common/http/event/notifier/request'],function (require, exports, module) {'use strict';

/**
 * Module dependencies.
 */
var utils = require('node_modules/danf/lib/common/utils'),
    Abstract = require('node_modules/danf/lib/common/http/event/notifier/request')
;

/**
 * Expose `Request`.
 */
module.exports = Request;

/**
 * Initialize a new request notifier.
 */
function Request() {
    Abstract.call(this);
}

utils.extend(Abstract, Request);

Request.defineDependency('_jquery', 'function');
Request.defineDependency('_logger', 'danf:logging.logger');

/**
 * JQuery.
 *
 * @var {function}
 * @api public
 */
Object.defineProperty(Request.prototype, 'jquery', {
    set: function(jquery) { this._jquery = jquery; }
});

/**
 * Logger.
 *
 * @var {danf:logging.logger}
 * @api public
 */
Object.defineProperty(Request.prototype, 'logger', {
    set: function(logger) { this._logger = logger; }
});

/**
 * @inheritdoc
 */
Request.prototype.getSpecificContract = function() {
    return {
        settings: {
            format: function(value) {
                if ('object' === typeof value && null != value) {
                    if (null == value.headers) {
                        value.headers = {};
                    }
                }
            },
            type: 'object',
            default: {},
            validate: function(value) {
                if (value.method) {
                    throw new Error(
                        'an object with no property "method" (the HTTP method is given at the event triggering)'
                    );
                }

                if (value.url) {
                    throw new Error(
                        'an object with no property "url" (the url/path is given at the event triggering)'
                    );
                }

                if (value.data) {
                    throw new Error(
                        'an object with no property "data" (the request parameters are given at the event triggering)'
                    );
                }
            }
        },
        process: {
            type: 'string',
            validate: function(value) {
                if (!(value in {done: true, fail: true, always: true})) {
                    throw new Error('one of ["done", "fail", "always"]');
                }
            },
            default: 'done'
        }
    };
}

/**
 * @inheritdoc
 */
Request.prototype.notifyEvent = function(name, parameters, sequence, data) {
    var self = this,
        $ = this._jquery,
        settings = parameters.settings
    ;

    // Set request data.
    settings.data = data.parameters;

    // Set HTTP method.
    settings.method = data.method;

    // Merge additional headers.
    settings.headers = utils.merge(
        settings.headers,
        parameters.headers
    );

    // Format url.
    var url = data.path;

    if ('localhost' !== data.hostname || data.port) {
        url = '{0}//{1}{2}{3}'.format(
            data.protocol,
            data.hostname,
            data.port ? ':{0}'.format(data.port) : '',
            url
        );

        // Interpret defined hostname as cross domain request.
        if (null == settings.crossDomain) {
            settings.crossDomain = true;
        }
    }

    // Set url.
    if ('GET' === settings.method) {
        var urlParts = url.split('?'),
            path = urlParts[0],
            search = urlParts[1] || '',
            querystring = '',
            query = search.split('&')
        ;

        if (search) {
            // Remove duplicated parameters.
            for (var i = 0; i < query.length; i++) {
                var queryParameter = query[i].split('=');

                if (undefined === settings.data[queryParameter[0]]) {
                    querystring += queryParameter[0];

                    if (queryParameter[1]) {
                        querystring += '={0}'.format(queryParameter[1]);
                    }
                }
            }
        }

        for (var key in settings.data) {
            querystring += key;

            if (null != settings.data[key]) {
                querystring += '={0}'.format(settings.data[key]);
            }
        }

        settings.data = {};

        settings.url = '{0}{1}'.format(
            path,
            '' !== querystring ? '?{0}'.format(querystring) : ''
        );
    } else {
        settings.url = url;
    }

    // Build request.
    var request = utils.merge(
            data,
            {settings: settings}
        )
    ;

    // Process request.
    this.__asyncProcess(function(returnAsync) {
        $.ajax(settings)
            .done(function(data, textStatus, jqXHR) {
                self._logger.log(
                    'Request [{0}]"{1}" succeeded: {2}'.format(
                        settings.method,
                        settings.url,
                        textStatus ? textStatus : 'ok.'
                    ),
                    1,
                    0
                );

                executeSequence(sequence, parameters, 'done', data, jqXHR, request, returnAsync);
            })
            .fail(function(jqXHR, textStatus, errorThrown) {
                self._logger.log(
                    '<<error>>Request [{0}]"{1}" failed: ({2}) {3}'.format(
                        settings.method,
                        settings.url,
                        errorThrown ? errorThrown : 500,
                        textStatus ? textStatus : 'error.'
                    ),
                    1,
                    0
                );

                executeSequence(sequence, parameters, 'fail', {}, jqXHR, request, returnAsync);
            })
            .always(function(data, textStatus, jqXHR) {
                executeSequence(sequence, parameters, 'always', data, jqXHR, request, returnAsync);
            })
        ;
    });
}

/**
 * Execute a sequence.
 *
 * @param {danf:event.sequence} sequence The sequence.
 * @param {object} parameters The request parameters.
 * @param {string} state The processed state.
 * @param {object} data The data.
 * @param {object} jqXHR The XHR request object.
 * @param {object} request The request.
 * @param {function} returnAsync The async return function.
 * @api private
 */
var executeSequence = function(sequence, parameters, state, data, jqXHR, request, returnAsync) {
    if (state === parameters.process) {
        if ('always' === state) {
            state = 'done';

            // Handle fail case.
            if ('object' !== typeof jqXHR) {
                jqXHR = data;
                data = {};
                state = 'fail';
            }
        }

        var status = jqXHR.status,
            text = data
        ;

        if ('object' !== typeof data) {
            data = {};
        } else {
            text = JSON.stringify(data);
        }

        text = text.toString();

        sequence.execute(
            data,
            {
                request: request,
                response: {
                    state: state,
                    status: status,
                    text: text
                }
            },
            '.',
            function(stream) {
                returnAsync({
                    url: request.settings.url,
                    status: status,
                    content: stream,
                    text: text
                });
            }
        );
    }
}
});

define('node_modules/danf/config/client/http/classes',['require','exports','module','node_modules/danf/lib/client/http/cookies-registry','node_modules/danf/lib/client/http/event/notifier/request'],function (require, exports, module) {'use strict';

module.exports = {
    cookiesRegistry: require('node_modules/danf/lib/client/http/cookies-registry'),
    event: {
        notifier: {
            request: require('node_modules/danf/lib/client/http/event/notifier/request')
        }
    }
};
});

define('node_modules/danf/config/client/http/services',['require','exports','module'],function (require, exports, module) {'use strict';

module.exports = {
    cookiesRegistry: {
        class: 'danf:http.cookiesRegistry'
    },
    event: {
        children: {
            notifier: {
                parent: 'danf:event.notifier',
                children: {
                    request: {
                        class: 'danf:http.event.notifier.request',
                        properties: {
                            jquery: '#danf:vendor.jquery#',
                            logger: '#danf:logging.logger#'
                        }
                    }
                }
            }
        }
    }
};
});

/*!
 * async
 * https://github.com/caolan/async
 *
 * Copyright 2010-2014 Caolan McMahon
 * Released under the MIT license
 */
(function () {

    var async = {};
    var noop = function () {};

    // global on the server, window in the browser
    var root, previous_async;

    if (typeof window == 'object' && this === window) {
        root = window;
    }
    else if (typeof global == 'object' && this === global) {
        root = global;
    }
    else {
        root = this;
    }

    if (root != null) {
      previous_async = root.async;
    }

    async.noConflict = function () {
        root.async = previous_async;
        return async;
    };

    function only_once(fn) {
        var called = false;
        return function() {
            if (called) throw new Error("Callback was already called.");
            called = true;
            fn.apply(root, arguments);
        };
    }

    //// cross-browser compatiblity functions ////

    var _toString = Object.prototype.toString;

    var _isArray = Array.isArray || function (obj) {
        return _toString.call(obj) === '[object Array]';
    };

    var _each = function (arr, iterator) {
      var index = -1,
          length = arr.length;

      while (++index < length) {
        iterator(arr[index], index, arr);
      }
    };

    var _map = function (arr, iterator) {
      var index = -1,
          length = arr.length,
          result = Array(length);

      while (++index < length) {
        result[index] = iterator(arr[index], index, arr);
      }
      return result;
    };

    var _reduce = function (arr, iterator, memo) {
        _each(arr, function (x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    };

    var _forEachOf = function (object, iterator) {
        _each(_keys(object), function (key) {
            iterator(object[key], key);
        });
    };

    var _keys = Object.keys || function (obj) {
        var keys = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                keys.push(k);
            }
        }
        return keys;
    };

    var _baseSlice = function (arr, start) {
        start = start || 0;
        var index = -1;
        var length = arr.length;

        if (start) {
          length -= start;
          length = length < 0 ? 0 : length;
        }
        var result = Array(length);

        while (++index < length) {
          result[index] = arr[index + start];
        }
        return result;
    };

    //// exported async module functions ////

    //// nextTick implementation with browser-compatible fallback ////

    // capture the global reference to guard against fakeTimer mocks
    var _setImmediate;
    if (typeof setImmediate === 'function') {
        _setImmediate = setImmediate;
    }

    if (typeof process === 'undefined' || !(process.nextTick)) {
        if (_setImmediate) {
            async.nextTick = function (fn) {
                // not a direct alias for IE10 compatibility
                _setImmediate(fn);
            };
            async.setImmediate = async.nextTick;
        }
        else {
            async.nextTick = function (fn) {
                setTimeout(fn, 0);
            };
            async.setImmediate = async.nextTick;
        }
    }
    else {
        async.nextTick = process.nextTick;
        if (_setImmediate) {
            async.setImmediate = function (fn) {
              // not a direct alias for IE10 compatibility
              _setImmediate(fn);
            };
        }
        else {
            async.setImmediate = async.nextTick;
        }
    }

    async.each = function (arr, iterator, callback) {
        callback = callback || noop;
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        _each(arr, function (x) {
            iterator(x, only_once(done) );
        });
        function done(err) {
          if (err) {
              callback(err);
              callback = noop;
          }
          else {
              completed += 1;
              if (completed >= arr.length) {
                  callback();
              }
          }
        }
    };
    async.forEach = async.each;

    async.eachSeries = function (arr, iterator, callback) {
        callback = callback || noop;
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        var iterate = function () {
            iterator(arr[completed], function (err) {
                if (err) {
                    callback(err);
                    callback = noop;
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback();
                    }
                    else {
                        iterate();
                    }
                }
            });
        };
        iterate();
    };
    async.forEachSeries = async.eachSeries;


    async.eachLimit = function (arr, limit, iterator, callback) {
        var fn = _eachLimit(limit);
        fn.apply(null, [arr, iterator, callback]);
    };
    async.forEachLimit = async.eachLimit;

    var _eachLimit = function (limit) {

        return function (arr, iterator, callback) {
            callback = callback || noop;
            if (!arr.length || limit <= 0) {
                return callback();
            }
            var completed = 0;
            var started = 0;
            var running = 0;

            (function replenish () {
                if (completed >= arr.length) {
                    return callback();
                }

                while (running < limit && started < arr.length) {
                    started += 1;
                    running += 1;
                    iterator(arr[started - 1], function (err) {
                        if (err) {
                            callback(err);
                            callback = noop;
                        }
                        else {
                            completed += 1;
                            running -= 1;
                            if (completed >= arr.length) {
                                callback();
                            }
                            else {
                                replenish();
                            }
                        }
                    });
                }
            })();
        };
    };



    async.forEachOf = async.eachOf = function (object, iterator, callback) {
        callback = callback || function () {};
        var size = object.length || _keys(object).length;
        var completed = 0;
        if (!size) {
            return callback();
        }
        _forEachOf(object, function (value, key) {
            iterator(object[key], key, function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                } else {
                    completed += 1;
                    if (completed === size) {
                        callback(null);
                    }
                }
            });
        });
    };

    async.forEachOfSeries = async.eachOfSeries = function (obj, iterator, callback) {
        callback = callback || function () {};
        var keys = _keys(obj);
        var size = keys.length;
        if (!size) {
            return callback();
        }
        var completed = 0;
        var iterate = function () {
            var sync = true;
            var key = keys[completed];
            iterator(obj[key], key, function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= size) {
                        callback(null);
                    }
                    else {
                        if (sync) {
                            async.nextTick(iterate);
                        }
                        else {
                            iterate();
                        }
                    }
                }
            });
            sync = false;
        };
        iterate();
    };



    async.forEachOfLimit = async.eachOfLimit = function (obj, limit, iterator, callback) {
        _forEachOfLimit(limit)(obj, iterator, callback);
    };

    var _forEachOfLimit = function (limit) {

        return function (obj, iterator, callback) {
            callback = callback || function () {};
            var keys = _keys(obj);
            var size = keys.length;
            if (!size || limit <= 0) {
                return callback();
            }
            var completed = 0;
            var started = 0;
            var running = 0;

            (function replenish () {
                if (completed >= size) {
                    return callback();
                }

                while (running < limit && started < size) {
                    started += 1;
                    running += 1;
                    var key = keys[started - 1];
                    iterator(obj[key], key, function (err) {
                        if (err) {
                            callback(err);
                            callback = function () {};
                        }
                        else {
                            completed += 1;
                            running -= 1;
                            if (completed >= size) {
                                callback();
                            }
                            else {
                                replenish();
                            }
                        }
                    });
                }
            })();
        };
    };


    var doParallel = function (fn) {
        return function () {
            var args = _baseSlice(arguments);
            return fn.apply(null, [async.each].concat(args));
        };
    };
    var doParallelLimit = function(limit, fn) {
        return function () {
            var args = _baseSlice(arguments);
            return fn.apply(null, [_eachLimit(limit)].concat(args));
        };
    };
    var doSeries = function (fn) {
        return function () {
            var args = _baseSlice(arguments);
            return fn.apply(null, [async.eachSeries].concat(args));
        };
    };


    var _asyncMap = function (eachfn, arr, iterator, callback) {
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        if (!callback) {
            eachfn(arr, function (x, callback) {
                iterator(x.value, function (err) {
                    callback(err);
                });
            });
        } else {
            var results = [];
            eachfn(arr, function (x, callback) {
                iterator(x.value, function (err, v) {
                    results[x.index] = v;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };
    async.map = doParallel(_asyncMap);
    async.mapSeries = doSeries(_asyncMap);
    async.mapLimit = function (arr, limit, iterator, callback) {
        return _mapLimit(limit)(arr, iterator, callback);
    };

    var _mapLimit = function(limit) {
        return doParallelLimit(limit, _asyncMap);
    };

    // reduce only has a series version, as doing reduce in parallel won't
    // work in many situations.
    async.reduce = function (arr, memo, iterator, callback) {
        async.eachSeries(arr, function (x, callback) {
            iterator(memo, x, function (err, v) {
                memo = v;
                callback(err);
            });
        }, function (err) {
            callback(err, memo);
        });
    };
    // inject alias
    async.inject = async.reduce;
    // foldl alias
    async.foldl = async.reduce;

    async.reduceRight = function (arr, memo, iterator, callback) {
        var reversed = _map(arr, function (x) {
            return x;
        }).reverse();
        async.reduce(reversed, memo, iterator, callback);
    };
    // foldr alias
    async.foldr = async.reduceRight;

    var _filter = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.filter = doParallel(_filter);
    async.filterSeries = doSeries(_filter);
    // select alias
    async.select = async.filter;
    async.selectSeries = async.filterSeries;

    var _reject = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (!v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.reject = doParallel(_reject);
    async.rejectSeries = doSeries(_reject);

    var _detect = function (eachfn, arr, iterator, main_callback) {
        eachfn(arr, function (x, callback) {
            iterator(x, function (result) {
                if (result) {
                    main_callback(x);
                    main_callback = noop;
                }
                else {
                    callback();
                }
            });
        }, function (err) {
            main_callback();
        });
    };
    async.detect = doParallel(_detect);
    async.detectSeries = doSeries(_detect);

    async.some = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (v) {
                    main_callback(true);
                    main_callback = noop;
                }
                callback();
            });
        }, function (err) {
            main_callback(false);
        });
    };
    // any alias
    async.any = async.some;

    async.every = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (!v) {
                    main_callback(false);
                    main_callback = noop;
                }
                callback();
            });
        }, function (err) {
            main_callback(true);
        });
    };
    // all alias
    async.all = async.every;

    async.sortBy = function (arr, iterator, callback) {
        async.map(arr, function (x, callback) {
            iterator(x, function (err, criteria) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, {value: x, criteria: criteria});
                }
            });
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            else {
                var fn = function (left, right) {
                    var a = left.criteria, b = right.criteria;
                    return a < b ? -1 : a > b ? 1 : 0;
                };
                callback(null, _map(results.sort(fn), function (x) {
                    return x.value;
                }));
            }
        });
    };

    async.auto = function (tasks, callback) {
        callback = callback || noop;
        var keys = _keys(tasks);
        var remainingTasks = keys.length;
        if (!remainingTasks) {
            return callback();
        }

        var results = {};

        var listeners = [];
        var addListener = function (fn) {
            listeners.unshift(fn);
        };
        var removeListener = function (fn) {
            for (var i = 0; i < listeners.length; i += 1) {
                if (listeners[i] === fn) {
                    listeners.splice(i, 1);
                    return;
                }
            }
        };
        var taskComplete = function () {
            remainingTasks--;
            _each(listeners.slice(0), function (fn) {
                fn();
            });
        };

        addListener(function () {
            if (!remainingTasks) {
                var theCallback = callback;
                // prevent final callback from calling itself if it errors
                callback = noop;

                theCallback(null, results);
            }
        });

        _each(keys, function (k) {
            var task = _isArray(tasks[k]) ? tasks[k]: [tasks[k]];
            var taskCallback = function (err) {
                var args = _baseSlice(arguments, 1);
                if (args.length <= 1) {
                    args = args[0];
                }
                if (err) {
                    var safeResults = {};
                    _each(_keys(results), function(rkey) {
                        safeResults[rkey] = results[rkey];
                    });
                    safeResults[k] = args;
                    callback(err, safeResults);
                    // stop subsequent errors hitting callback multiple times
                    callback = noop;
                }
                else {
                    results[k] = args;
                    async.setImmediate(taskComplete);
                }
            };
            var requires = task.slice(0, Math.abs(task.length - 1)) || [];
            // prevent dead-locks
            var len = requires.length;
            var dep;
            while (len--) {
                if (!(dep = tasks[requires[len]])) {
                    throw new Error('Has inexistant dependency');
                }
                if (_isArray(dep) && !!~dep.indexOf(k)) {
                    throw new Error('Has cyclic dependencies');
                }
            }
            var ready = function () {
                return _reduce(requires, function (a, x) {
                    return (a && results.hasOwnProperty(x));
                }, true) && !results.hasOwnProperty(k);
            };
            if (ready()) {
                task[task.length - 1](taskCallback, results);
            }
            else {
                var listener = function () {
                    if (ready()) {
                        removeListener(listener);
                        task[task.length - 1](taskCallback, results);
                    }
                };
                addListener(listener);
            }
        });
    };

    async.retry = function(times, task, callback) {
        var DEFAULT_TIMES = 5;
        var attempts = [];
        // Use defaults if times not passed
        if (typeof times === 'function') {
            callback = task;
            task = times;
            times = DEFAULT_TIMES;
        }
        // Make sure times is a number
        times = parseInt(times, 10) || DEFAULT_TIMES;
        var wrappedTask = function(wrappedCallback, wrappedResults) {
            var retryAttempt = function(task, finalAttempt) {
                return function(seriesCallback) {
                    task(function(err, result){
                        seriesCallback(!err || finalAttempt, {err: err, result: result});
                    }, wrappedResults);
                };
            };
            while (times) {
                attempts.push(retryAttempt(task, !(times-=1)));
            }
            async.series(attempts, function(done, data){
                data = data[data.length - 1];
                (wrappedCallback || callback)(data.err, data.result);
            });
        };
        // If a callback is passed, run this as a controll flow
        return callback ? wrappedTask() : wrappedTask;
    };

    async.waterfall = function (tasks, callback) {
        callback = callback || noop;
        if (!_isArray(tasks)) {
          var err = new Error('First argument to waterfall must be an array of functions');
          return callback(err);
        }
        if (!tasks.length) {
            return callback();
        }
        var wrapIterator = function (iterator) {
            return function (err) {
                if (err) {
                    callback.apply(null, arguments);
                    callback = noop;
                }
                else {
                    var args = _baseSlice(arguments, 1);
                    var next = iterator.next();
                    if (next) {
                        args.push(wrapIterator(next));
                    }
                    else {
                        args.push(callback);
                    }
                    async.setImmediate(function () {
                        iterator.apply(null, args);
                    });
                }
            };
        };
        wrapIterator(async.iterator(tasks))();
    };

    var _parallel = function(eachfn, tasks, callback) {
        callback = callback || noop;
        if (_isArray(tasks)) {
            eachfn.map(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = _baseSlice(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            eachfn.each(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = _baseSlice(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.parallel = function (tasks, callback) {
        _parallel({ map: async.map, each: async.each }, tasks, callback);
    };

    async.parallelLimit = function(tasks, limit, callback) {
        _parallel({ map: _mapLimit(limit), each: _eachLimit(limit) }, tasks, callback);
    };

    async.series = function (tasks, callback) {
        callback = callback || noop;
        if (_isArray(tasks)) {
            async.mapSeries(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = _baseSlice(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            async.eachSeries(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = _baseSlice(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.iterator = function (tasks) {
        var makeCallback = function (index) {
            var fn = function () {
                if (tasks.length) {
                    tasks[index].apply(null, arguments);
                }
                return fn.next();
            };
            fn.next = function () {
                return (index < tasks.length - 1) ? makeCallback(index + 1): null;
            };
            return fn;
        };
        return makeCallback(0);
    };

    async.apply = function (fn) {
        var args = _baseSlice(arguments, 1);
        return function () {
            return fn.apply(
                null, args.concat(_baseSlice(arguments))
            );
        };
    };

    var _concat = function (eachfn, arr, fn, callback) {
        var r = [];
        eachfn(arr, function (x, cb) {
            fn(x, function (err, y) {
                r = r.concat(y || []);
                cb(err);
            });
        }, function (err) {
            callback(err, r);
        });
    };
    async.concat = doParallel(_concat);
    async.concatSeries = doSeries(_concat);

    async.whilst = function (test, iterator, callback) {
        if (test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.whilst(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doWhilst = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            var args = _baseSlice(arguments, 1);
            if (test.apply(null, args)) {
                async.doWhilst(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.until = function (test, iterator, callback) {
        if (!test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.until(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doUntil = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            var args = _baseSlice(arguments, 1);
            if (!test.apply(null, args)) {
                async.doUntil(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.queue = function (worker, concurrency) {
        if (concurrency === undefined) {
            concurrency = 1;
        }
        else if(concurrency === 0) {
            throw new Error('Concurrency must not be zero');
        }
        function _insert(q, data, pos, callback) {
          if (!q.started){
            q.started = true;
          }
          if (!_isArray(data)) {
              data = [data];
          }
          if(data.length === 0) {
             // call drain immediately if there are no tasks
             return async.setImmediate(function() {
                 if (q.drain) {
                     q.drain();
                 }
             });
          }
          _each(data, function(task) {
              var item = {
                  data: task,
                  callback: typeof callback === 'function' ? callback : null
              };

              if (pos) {
                q.tasks.unshift(item);
              } else {
                q.tasks.push(item);
              }

              if (q.saturated && q.tasks.length === q.concurrency) {
                  q.saturated();
              }
              async.setImmediate(q.process);
          });
        }

        var workers = 0;
        var q = {
            tasks: [],
            concurrency: concurrency,
            saturated: null,
            empty: null,
            drain: null,
            started: false,
            paused: false,
            push: function (data, callback) {
              _insert(q, data, false, callback);
            },
            kill: function () {
              q.drain = null;
              q.tasks = [];
            },
            unshift: function (data, callback) {
              _insert(q, data, true, callback);
            },
            process: function () {
                if (!q.paused && workers < q.concurrency && q.tasks.length) {
                    var task = q.tasks.shift();
                    if (q.empty && q.tasks.length === 0) {
                        q.empty();
                    }
                    workers += 1;
                    var next = function () {
                        workers -= 1;
                        if (task.callback) {
                            task.callback.apply(task, arguments);
                        }
                        if (q.drain && q.tasks.length + workers === 0) {
                            q.drain();
                        }
                        q.process();
                    };
                    var cb = only_once(next);
                    worker(task.data, cb);
                }
            },
            length: function () {
                return q.tasks.length;
            },
            running: function () {
                return workers;
            },
            idle: function() {
                return q.tasks.length + workers === 0;
            },
            pause: function () {
                if (q.paused === true) { return; }
                q.paused = true;
            },
            resume: function () {
                if (q.paused === false) { return; }
                q.paused = false;
                var resumeCount = Math.min(q.concurrency, q.tasks.length);
                // Need to call q.process once per concurrent
                // worker to preserve full concurrency after pause
                for (var w = 1; w <= resumeCount; w++) {
                    async.setImmediate(q.process);
                }
            }
        };
        return q;
    };

    async.priorityQueue = function (worker, concurrency) {

        function _compareTasks(a, b){
          return a.priority - b.priority;
        }

        function _binarySearch(sequence, item, compare) {
          var beg = -1,
              end = sequence.length - 1;
          while (beg < end) {
            var mid = beg + ((end - beg + 1) >>> 1);
            if (compare(item, sequence[mid]) >= 0) {
              beg = mid;
            } else {
              end = mid - 1;
            }
          }
          return beg;
        }

        function _insert(q, data, priority, callback) {
          if (!q.started){
            q.started = true;
          }
          if (!_isArray(data)) {
              data = [data];
          }
          if(data.length === 0) {
             // call drain immediately if there are no tasks
             return async.setImmediate(function() {
                 if (q.drain) {
                     q.drain();
                 }
             });
          }
          _each(data, function(task) {
              var item = {
                  data: task,
                  priority: priority,
                  callback: typeof callback === 'function' ? callback : null
              };

              q.tasks.splice(_binarySearch(q.tasks, item, _compareTasks) + 1, 0, item);

              if (q.saturated && q.tasks.length === q.concurrency) {
                  q.saturated();
              }
              async.setImmediate(q.process);
          });
        }

        // Start with a normal queue
        var q = async.queue(worker, concurrency);

        // Override push to accept second parameter representing priority
        q.push = function (data, priority, callback) {
          _insert(q, data, priority, callback);
        };

        // Remove unshift function
        delete q.unshift;

        return q;
    };

    async.cargo = function (worker, payload) {
        var working     = false,
            tasks       = [];

        var cargo = {
            tasks: tasks,
            payload: payload,
            saturated: null,
            empty: null,
            drain: null,
            drained: true,
            push: function (data, callback) {
                if (!_isArray(data)) {
                    data = [data];
                }
                _each(data, function(task) {
                    tasks.push({
                        data: task,
                        callback: typeof callback === 'function' ? callback : null
                    });
                    cargo.drained = false;
                    if (cargo.saturated && tasks.length === payload) {
                        cargo.saturated();
                    }
                });
                async.setImmediate(cargo.process);
            },
            process: function process() {
                if (working) return;
                if (tasks.length === 0) {
                    if(cargo.drain && !cargo.drained) cargo.drain();
                    cargo.drained = true;
                    return;
                }

                var ts = typeof payload === 'number' ?
                    tasks.splice(0, payload) :
                    tasks.splice(0, tasks.length);

                var ds = _map(ts, function (task) {
                    return task.data;
                });

                if(cargo.empty) cargo.empty();
                working = true;
                worker(ds, function () {
                    working = false;

                    var args = arguments;
                    _each(ts, function (data) {
                        if (data.callback) {
                            data.callback.apply(null, args);
                        }
                    });

                    process();
                });
            },
            length: function () {
                return tasks.length;
            },
            running: function () {
                return working;
            }
        };
        return cargo;
    };

    var _console_fn = function (name) {
        return function (fn) {
            var args = _baseSlice(arguments, 1);
            fn.apply(null, args.concat([function (err) {
                var args = _baseSlice(arguments, 1);
                if (typeof console !== 'undefined') {
                    if (err) {
                        if (console.error) {
                            console.error(err);
                        }
                    }
                    else if (console[name]) {
                        _each(args, function (x) {
                            console[name](x);
                        });
                    }
                }
            }]));
        };
    };
    async.log = _console_fn('log');
    async.dir = _console_fn('dir');
    /*async.info = _console_fn('info');
    async.warn = _console_fn('warn');
    async.error = _console_fn('error');*/

    async.memoize = function (fn, hasher) {
        var memo = {};
        var queues = {};
        hasher = hasher || function (x) {
            return x;
        };
        var memoized = function () {
            var args = _baseSlice(arguments);
            var callback = args.pop();
            var key = hasher.apply(null, args);
            if (key in memo) {
                async.nextTick(function () {
                    callback.apply(null, memo[key]);
                });
            }
            else if (key in queues) {
                queues[key].push(callback);
            }
            else {
                queues[key] = [callback];
                fn.apply(null, args.concat([function () {
                    memo[key] = _baseSlice(arguments);
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                      q[i].apply(null, arguments);
                    }
                }]));
            }
        };
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    };

    async.unmemoize = function (fn) {
      return function () {
        return (fn.unmemoized || fn).apply(null, arguments);
      };
    };

    async.times = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.map(counter, iterator, callback);
    };

    async.timesSeries = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.mapSeries(counter, iterator, callback);
    };

    async.seq = function (/* functions... */) {
        var fns = arguments;
        return function () {
            var that = this;
            var args = _baseSlice(arguments);
            var callback = args.pop();
            async.reduce(fns, args, function (newargs, fn, cb) {
                fn.apply(that, newargs.concat([function () {
                    var err = arguments[0];
                    var nextargs = _baseSlice(arguments, 1);
                    cb(err, nextargs);
                }]));
            },
            function (err, results) {
                callback.apply(that, [err].concat(results));
            });
        };
    };

    async.compose = function (/* functions... */) {
      return async.seq.apply(null, Array.prototype.reverse.call(arguments));
    };

    var _applyEach = function (eachfn, fns /*args...*/) {
        var go = function () {
            var that = this;
            var args = _baseSlice(arguments);
            var callback = args.pop();
            return eachfn(fns, function (fn, cb) {
                fn.apply(that, args.concat([cb]));
            },
            callback);
        };
        if (arguments.length > 2) {
            var args = _baseSlice(arguments, 2);
            return go.apply(this, args);
        }
        else {
            return go;
        }
    };
    async.applyEach = doParallel(_applyEach);
    async.applyEachSeries = doSeries(_applyEach);

    async.forever = function (fn, callback) {
        function next(err) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                throw err;
            }
            fn(next);
        }
        next();
    };

    // Node.js
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = async;
    }
    // AMD / RequireJS
    else if (typeof define !== 'undefined' && define.amd) {
        define('async',[], function () {
            return async;
        });
    }
    // included directly via <script> tag
    else {
        root.async = async;
    }

}());

define('node_modules/danf/lib/common/vendor/async',['require','exports','module','async'],function (require, exports, module) {'use strict';

var async = require('async');

module.exports = function() {
    return async.noConflict();
};
});

define('node_modules/danf/config/common/vendor/classes',['require','exports','module','node_modules/danf/lib/common/vendor/async'],function (require, exports, module) {'use strict';

module.exports = {
    async: require('node_modules/danf/lib/common/vendor/async')
};
});

define('node_modules/danf/config/common/vendor/services',['require','exports','module'],function (require, exports, module) {'use strict';

module.exports = {
    async: {
        class: 'danf:vendor.async'
    }
};
});

define('node_modules/danf/lib/client/vendor/jquery',['require','exports','module','jquery'],function (require, exports, module) {'use strict';

var jq = require('jquery');

module.exports = function() {
    var $ = jq.noConflict(true);

    // Add method to apply another method on a set of elements.
    $.do = function(elements, method, args) {
        var args = Array.prototype.slice.call(arguments, 3);

        elements[method].apply(elements, args);
    }

    return $;
};
});

define('node_modules/danf/config/client/vendor/classes',['require','exports','module','node_modules/danf/lib/client/vendor/jquery'],function (require, exports, module) {'use strict';

module.exports = {
    jquery: require('node_modules/danf/lib/client/vendor/jquery')
};
});

define('node_modules/danf/config/client/vendor/services',['require','exports','module'],function (require, exports, module) {'use strict';

module.exports = {
    jquery: {
        class: 'danf:vendor.jquery'
    }
};
});

/*!
 * Danf
 * https://github.com/gnodi/danf
 *
 * Copyright 2014, 2015 Thomas Prelot and other contributors
 * Released under the MIT license
 */

require(
    [
        'node_modules/danf/lib/common/framework/framework',
        'node_modules/danf/lib/common/framework/initializer',
        'node_modules/danf/config/client/ajax-app/classes',
        'node_modules/danf/config/client/ajax-app/interfaces',
        'node_modules/danf/config/client/ajax-app/services',
        'node_modules/danf/config/client/ajax-app/events',
        'node_modules/danf/config/client/ajax-app/sequences',
        'node_modules/danf/config/common/configuration/interfaces',
        'node_modules/danf/config/common/configuration/services',
        'node_modules/danf/config/common/configuration/classes',
        'node_modules/danf/config/common/dependency-injection/interfaces',
        'node_modules/danf/config/common/dependency-injection/services',
        'node_modules/danf/config/common/dependency-injection/classes',
        'node_modules/danf/config/common/event/interfaces',
        'node_modules/danf/config/common/event/services',
        'node_modules/danf/config/common/event/classes',
        'node_modules/danf/config/client/event/classes',
        'node_modules/danf/config/client/event/services',
        'node_modules/danf/config/client/event/sequences',
        'node_modules/danf/config/common/manipulation/interfaces',
        'node_modules/danf/config/common/manipulation/services',
        'node_modules/danf/config/common/manipulation/classes',
        'node_modules/danf/config/client/manipulation/events',
        'node_modules/danf/config/client/manipulation/interfaces',
        'node_modules/danf/config/client/manipulation/services',
        'node_modules/danf/config/client/manipulation/sequences',
        'node_modules/danf/config/client/manipulation/classes',
        'node_modules/danf/config/common/logging/interfaces',
        'node_modules/danf/config/common/logging/classes',
        'node_modules/danf/config/client/logging/services',
        'node_modules/danf/config/common/object/interfaces',
        'node_modules/danf/config/common/object/services',
        'node_modules/danf/config/common/object/classes',
        'node_modules/danf/config/common/http/interfaces',
        'node_modules/danf/config/common/http/classes',
        'node_modules/danf/config/common/http/services',
        'node_modules/danf/config/client/http/classes',
        'node_modules/danf/config/client/http/services',
        'node_modules/danf/config/common/vendor/classes',
        'node_modules/danf/config/common/vendor/services',
        'node_modules/danf/config/client/vendor/classes',
        'node_modules/danf/config/client/vendor/services'
    ]
    , function(
        Framework,
        Initializer
    ) {
        require(['_app'], function(configuration) {
            setTimeout(
                function() {
                    // Build framework.
                    var framework = new Framework(),
                        initializer = new Initializer(),
                        app = function() {}
                    ;

                    framework.addInitializer(initializer);
                    framework.set('danf:app', app);
                    framework.build(configuration, danf.context);

                    app.servicesContainer = app.objectsContainer;
                },
                10
            );
        });
    }
);
define("node_modules/danf/lib/client/main", function(){});

