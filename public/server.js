// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app"
import { getAnalytics } from "firebase/analytics"
import {
    connectDatabaseEmulator,
    getDatabase,
    ref,
    set,
    push,
    get,
    onChildAdded,
} from "firebase/database"

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

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
const analytics = getAnalytics(app)
const db = getDatabase(app)
// connectDatabaseEmulator(db, "localhost", 9000)

export const userName = prompt("What's your name?")

const urlparams = new URLSearchParams(window.location.search)
let roomId = urlparams.get("id")

let firebaseRef
if (roomId) {
    firebaseRef = ref(db, roomId)
} else {
    firebaseRef = await push(ref(db))
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

const videoGrid = document.getElementById("video-grid")
const myVideo = document.createElement("video")

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

// 2. Create offer to the rest of the rooms
async function createOffer() {
    const pc = new RTCPeerConnection(servers)
    const video = document.createElement("video")
    let localStream = await navigator.mediaDevices.getUserMedia(mediaOption)
    let remoteStream = new MediaStream()
    localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream)
    })
    pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track)
        })
    }

    const offerRef = ref(db, `${roomId}/users/${userId}/offer`)
    const answerRef = ref(db, `${roomId}/users/${userId}/answer`)

    const iceOfferRef = ref(db, `${roomId}/users/${userId}/iceOffer`)
    const iceAnswerRef = ref(db, `${roomId}/users/${userId}/iceAnswer`)

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
    pc.addEventListener("connectionstatechange", (event) => {
        if (pc.connectionState === "connected") {
            console.log("Peers connected")

            // Add local video
            if (!myVideo.srcObject) {
                myVideo.srcObject = localStream
                myVideo.muted = true
                myVideo.addEventListener("loadedmetadata", () => {
                    myVideo.play()
                })
                videoGrid.append(myVideo)

                audioAndVideoButtons(localStream)
            }
            // Add remote video
            video.srcObject = remoteStream
            video.addEventListener("loadedmetadata", () => {
                video.play()
            })
            videoGrid.append(video)

            // Remove info about last connection: offer, asnwer,
            // iceOffer, iceAnswer
            set(offerRef, {})
            set(answerRef, {})

            set(iceOfferRef, {})
            set(iceAnswerRef, {})

            // Create offer for new connection
            createOffer()
        }
    })
    pc.oniceconnectionstatechange = function () {
        if (pc.iceConnectionState == "disconnected") {
            console.log("Disconnected")
            video.remove()
        }
    }

    await set(offerRef, { offer })

    onChildAdded(answerRef, async (snapshot) => {
        const answer = snapshot.val()
        if (answer) {
            const answerDescription = new RTCSessionDescription(answer)
            await pc.setRemoteDescription(answerDescription)
        }
    })

    onChildAdded(iceAnswerRef, async (data) => {
        const candidate = new RTCIceCandidate(data.val())
        if (candidate) {
            pc.addIceCandidate(candidate)
        }
    })
}

// 3. Create answer
async function createAnswer(callerId, calleeId) {
    const pc = new RTCPeerConnection(servers)
    let localStream = await navigator.mediaDevices.getUserMedia(mediaOption)
    const video = document.createElement("video")
    let remoteStream = new MediaStream()
    localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream)
    })
    pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track)
        })
    }
    pc.addEventListener("connectionstatechange", (event) => {
        if (pc.connectionState === "connected") {
            console.log("Peers connected")

            if (!myVideo.srcObject) {
                myVideo.srcObject = localStream
                myVideo.muted = true
                myVideo.addEventListener("loadedmetadata", () => {
                    myVideo.play()
                })
                videoGrid.append(myVideo)

                audioAndVideoButtons(localStream)
            }

            video.srcObject = remoteStream
            video.addEventListener("loadedmetadata", () => {
                video.play()
            })
            videoGrid.append(video)
        }
    })
    pc.oniceconnectionstatechange = function () {
        if (pc.iceConnectionState == "disconnected") {
            console.log("Disconnected")
            video.remove()

            // Remove disconnected user in DB
            set(ref(db, `${roomId}/users/${callerId}`), {})
        }
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
}

// Joinging a room
// Function: sending answer to the rest of the room
await get(ref(db, `${roomId}/users`))
    .then((users) => {
        if (!users.exists()) {
            console.error("Something went wrong!")
        } else {
            for (var remoteUserId in users.val()) {
                const remoteUser = users.val()[remoteUserId]
                if (remoteUserId != userId) {
                    createAnswer(remoteUserId, userId)
                }
            }
            createOffer()
        }
    })
    .catch((error) => {
        console.error(error)
    })

window.addEventListener("beforeunload", async function (e) {
    e.preventDefault()
    e.returnValue = ""
    await set(ref(db, `${roomId}/users/${userId}`), {})
})

/////////////////// ----------------- ///////////////////////
/////////////////// Clickable buttons //////////////////////
/////////////////// ----------------- /////////////////////

// Mobile Feature
// Show chat
const showChat = document.querySelector("#showChat")
const backBtn = document.querySelector(".header__back")
backBtn.addEventListener("click", () => {
    document.querySelector(".main__left").style.display = "flex"
    document.querySelector(".main__left").style.flex = "1"
    document.querySelector(".main__right").style.display = "none"
    document.querySelector(".header__back").style.display = "none"
})

showChat.addEventListener("click", () => {
    document.querySelector(".main__right").style.display = "flex"
    document.querySelector(".main__right").style.flex = "1"
    document.querySelector(".main__left").style.display = "none"
    document.querySelector(".header__back").style.display = "block"
})
// End Mobile Feature

// On-off audio-video
function audioAndVideoButtons(stream) {
    // On-off mic
    let myVideoStream = stream
    const muteButton = document.querySelector("#muteButton")
    muteButton.addEventListener("click", () => {
        let enabled = myVideoStream.getAudioTracks()[0].enabled
        if (!enabled) {
            myVideoStream.getAudioTracks()[0].enabled = true
            let html = `<i class="fas fa-microphone-slash"></i>`
            muteButton.classList.toggle("background__red")
            muteButton.innerHTML = html
        } else {
            myVideoStream.getAudioTracks()[0].enabled = false
            let html = `<i class="fas fa-microphone"></i>`
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
            let html = `<i class="fas fa-video"></i>`
            stopVideo.classList.toggle("background__red")
            stopVideo.innerHTML = html
        }
    })
}

// Invite feature
const inviteButton = document.querySelector("#inviteButton")
inviteButton.addEventListener("click", (e) => {
    prompt("Share this link with your friends", window.location.href)
})

// Resizer feature
import { resizer } from "./resizer.js"
resizer()

/////////////////// -------- ///////////////////////
/////////////////// Shortcut //////////////////////
/////////////////// -------- /////////////////////
//  For better UI  \\

/* 
    "/" to chat 
*/
document.onkeyup = (keyUpEvent) => {
    if (keyUpEvent.key == "/") text.focus()
}
