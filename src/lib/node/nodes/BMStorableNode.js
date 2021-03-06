"use strict"

window.BMStorableNode = BMNode.extend().newSlots({
    type: "BMStorableNode",

    pid: null,
    shouldStore: false,

    storedSlots: null, // dict
    
    shouldStoreSubnodes: true,
    loadsUnionOfChildren: false,
    isUnserializing: false,
    
    existsInStore: false,
    doesLazyLoadChildren: false,
}).setSlots({
    init: function () {
        BMNode.init.apply(this)
        this.setStoredSlots({})
        this.scheduleSyncToStore()
        //this.addStoredSlot("viewDict")
    },
    
    // --- overrides from parent class ---
    // hook this to schedules writes when subnode list is changed

    didChangeSubnodeList: function() {
        BMNode.didChangeSubnodeList.apply(this)
        if (this.shouldStoreSubnodes()) {
            this.scheduleSyncToStore()
        }
        return this
    },

    // -----------------------------------------------
    // persistence id - "pid"
    // -----------------------------------------------

    setPidSymbol: function(aPid) {
        this.setPid(aPid)
        this.loadIfPresent()
        return this
    },
        
    setPid: function(aPid) {
        this._pid = aPid
        NodeStore.shared().addActiveObject(this)
        this.scheduleSyncToStore()
        return this
    },
    
    justSetPid: function(aPid) { // don't schedule sync
        this._pid = aPid
        NodeStore.shared().addActiveObject(this)
        return this
    },
    
    hasPid: function() {
        return this._pid != null
    },
    
    assignPid: function() {
        if (this._pid) {
            throw new Error("attempt to reassign pid")
        }
        
        this._pid = NodeStore.shared().pidOfObj(this)
        
        NodeStore.shared().addActiveObject(this)
        this.scheduleSyncToStore()
        
        return this
    },
    
    pid: function() {
        if (!this.shouldStore()) {
            throw new Error("attempt to prepare to store a node of type '" + this.type() + "' which has shouldStore == false, use this.setShouldStore(true)")
        }
		
        if (!this._pid) {
            this.assignPid()
        }
        return this._pid
    },
  
    /*  
    typeId: function() {
        return this.pid() // is this a good idea?
    },
*/

    // -------------------------------------------

    // --- add / remove stored slots ---
    
    initStoredSubnodeSlotWithProto: function(name, proto) {
        var obj = proto.clone()
        this.newSlot(name, obj)
        this.justAddSubnode(obj)
        this.addStoredSlot(name)
        return this
    },
    
    addStoredSlots: function(slotNames) {
        slotNames.forEach((slotName) => {
            this.addStoredSlot(slotName)
        })
        return this
    },
    
    addStoredSlot: function(slotName) {
        this.storedSlots()[slotName] = true
        // Note: BMStorableNode hooks didUpdateSlot() to call scheduleSyncToStore on updates. 
        return this
    },
    
    removeStoredSlot: function(slotName) {
        delete this.storedSlots()[slotName]
        return this
    },

    // --- get storage dictionary ---

    nodeDictForProperties: function () {
        var dict = { }
        dict.type = this.type()
 
        //console.log(this.type() + " storedSlots = " + JSON.stringify(this.storedSlots()))
       
        var slots = this.storedSlots()
        Object.keys(slots).forEach((k) => {
            var v = null
            if (k.beginsWith("_")) {
                v = this[k]
            } else {
                try {
	                v = this[k].apply(this)
                } catch(error) {
                    console.warn("WARNING: " + this.type() + "." + k + "() missing method")
                    //throw error
                }
            }
           
            dict[k] = NodeStore.shared().refValueIfNeeded(v)
        })
        
        return dict
    },

    nodeDict: function () {
        var dict = this.nodeDictForProperties()
        
        if (this.subnodes().length && this.shouldStoreSubnodes()) {
            dict.children = this.subnodePids()
        }
        
        return dict
    },

    // --- set storage dictionary ---
   
    setNodeDict: function (aDict) {   
	    //BMNode.setNodeDict.apply(this, [aDict])
        // TODO: wrap in try {}
        this.setIsUnserializing(true) 
        this.setNodeDictForProperties(aDict)
        if (!this.doesLazyLoadChildren()) {
            this.setNodeDictForChildren(aDict)
        }
        this.didLoadFromStore()
        this.setIsUnserializing(false) 
        return this
    },
    
    prepareToAccess: function() {
        BMNode.prepareToAccess.apply(this)
        if (this.doesLazyLoadChildren()) {
            var dict = BMNodeStore.shared().nodeDictAtPid(this.pid())
            this.setNodeDictForProperties(dict)
        }
        return this
    },
    
    setNodeDictForProperties: function (aDict) {
        var hadMissingSetter = false 
        Object.keys(aDict).forEach((k) => {
            if (k != "children" && k != "type") {
                var v = aDict[k]
                v = NodeStore.shared().unrefValueIfNeeded(v)
                
                if (k.beginsWith("_")) {
                    this[k] = v
                } else {
                    var setter = "set" + k.capitalized();
                    if (this[setter]) {
                        this[setter].apply(this, [v])
                    } else {
                        console.error("WARNING: " + this.type() + "." + setter + "(", v , ") not found - dict is: " , aDict) //, JSON.stringify(aDict))
                        hadMissingSetter = true
                        //throw error
                    }
                }
            }
        })
   
        if (hadMissingSetter) {
            this.scheduleSyncToStore()
        }
		
        return this
    },

    setNodeDictForChildren: function (aDict) {
        var newPids = aDict.children
        if (newPids) {
            if (this.loadsUnionOfChildren()) {
                throw new Error("loadsUnionOfChildren") // checking if this is being used
                newPids = this.subnodePids().union(newPids)
            }
            
            this.setSubnodePids(newPids)
        }
        return this
    },
    
    // --- udpates ---
	
    scheduleLoadFinalize: function() {
        window.SyncScheduler.shared().scheduleTargetAndMethod(this, "loadFinalize")
    },
    
    
    loadFinalize: function() {
        // called after all objects loaded within this event cycle
	
    },
	
    didLoadFromStore: function() {
        //console.log(this.type() + " didLoadFromStore in BMStorableNode")
        // chance to finish any unserializing this particular instance
        // also see: loadFinalize
		
        this.checkForStoredSlotsWithoutPids()
    },

    checkForStoredSlotsWithoutPids: function() {
        // make sure all stored slots have pids after load
        // if not, we've just added them and they'll need to be saved
        // as well as this object itself

        Object.keys(this._storedSlots).forEach((slotName) => {
            var obj = this[slotName].apply(this)
            var isRef = obj != null && obj.typeId
            if (isRef && !obj.hasPid()) {
                obj.pid()
                NodeStore.shared().addDirtyObject(this)
                //console.log(">>>>>>>>>>>>>>>>> loadFinalize assigned pid ", obj.pid())
            }
        })		
    },

    scheduleSyncToStore: function() {
        //console.log(this.typeId() + " scheduleSyncToStore this.hasPid() = ", this.hasPid())
        let typeId = this.typeId()
        let hasPid = this.hasPid()
        let shouldStore = this.shouldStore()
        let isUnserializing = this.isUnserializing()

        //console.log(this.typeId() + " scheduleSyncToStore this.hasPid() = ", this.hasPid())

        if (hasPid && shouldStore && !isUnserializing) {
            //console.log(this.typeId() + " scheduleSyncToStore -> addDirtyObject")
        	NodeStore.shared().addDirtyObject(this)
            //this._refPids = null
        }

        return this
    },
	
    didUpdateSlot: function(slotName, oldValue, newValue) {
	    if (!this._storedSlots || !this.shouldStore()) {
	        // looks like StorableNode hasn't initialized yet
	        return this
	    }
	    
        // check so we don't mark dirty while loading
        // and use private ivars directly for performance
        if (slotName in this._storedSlots) { 
            //console.log(this.type() + ".didUpdateSlot(" + slotName + ",...) -> scheduleSyncToStore")
            this.scheduleSyncToStore()
        }
		
        if (newValue != null && this.subnodes().includes(oldValue)) { // TODO: add a switch for this feature
            newValue.setParentNode(this)
            this.subnodes().replaceOccurancesOfWith(oldValue, newValue)
            //console.log(this.type() + " this.subnodes().replaceOccurancesOfWith(", oldValue, ",", newValue, ")")
        }
    },
	
    // StorableNode
	
    subnodePids: function() {
        var pids = []
        
        this.subnodes().forEach((subnode) => {
            if (subnode.shouldStore() == true) {
                pids.push(subnode.pid())
            }
        })

        return pids
    },
    
    setSubnodePids: function(pids) {
        var subnodes = pids.map((pid) => {
            return NodeStore.shared().objectForPid(pid)
        })

        this.setSubnodes(subnodes)
        return this
    },

    // store
    
    store: function() {
        NodeStore.shared().storeObject(obj)
        return this
    },
    
    pidRefsFromNodeDict: function(nodeDict) {
        var pids = []

        if (nodeDict) {
            // property pids
            Object.keys(nodeDict).forEach((k) => {
                var v = nodeDict[k]
                var childPid = this.pidIfRef(v)
                if (childPid) {
                    pids.push(childPid);
                }
            })
            
            // child pids
            if (nodeDict.children) {
                nodeDict.children.forEach(function(childPid) {
                    pids.push(childPid)
                })
            }          
        }
        
        return pids
    },

    nodePidRefsFromNodeDict: function(nodeDict) {
        var pids = []

        if (nodeDict) {
            // property pids
            Object.keys(nodeDict).forEach((k) => {
                var v = nodeDict[k]
                var childPid = NodeStore.shared().pidIfRef(v)
                if (childPid) {
                    pids.push(childPid);
                }
            })
            
            // child pids
            if (nodeDict.children) {
                nodeDict.children.forEach(function(childPid) {
                    pids.push(childPid)
                })
            }          
        }
        
        return pids
    },
    
    /*
	nodeRefPids: function() {
		if (this._refPids == null) {
			var refs = {}
			var dict = this.nodeDict()
			var keys = Object.keys(dict)
		
			var name = this.typeId()
			//debugger;
			// stored slots
			keys.forEach((k) => {
				var v = dict[k]
				if (k != "children" && typeof(v) == "object") {
					if (v.pid != "null") {
						refs[v.pid] = true
					}
				}
			})
		

			// children
			if (dict.children) {
				dict.children.forEach((pid) => {
					if (pid == null || pid == "null") {
						debugger;
					}
					refs[pid] = true
				})
			}
		
			//this._refPids = refs
			
		//	console.log(this.pid() + " nodeRefPids: ", Object.keys(refs))
		}
		//return this._refPids
		
		return refs
	},
	*/


})
