
/*
BMGetDataItem = BMNode.extend().newSlots({
    type: "BMGetDataItem",
    hash: null,
    fromMsg: null,
}).setSlots({
})
*/

BMMessages = BMStorableNode.extend().newSlots({
    type: "BMMessages",
    index: null,
    changeNote: null,
    queue: null,
    network: null,
    // TODO: deal with timeouts
    globalMinDifficulty: 16,
	debug: false,
}).setSlots({
    init: function () {
        BMStorableNode.init.apply(this)
		this.setShouldStore(true)
		this.setShouldStoreSubnodes(true)
		
        this.setTitle("Messages")
        this.setIndex({})
        this.setChangeNote(NotificationCenter.shared().newNotification().setSender(this).setName("newMessagesMessage"))
        this.setQueue({})
        this.setNoteIsSubnodeCount(true)
		this.setNodeMinWidth(180)
    },
    
    subnodeProto: function() {
        return BMObjectMessage
    },

	didLoadFromStore: function() {
		//console.log(this.type() + " didLoadFromStore subnodes length = ", this.subnodes().length)
		this.updateIndex()
		
		// these need to wait until after the initial store load is complete
		setTimeout(() => {
			this.removeMessagesNotMatchingIdentities()
			this.placeAllSubnodes()
		}, 0)
		
		return this
	},
    
    messageWithHash: function(hash) {
        return this._index[hash]
    },
    
    messages: function () {
        return this.subnodes()
    },

    notifyChange: function() {
        this.changeNote().post()
        return this
    },
    
    hasMessage: function(msg) {
        return msg.msgHash() in this._index
    },
    
    validateMsg: function(msg) {
/*
        if (msg.actualPowDifficulty() < this.globalMinDifficulty()) {
            console.log("rejecting message '" + msg.msgHash() +"' with pow of " + msg.actualPowDifficulty() + " < globalMinDifficulty of " + this.globalMinDifficulty())
            // check should be at remotePeer level
            this.removeMessage(msg)
            return false
        }
*/
      
        if (this.hasMessage(msg)) {
            console.log("attempt to add duplicate message ", msg.msgHash())
            return false
        }

   		return true
    },
        
    addMessage: function(msg) { // validate and broadcast
		//console.log(this.type() + " addMessage ", msg)

        if (!this.validateMsg(msg)) {
			console.log(this.type() + " INVALID MESSAGE")
            return false
        }
        
        this.addSubnode(msg)

		setTimeout(() => {
			msg.place()
	        this.broadcastMessage(msg)
		}, 10)
        
        return true
    },


	placeAllSubnodes: function() {
		this.subnodes().forEach( (msg) => {
			//console.log(this.type() + " placing ", msg)
			msg.place()
		})
	},

	addSubnode: function(msg) {
		//console.log(this.type() + " addSubnode " + msg.pid())
		BMStorableNode.addSubnode.apply(this, [msg])
        this.addMessageToIndex(msg)
        this.notifyChange()
		return this
	},
	
	addMessageToIndex: function(msg) {
        this._index[msg.msgHash()] = msg
	},

	broadcastMessage: function(msg) {
	    // tell peers
	    var peers = this.network().connectedRemotePeers()
	    console.log("broadcasting to " + peers.length + " peers")
	    peers.forEach(function (peer) {
	        peer.addedObjectMsg(msg)
	    })	
	},
    
    removeMessage: function(msg) {
		this.removeSubnode(msg) // garbage collector will remove persisted version
        delete this._index[msg.msgHash()]
        return this
    },
    
    updateIndex: function () {
        var index = {}
        
        this.messages().forEach(function (msg) {
            index[msg.msgHash()] = msg
        })
        
        this.setIndex(index)  
        this.notifyChange()
        return this
    },

    
    // handling inv (inventory) messages, immediately respond with BMGetDataMessage for missing hashes

    inv: function(invMsg) {
        var remoteInv = invMsg.data()        
        var getMsg = BMGetDataMessage.clone().setRemotePeer(invMsg.remotePeer())
        
        remoteInv.forEach( (h) => {
            if (this.needsHash(h)) {
                getMsg.addHash(h)
                this._queue[h] = true
            }
        })
        
        if (getMsg.data().length) {
            getMsg.send()
        }
    },
    
    // handling object messages
    
    network: function() {
        return this.parentNode()
    },
    
    object: function(msg) {
        var h = msg.msgHash()
        
        // remove from the queue
        delete this._queue[h]
        
        this.addMessage(msg)
    },
    
    objectWithHash: function(aHash) {
        // move to index after this works
        return this.messages().detect(function (msg) { 
            return msg.msgHash() == aHash
        })
    },
    
    getData: function(msg) {
        msg.data().forEach((aHash) => {
            var objMsg = this.objectWithHash(aHash)
            if (objMsg) {
                msg.remotePeer().sendMsg(objMsg)
            }
        })
    },
    
    // peer connect
    
    onRemotePeerConnect: function(remotePeer) {
        // send inv
        var invMsg = this.currentInvMsg()

        this.log("onRemotePeerConnect send inv " + invMsg.data().length)

        if (invMsg.data().length) {
            remotePeer.sendMsg(invMsg)
        }
    },

    invMsgForMessages: function (msgs) {
        var invMsg = BMInvMessage.clone()
        msgs.forEach( (objMsg) => {
            invMsg.addMsgHash(objMsg.msgHash())
        })
        return invMsg
    },
    
    currentInvMsg: function () {
        return this.invMsgForMessages(this.messages())
    },
    
    messagesMatchingBloom: function (aBloomFilter) {
        return this.messages().select((objMsg) => {
			return aBloomFilter.contains(objMsg.senderPublicKeyString())
        })
    },

    currentInvMsgForBloom: function (aBloomFilter) {
        return this.invMsgForMessages(this.messagesMatchingBloom(aBloomFilter))
    },

	removeMessagesNotMatchingIdentities: function() {
		// this gets slow for large msg count but target is short term
		// ephemeral messages for now 
		
		var pubkeys = BMNetwork.shared().allIdentityPublicKeyStrings()
		var count = 0
				
		this.messages().copy().forEach( (objMsg) => {
			//console.log("objMsg: ", objMsg)
			var senderPK = objMsg.senderPublicKeyString()
            if (!pubkeys.contains(senderPK)) {
				this.removeMessage(objMsg)
				count ++
				console.log("no match for sender " + senderPK)
			} else {
				//console.log("matched sender " + senderPK)
			}
        })

		if (count) {
			this.log("removeMessagesNotMatchingIdentities removed " + count + " messages")
		}
	
		return this
	},
})