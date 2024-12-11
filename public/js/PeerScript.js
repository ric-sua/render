class PeerScript{
    constructor(metadata,path) {
        this.ev = new EventTarget();
        this.metadata = metadata;
        this.url = "rapidchatter.alwaysdata.net";
        this.path = path || "/socket";
        const query = encodeURIComponent(JSON.stringify(this.metadata));
        this.secure = true;
        this.proto = this.secure ? "wss://" : "ws://";
        this.signalChannel = new WebSocket(`${this.proto}${this.url}${this.path}?${query}`);
        this.channelN = crypto.randomUUID().slice(1,5);
        this.peerList = {};
        this.peers = []
        this.reqFiles = false;
        this.activeListener();
    }

    async activeListener(){
        document.onbeforeunload = (event) => {
            this.signalChannel.close();
        };
        this.signalChannel.addEventListener('open', (event) =>{
            console.log("open")
            setInterval(() =>{this.signalChannel.send("pinging socket server...")}, 30000)
            this.signalChannel.onmessage = async (message) => {
                try{
                    const state = JSON.parse(message.data)
                    if(state.peers){
                        console.log("triggered socket")
                        this.peers = state.peers;
                        console.log(this.peers)
                      state.peers.forEach(sp =>{
                        if(!this.peerList[sp]){
                            this.peerList[sp] = new PeerConnection(this.metadata.id,this.signalChannel,this.ev);
                        }
                      })
                    }
                    if(state.id){
                        console.log('id: '+ state.id)
                      }
                     if (state.answer) {
                        this.peerList[state.from].handleAnswer(state.answer);
                        }
                        if (state.offer) {
                            this.peerList[state.from].handleOffer(state.from,state);
                        }
                        if (state.iceCandidate) {
                            this.peerList[state.from].handleIce(state.iceCandidate);
                        }
               }catch (e){
                console.log(message.data)
               }
                }
    });

    this.ev.addEventListener("deletion", (conn) =>{
        if(this.peerList[conn.detail])
            delete this.peerList[conn.detail]
    })
        
                    }

                connect(id){
                   return this.peerList[id].createOffer(id);
                }

                getPeers(time = 1000) {
                    return new Promise((resolve) => {
                        setTimeout(() => {
                            resolve(this.peers);
                        }, time);
                    });
                }

                sendData(to,data){
                    const fileId = crypto.randomUUID().slice(1,8);
                    const Dc = this.peerConnections[to].createDataChannel(fileId);
                    Dc.onopen = () =>{
                        Dc.send(data);
                        Dc.close();
                    }
                    this.remoteChannel = this.remoteChannel.filter((k) => k['files'] !== fileId)
                }
                
}

class PeerConnection {
    constructor(from,socket,ev){
        this.disp = ev
        this.from = from;
        this.socket = socket;
        this.channelN = crypto.randomUUID().slice(1,5);
        this.peerConnection = "";
        this.configuration = "";
        this.data = "";
        this.curr = "";
        this.currentRtc = 0;
        this.dataChannel = "";
        this.remoteChannel = [];
    }

                    async handleOffer(peer,state){
                        console.log("received offer");
                        this.peerConnection = await this.createConnection(peer);
                        this.peerConnection.setRemoteDescription(new RTCSessionDescription(state.offer));
                        const answer = await this.peerConnection.createAnswer();
                        await this.peerConnection.setLocalDescription(answer);
                    console.log("Created answer");
                    this.socket.send(JSON.stringify({'from': state.to, 'to': state.from, 'answer': answer}));
                    }
    
                    async handleIce(candid){
    
                        if(this.peerConnection){
                            try {
                                await this.peerConnection.addIceCandidate(candid);
                            } catch (e) {
                                console.error('Error adding received ice candidate', e);
                            }
                        }
                    }
                    
                    async handleAnswer(sta){
                        console.log("received answer");
                 const remoteDesc = new RTCSessionDescription(sta);
                 await this.peerConnection.setRemoteDescription(remoteDesc);
                 console.log("assigned answer");
                    }
    
                    async createOffer(id){
                        this.peerConnection = await this.createConnection(id);
                        const offer = await this.peerConnection.createOffer();
                        await this.peerConnection.setLocalDescription(offer);
                        this.socket.send(JSON.stringify({'from': this.from, 'to': id, 'offer': offer}));
                        console.log("created offer");
                        return this.dataChannel;
                    }
    
                    async createConnection(peer){
                        const getkey = await fetch('/api/config');
                        const akey = await getkey.json();
                        const response = await fetch(`https://rapidchatter.metered.live/api/v1/turn/credentials?apiKey=${akey.apiKey}`);
                
                        const iceServers = await response.json();
                
                        const peerC = new RTCPeerConnection({iceServers: iceServers})
                        this.dataChannel = peerC.createDataChannel(this.channelN);
                        this.dataChannel.peer = peer
                        peerC.addEventListener('icecandidate', event => {
                            if (event.candidate) {
                               this.socket.send(JSON.stringify({'from': this.from, 'to': peer, 'iceCandidate': event.candidate}))
                            }
                        });

                        
    
                        peerC.addEventListener('datachannel', event => {
                                this.remoteChannel = event.channel;
                                this.remoteChannel.peer = peer;
                            this.activechannels(event.channel);
                            const c = new CustomEvent("connection", {detail: {remote: this.remoteChannel, local: this.dataChannel}})
                        this.disp.dispatchEvent(c);
                    });
    
                    peerC.addEventListener('connectionstatechange', event => {
                        if (peerC.connectionState === 'connected') {
                            console.log("successfully connected to peer id: " + peer);
                        }
                        if (peerC.connectionState === 'failed') { 
                            this.peerConnection = null;
                            this.dataChannel.close();
                            peerC.close();
                            console.log("failed");
                            const c = new CustomEvent("deletion", {detail: peer})
                        this.disp.dispatchEvent(c);
                        }
                        if (peerC.connectionState === "closed"){
                            this.peerConnection = null;
                            this.dataChannel.close();
                            peerC.close();
                            console.log("closed");
                            const c = new CustomEvent("deletion", {detail: peer})
                        this.disp.dispatchEvent(c);
                        }
                        if (peerC.connectionState === "disconnected"){
                            this.peerConnection = null;
                            this.dataChannel.close();
                            peerC.close();
                            console.log("disconnected");
                            const c = new CustomEvent("deletion", {detail: peer})
                        this.disp.dispatchEvent(c);
                        }
                    });
    
                        return peerC;
                    }

                    sendData(to,data){
                        const fileId = crypto.randomUUID().slice(1,8);
                        const Dc = this.peerConnection.createDataChannel(fileId);
                        Dc.onopen = () =>{
                            Dc.send(data);
                            Dc.close();
                        }
                        this.remoteChannel = this.remoteChannel.filter((k) => k['files'] !== fileId)
                    }
    
                    activechannels(chan){
                            chan.addEventListener("close", () =>{
                                this.remoteChannel = null;
                                console.log("remote closed");
                            })
                    }
}