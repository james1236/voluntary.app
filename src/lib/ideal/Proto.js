"use strict"

window.ideal = {}

var Proto = new Object;
ideal.Proto = Proto

Proto.setSlot = function (name, value) {
    this[name] = value;
    return this;
};

Proto.setSlots = function (slots) {
    Object.eachSlot(slots,  (name, initialValue) => {
        this.setSlot(name, initialValue);
    });
    return this;
}

Proto.setSlots({
    _uniqueInstanceId: 0,
    
    allProtos: function() {
        if (!Proto._allProtos) {
            Proto._allProtos = []
        }
        return Proto._allProtos
    },

    registerThisProto: function() {
        if (this.allProtos().indexOf(this) == -1) {
            this.allProtos().push(this)
        }
        return this
    },

    childProtos: function() {
        var result = this.allProtos().select((proto) => { return proto._parentProto == this })
        return result
    },

    extend: function () {
        var obj = this.cloneWithoutInit()
        obj.registerThisProto()
        obj._parentProto = this
        return obj
    },

    uniqueId: function () {
        return this._uniqueId
    },

    typeId: function () {
        return this.type() + this.uniqueId()
    },

    /*
    getClassVariable: function(name, defaultValue) {
        if (this[name])

    },
    */

    newUniqueInstanceId: function() {
        Number.isInteger(Proto._uniqueInstanceId)
        Proto._uniqueInstanceId ++
        return Proto._uniqueInstanceId
    },

    setType: function(typeString) {
        this._type = typeString
        this.constructor.name = typeString
        return this
    },

    cloneWithoutInit: function () {
        var obj = Object.clone(this);
        obj.__proto__ = this;
        //obj.constructor.name = this._type // can't assign to an anonymous Function
        obj._uniqueId = this.newUniqueInstanceId()
        obj.assertHasUniqueId()
        // Note: does the JS debugger expect constructor.__proto__.type?
        return obj;
    },

    assertHasUniqueId: function() {
        assert(Number.isInteger(this._uniqueId))
    },

    clone: function () {
        var obj = this.cloneWithoutInit();
        obj.init();
        return obj;
    },

    withSets: function (sets) {
        return this.clone().performSets(sets);
    },

    withSlots: function (slots) {
        return this.clone().setSlots(slots);
    },

    init: function () { 
        // subclasses should override to do initialization
    },

    sharedInstanceForClass: function(aClass) {   
        if (!aClass._shared) {
            aClass._shared = this.clone();
        }
        return aClass._shared;
    },

    uniqueId: function () {
        return this._uniqueId;
    },

    toString: function () {
        return this._type;
    },

    setSlotsIfAbsent: function (slots) {
        Object.eachSlot(slots,  (name, value) => {
            if (!this[name]) {
                this.setSlot(name, value);
            }
        });
        return this;
    },

    newSlot: function (slotName, initialValue) {
        if (typeof (slotName) != "string") {
            throw new Error("name must be a string");
        }

        if (initialValue === undefined) { 
            initialValue = null 
        };

        var privateName = "_" + slotName;
        this[privateName] = initialValue;

        if (!this[slotName]) {
            this[slotName] = function () {
                return this[privateName];
            }
        }

        var setterName = "set" + slotName.capitalized()

        if (!this[setterName]) {
            this[setterName] = function (newValue) {
                //this[privateName] = newValue;
                this.updateSlot(slotName, privateName, newValue);
                return this;
            }
        }

        /*
				this["addTo" + slotName.capitalized()] = function(amount)
				{
					this[privateName] = (this[privateName] || 0) + amount;
					return this;
				}
				*/

        return this;
    },

    updateSlot: function (slotName, privateName, newValue) {
        var oldValue = this[privateName];
        if (oldValue != newValue) {
            this[privateName] = newValue;
            
            if (privateName == "_type") {
                this.contructor.name = newValue
            }

            this.didUpdateSlot(slotName, oldValue, newValue)
            //this.mySlotChanged(name, oldValue, newValue);
        }

        return this;
    },

    didUpdateSlot: function (slotName, oldValue, newValue) {
        // persistence system can hook this
    },

    mySlotChanged: function (slotName, oldValue, newValue) {
        this.perform(slotName + "SlotChanged", oldValue, newValue);
    },

    ownsSlot: function (name) {
        return this.hasOwnProperty(name);
    },

    aliasSlot: function (slotName, aliasName) {
        this[aliasName] = this[slotName];
        this["set" + aliasName.capitalized()] = this["set" + slotName.capitalized()];
        return this;
    },

    argsAsArray: function (args) {
        return Array.prototype.slice.call(args);
    },

    newSlots: function (slots) {
        Object.eachSlot(slots,  (slotName, initialValue) => {
            this.newSlot(slotName, initialValue);
        });

        return this;
    },

    slotNames: function (obj) {
        return Object.keys(this);
    },

    canPerform: function (message) {
        return this[message] && typeof (this[message]) == "function";
    },

    performWithArgList: function (message, argList) {
        return this[message].apply(this, argList);
    },

    perform: function (message) {
        if (this[message] && this[message].apply) {
            return this[message].apply(this, this.argsAsArray(arguments).slice(1));
        }

        throw new Error(this, ".perform(" + message + ") missing method")

        return this;
    },

    _setterNameMap: {},

    setterNameForSlot: function (name) {
        // cache these as there aren't too many and it will avoid extra string operations
        var setter = this._setterNameMap[name]
        if (!setter) {
            setter = "set" + name.capitalized()
            this._setterNameMap[name] = setter
        }
        return setter
    },

    performSet: function (name, value) {
        return this.perform("set" + name.capitalized(), value);
    },

    performSets: function (slots) {
        Object.eachSlot(slots,  (name, value) => {
            this.perform("set" + name.capitalized(), value);
        });

        return this;
    },

    performGets: function (slots) {
        var object = {};
        slots.forEach( (slot) => {
            object[slot] = this.perform(slot);
        });

        return object;
    },

    uniqueId: function () {
        return this._uniqueId
    },

    isKindOf: function (aProto) {
        if (this.__proto__) {
            if (this.__proto__ === aProto) {
                return true
            }

            if (this.__proto__.isKindOf) {
                return this.__proto__.isKindOf(aProto)
            }
        }
        return false
    },

    toString: function () {
        return this.type() + "." + this.uniqueId();
    },


    // --- ancestors ---

    ancestors: function () {
        var results = []
        var obj = this;
        while (obj.__proto__ && obj.type) {
            results.push(obj)
            if (results.length > 100) {
                throw new Error("proto loop detected?")
            }
            obj = obj.__proto__
        }
        return results
    },

    ancestorTypes: function () {
        return this.ancestors().map((obj) => { return obj.type() })
    },

    firstAncestorWithMatchingPostfixClass: function (aPostfix) {
        // not a great name but this walks back the ancestors and tries to find an
        // existing class with the same name as the ancestor + the given postfix
        // useful for things like type + "View" or type + "RowView", etc
        //console.log(this.type() + " firstAncestorWithMatchingPostfixClass(" + aPostfix + ")")
        var match = this.ancestors().detect((obj) => {
            var name = obj.type() + aPostfix
            var proto = window[name]
            return proto
        })
        var result = match ? window[match.type() + aPostfix] : null
        /*
        if (result) { 
            console.log("FOUND " + result.type())
        }
        */
        return result
    },

});

Proto.newSlot("type", "ideal.Proto");


