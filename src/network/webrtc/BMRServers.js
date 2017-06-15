
BMRServers = BMStorableNode.extend().newSlots({
    type: "BMRServers",
    maxConnections: 8,
	debug: true,
}).setSlots({
    init: function () {
        BMStorableNode.init.apply(this)
		this.setShouldStore(true)
        this.setTitle("PeerJS Servers")
        this.addServer(this.bootStrapServer())
        this.setNoteIsItemCount(true)
        this.setNodeMinWidth(270)
        
        //this.setPidSymbol("_servers")     
    },
    
    bootStrapServer: function () {
        return BMRServer.clone().setHost('peers.bitmarkets.org').setPort(9000) //.setPidSymbol("_bootStrapServer")
        //return BMRServer.clone().setHost('127.0.0.1').setPort(9000) //.setPidSymbol("_bootStrapServer")
        //console.log("BMRServers.bootStrapServer")
        //return BMRServer.clone().setHost('127.0.0.1').setPort(9000) //.setPidSymbol("_bootStrapServer")
    },
    
    addServer: function (aServer) {
        return this.addItem(aServer)
    },
    
    servers: function () {
        return this.items()
    }, 
    
    network: function() {
        return this.parentNode()
    },
    
    /*
    subtitle: function () {
        return this.connectedServers().length + " of " + this.servers().length + " connected"
    },

    subtitle: function () {
        return this.remotePeerCount() + " peers"
    },
    */
    
    remotePeerCount: function() {
        return this.connectedServers().sum(function (server) {
            return server.remotePeerCount()
        })
    },    
    
    connectedServers: function () {
        return this.servers().filter(function (server) { return server.isConnected() })
    },
    
    unconnectedServers: function () {
        return this.servers().filter(function (server) { return !server.isConnected() })
    },
    
    connectionCount: function () {
        return this.connectedServers().length
    },
    
    connect: function () {
		
        var unconnectedServers = this.unconnectedServers().shuffle()
        var connectionsToAdd = this.maxConnections() - this.connectionCount()
        
        for (var i = 0; i < connectionsToAdd && i < unconnectedServers.length; i ++) {
            var server = unconnectedServers[i]
            server.connect()
        }

        return this              
    },
    
    /*
    connectedRemotePeers: function () {
        var peers = []
        this.connectedServers().forEach(function (server) {
            peers.appendItems(server.connectedRemotePeers())
        })        
        return peers
    },
    */
    
    // sending
    
    broadcastMsg: function(msg) {        
        this.connectedServers().forEach(function (server) {
            server.broadcastMsg(msg)
        })
        return this
    },
    
    currentAddrMsg: function () {
        var msg = BMAddrMessage.clone()
        this.servers().forEach(function (server) {
            msg.addAddrDict(server.addrDict())
        })
        return msg
    },
    
    onRemotePeerConnect: function(remotePeer) {
        // send addr
        var msg = this.currentAddrMsg()
        this.log("sendMsg " + msg.type())
        remotePeer.sendMsg(msg)
    },
    
    hasAddrDict: function(addrDict) {
        return this.servers().detect(function (server) {
            return server.isAddrDict(addrDict)
        })        
    },
    
    addr: function(msg) {
        this.log("got addr")
        // walk the hosts and add any we don't have
        // TODO: check to see if we can connect *before* adding server
        
        var entries = msg.data()
        entries.forEach( (addrDict) => {
            if (!this.hasAddrDict(addrDict)) {
                this.addServer(Server.clone().setAddrDict(addrDict))
            }
        })
    },

	// --- choosing which servers to connect to ---
	
	sortServersByDistanceToBloomFilter: function(aBloomFilter) {
		// distance = countOfDifferentBits(hash(serverIp).bitArrayOfBloomLength, uncompactedBloomFilterBitArray)
		// as we connect to peers whose blooms match to one or more of our ids/contacts
		// this distance metric should help minimize number of servers we need to 
		// connect to, to find friends - particularly since friends connections tend to overlap
		
		var bloomUint8Array = aBloomFilter.asUncompactedUint8BitArray();
		
		var servers = this.items()
		servers.forEach((server) => { server.updateBloomDistance(bloomUint8Array) })
		var sorted = servers.slice().sort((serverA, serverB) => {
			return serverA.bloomDistance() - serverB.bloomDistance() // smallest distance first	
		})
		
		this.setItems(sorted)
		
		return this
	},
    
})
