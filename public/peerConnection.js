

console.log(firebaseRef)

const servers = {
    iceServers: [
        {
            urls: [
                "stun:stun1.l.google.com:19302",
                "stun:stun2.l.google.com:19302",
                "stun:stun.l.google.com:19302",
                "stun:stun3.l.google.com:19302",
                "stun:stun4.l.google.com:19302",
                "stun:stun.services.mozilla.com",
            ],
        },
    ],
    iceCandidatePoolSize: 10,
}
const pc = new RTCPeerConnection(servers)

const videoGrid = document.getElementById("video-grid")
const myVideo = document.createElement("video")
navigator.mediaDevices.getUserMedia(
    { video: true, audio: true },
    function (stream) {
        const videoTracks = stream.getVideoTracks()

        // stream.onremovetrack = function() {
        //     console.log("Stream ended")
        // }
        videoTracks.forEach((track) => {
            pc.addTrack(track, stream)
        })

        myVideo.srcObject = stream
        videoGrid.append(myVideo)

        remoteStream = new MediaStream()
        pc.ontrack = (event) => {
            event.streams[0].getTracks().forEach((track) => {
                remoteStream.addTrack(track)
            })
        }

        const remoteVideo = document.createElement("video")
        remoteVideo.srcObject = remoteStream
        videoGrid.append(remoteVideo)
    }
)

pc.onicecandidate = (event) => {
    event.candidate && offerRef.add(event.candidate.toJSON())
}

const offerDescription = await pc.createOffer()
await pc.setLocalDescription(offerDescription)

const offer = {
    sdp: offerDescription.sdp,
    type: offerDescription.type,
}
