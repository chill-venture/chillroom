// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app"
import {
    connectDatabaseEmulator,
    getDatabase,
    ref,
    set,
    push,
    get,
    onChildAdded,
} from "firebase/database"

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyAez8tTAocxgtQ32QkG-yzsb0dkNbDSwV4",
    authDomain: "chillroom-16866.firebaseapp.com",
    databaseURL: "https://chillroom-16866-default-rtdb.firebaseio.com",
    projectId: "chillroom-16866",
    storageBucket: "chillroom-16866.appspot.com",
    messagingSenderId: "70372044208",
    appId: "1:70372044208:web:9f63896960f482bdb5fa75",
    measurementId: "G-LYECR9CXYD",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getDatabase(app)
// connectDatabaseEmulator(db, "localhost", 9000)

const userName = prompt("What's your name?")

const urlparams = new URLSearchParams(window.location.search)
let roomId = urlparams.get("id")

let firebaseRef
if (roomId) {
    firebaseRef = ref(db, roomId)
} else {
    firebaseRef = push(ref(db))
    roomId = firebaseRef.key
    window.history.replaceState(null, "Meet", "?id=" + firebaseRef.key)
}

// Stun server
const servers = {
    iceServers: [
        {
            urls: [
                "stun:stun1.l.google.com:19302",
                "stun:stun2.l.google.com:19302",
            ],
        },
    ],
    iceCandidatePoolSize: 10,
}

const mediaOption = {
    video: true,
    audio: true,
}
let userRef = push(ref(db, `${roomId}/users`))
set(userRef, {
    metadata: {
        userName: userName,
        mediaOption,
    },
})
const userId = userRef.key

const videoGrid = document.getElementById("video-grid")
const myVideo = document.createElement("video")

let channels = new Set()

let messages = document.querySelector(".messages")
let text = document.querySelector("#chat_message")
let send = document.getElementById("send")
send.addEventListener("click", (event) => {
    if (text.value.length !== 0) {
        channels.forEach((channel) => {
            if (channel.readyState === "open") {
                channel.send(userName + ":" + text.value)
            }
        })
        displayMessage(userName + ":" + text.value)
        text.value = ""
    }
})

text.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && text.value.length !== 0) {
        channels.forEach((channel) => {
            if (channel.readyState === "open") {
                channel.send(userName + ":" + text.value)
            }
        })
        displayMessage(userName + ":" + text.value)
        text.value = ""
    }
})

function displayMessage(message) {
    let sender = ""
    for (var i = 0; i < message.length; i++) {
        if (message[i] === ":") {
            break
        }
        sender += message[i]
    }

    messages.innerHTML =
        messages.innerHTML +
        `<div class="message">
            <b>
                <i class="far fa-user-circle"></i>
                <span> ${userName == sender ? "me" : sender}</span>
            </b>
            <span>${message.substring(sender.length + 1)}</span>
        </div>`
}

function addVideoStream(localStream, remoteStream, video) {
    // Add remote video
    video.srcObject = remoteStream
    video.setAttribute("playsinline", "")
    video.setAttribute("autoplay", "")
    videoGrid.append(video)
}

var localStream = await navigator.mediaDevices.getUserMedia(mediaOption)
// Add local video
if (!myVideo.srcObject) {
    myVideo.srcObject = localStream
    myVideo.muted = true
    myVideo.setAttribute("playsinline", "")
    myVideo.setAttribute("autoplay", "")
    videoGrid.append(myVideo)

    audioAndVideoButtons(localStream)
}

async function createOffer(localStream, callerId) {
    const pc = new RTCPeerConnection(servers)
    const video = document.createElement("video")
    const remoteStream = new MediaStream()
    localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream)
    })
    pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track)
        })
    }

    // Create Data channel
    let channel = pc.createDataChannel("chat", {
        negotiated: true,
        id: 0,
    })
    channels.add(channel)
    channel.onmessage = function (event) {
        displayMessage(event.data)
        // Scroll down to lastest message
        let scroller = document.querySelector(".main__chat_window")
        scroller.scrollTop = scroller.scrollHeight
    }

    const offerRef = ref(db, `${roomId}/users/${callerId}/offer`)
    const answerRef = ref(db, `${roomId}/users/${callerId}/answer`)

    const iceOfferRef = ref(db, `${roomId}/users/${callerId}/iceOffer`)
    const iceAnswerRef = ref(db, `${roomId}/users/${callerId}/iceAnswer`)

    pc.onicecandidate = (event) => {
        event.candidate && set(push(iceOfferRef), event.candidate.toJSON())
    }

    const offerDescription = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
    })
    pc.setLocalDescription(offerDescription)
    const offer = {
        sdp: offerDescription.sdp,
        type: offerDescription.type,
    }
    await set(offerRef, { offer })

    onChildAdded(answerRef, async (snapshot) => {
        const answer = snapshot.val()
        if (answer) {
            const answerDescription = new RTCSessionDescription(answer)
            if (pc.signalingState !== "stable") {
                await pc.setRemoteDescription(answerDescription)
            }
        }
    })

    onChildAdded(iceAnswerRef, async (data) => {
        const candidate = new RTCIceCandidate(data.val())
        if (candidate) {
            pc.addIceCandidate(candidate)
        }
    })

    pc.addEventListener("connectionstatechange", (event) => {
        if (pc.connectionState === "connected") {
            if (callerId != "screen") {
                addVideoStream(localStream, remoteStream, video)
            }

            // Remove info about last connection: offer, asnwer,
            // iceOffer, iceAnswer
            set(offerRef, {})
            set(answerRef, {})

            set(iceOfferRef, {})
            set(iceAnswerRef, {})

            // Create offer for new connection
            createOffer(localStream, callerId)
        }
    })
    pc.oniceconnectionstatechange = function () {
        if (pc.iceConnectionState == "disconnected") {
            video.remove()
            channels.delete(pc)
        }
    }
}

async function createAnswer(localStream, callerId, calleeId) {
    const pc = new RTCPeerConnection(servers)
    const video = document.createElement("video")
    const remoteStream = new MediaStream()
    localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream)
    })
    pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track)
        })
    }

    // Create data channel
    let channel = pc.createDataChannel("chat", {
        negotiated: true,
        id: 0,
    })
    channels.add(channel)
    channel.onmessage = function (event) {
        displayMessage(event.data)
        // Scroll down to lastest message
        let scroller = document.querySelector(".main__chat_window")
        scroller.scrollTop = scroller.scrollHeight
    }

    const offerRef = ref(db, `${roomId}/users/${callerId}/offer`)
    const answerRef = ref(db, `${roomId}/users/${callerId}/answer`)

    const iceOfferRef = ref(db, `${roomId}/users/${callerId}/iceOffer`)
    const iceAnswerRef = ref(db, `${roomId}/users/${callerId}/iceAnswer`)

    pc.onicecandidate = (event) => {
        event.candidate && set(push(iceAnswerRef), event.candidate.toJSON())
    }

    let offerDescription = null
    await get(offerRef)
        .then((offer) => {
            if (offer.exists()) {
                offerDescription = offer.val().offer
            }
        })
        .catch((error) => {
            console.error(error)
        })

    await pc.setRemoteDescription(new RTCSessionDescription(offerDescription))

    const answerDescription = await pc.createAnswer()
    await pc.setLocalDescription(answerDescription)

    const answer = {
        type: answerDescription.type,
        sdp: answerDescription.sdp,
    }

    await set(answerRef, { answer })

    onChildAdded(iceOfferRef, async (data) => {
        const candidate = new RTCIceCandidate(data.val())
        pc.addIceCandidate(candidate)
    })

    pc.addEventListener("connectionstatechange", (event) => {
        if (pc.connectionState === "connected") {
            if (calleeId != "screen") {
                addVideoStream(localStream, remoteStream, video)
            }
        }
    })
    pc.oniceconnectionstatechange = function () {
        if (pc.iceConnectionState == "disconnected") {
            video.remove()
            channels.delete(pc)
            // Remove disconnected user in DB
            set(ref(db, `${roomId}/users/${callerId}`), {})
        }
    }
}

// On-off audio-video
function audioAndVideoButtons(stream) {
    // On-off mic
    let myVideoStream = stream
    const muteButton = document.querySelector("#muteButton")
    muteButton.addEventListener("click", () => {
        let enabled = myVideoStream.getAudioTracks()[0].enabled
        if (!enabled) {
            myVideoStream.getAudioTracks()[0].enabled = true
            let html = `<i class="fas fa-microphone"></i>`
            muteButton.classList.toggle("background__red")
            muteButton.innerHTML = html
        } else {
            myVideoStream.getAudioTracks()[0].enabled = false
            let html = `<i class="fas fa-microphone-slash"></i>`
            muteButton.classList.toggle("background__red")
            muteButton.innerHTML = html
        }
    })

    // On-off video
    const stopVideo = document.querySelector("#stopVideo")
    stopVideo.addEventListener("click", () => {
        let enabled = myVideoStream.getVideoTracks()[0].enabled
        if (enabled) {
            myVideoStream.getVideoTracks()[0].enabled = false
            let html = `<i class="fas fa-video-slash"></i>`
            stopVideo.classList.toggle("background__red")
            stopVideo.innerHTML = html
        } else {
            myVideoStream.getVideoTracks()[0].enabled = true
            let html = `<i class="fa fa-video-camera"></i>`
            stopVideo.classList.toggle("background__red")
            stopVideo.innerHTML = html
        }
    })
}

export async function peerConnection() {
    await get(ref(db, `${roomId}/users`))
        .then((users) => {
            if (!users.exists()) {
                console.error("Something went wrong!")
            } else {
                for (var remoteUserId in users.val()) {
                    const remoteUser = users.val()[remoteUserId]
                    if (remoteUserId != userId) {
                        createAnswer(localStream, remoteUserId, userId)
                    }
                }
                createOffer(localStream, userId)
            }
        })
        .catch((error) => {
            console.error(error)
        })
}

export function peerDisconnect() {
    // window.addEventListener("beforeunload", async function (e) {
    //     // e.preventDefault()
    //     // e.returnValue = ""
    //     await set(ref(db, `${roomId}/users/${userId}`), {})
    // })

    // subscribe to visibility change events
    document.addEventListener("visibilitychange", async function () {
        // fires when user switches tabs, apps, goes to homescreen, etc.
        if (document.visibilityState == "hidden") {
            function mobileCheck() {
                return window.innerWidth <= 700
            }
            const isMobile = mobileCheck()
            if (isMobile) {
                console.log("MOBILE!")
                await set(ref(db, `${roomId}/users/${userId}`), {})
            } else {
                window.addEventListener("beforeunload", async function (e) {
                    await set(ref(db, `${roomId}/users/${userId}`), {})
                })
            }
        }
        // fires when app transitions from prerender, user returns to the app / tab.
        if (document.visibilityState == "visible") {
            console.log("Visible")
        }
    })
}

var screenSharing = false
export function screenShare() {
    const screenButton = document.getElementById("shareScreen")
    let screenId = "screen"
    let screenStream = null
    screenButton.addEventListener("click", async (event) => {
        if (!screenSharing) {
            screenStream = await navigator.mediaDevices.getDisplayMedia({
                mediaOption,
            })
            await get(ref(db, `${roomId}/users`))
                .then((users) => {
                    if (!users.exists()) {
                        console.error("Something went wrong!")
                    } else {
                        for (var remoteUserId in users.val()) {
                            const remoteUser = users.val()[remoteUserId]
                            if (remoteUserId != screenId) {
                                createAnswer(
                                    screenStream,
                                    remoteUserId,
                                    screenId
                                )
                            }
                        }
                        createOffer(screenStream, screenId)
                    }
                })
                .catch((error) => {
                    console.error(error)
                })
            screenSharing = true
            screenButton.innerHTML =
                '<i class="material-icons">stop_screen_share</i>'
        } else {
            screenStream.getTracks().forEach((track) => track.stop())
            set(ref(db, `${roomId}/users/${screenId}`), {})
            screenSharing = false
            screenButton.innerHTML =
                '<i class="material-icons">screen_share</i>'
        }
    })
}

export { roomId, userId, userName, mediaOption }
