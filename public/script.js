const socket = io("/")
const peerServerConfig = {
    secure: true,
    host: "da-chill-room-peer-server.herokuapp.com", // change here the herokuapp name
    port: 443,
}
const myPeer = new Peer(peerServerConfig)
const videoGrid = document.getElementById("video-grid")
const myVideo = document.createElement("video")
myVideo.muted = true
const peers = {}
const user = prompt("Enter your name")

function uuidV4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
        (
            c ^
            (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
        ).toString(16)
    )
}

let myVideoStream
var getUserMedia =
    navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia
getUserMedia(
    {
        video: true,
        audio: true,
    },
    function (stream) {
        myVideoStream = stream
        addVideoStream("yourself", myVideo, stream)

        myPeer.on("call", (call) => {
            call.answer(stream)

            const video = document.createElement("video")
            call.on("stream", (userVideoStream) => {
                addVideoStream(call.peer, video, userVideoStream)
                // This is on callee side, add caller (aka call.peer) as peer
                peers[call.peer] = call
            })

            /*
            TODO: PeerJS hasn't fix this problem yet, use socketIO disconnected
            event as a workaround instead
            */
            // call.on('close', () => {
            //     video.remove()
            // })
        })

        socket.on("user-connected", (userId) => {
            connectToNewUser(userId, stream)
        })
    },
    function (err) {
        console.log("Failed to get local stream", err)
    }
)

myPeer.on("open", (id) => {
    socket.emit("join-room", ROOM_ID, id, user)
})

socket.on("connect_error", (err) => {
    console.log(`connect_error due to ${err.message}`)
})

socket.on("user-disconnected", (userId) => {
    // Close call
    if (peers[userId]) peers[userId].close()

    // Close video
    const videos = videoGrid.getElementsByTagName("*")
    for (var i = 0; i < videos.length; i++) {
        var vid = videos[i]
        if (vid.getAttribute("callerId") == userId.toString()) {
            vid.remove()
            return
        }
    }
})

function connectToNewUser(userId, stream) {
    // Call user with $userId and our $stream
    const call = myPeer.call(userId, stream)
    const video = document.createElement("video")
    // When callee send back their stream
    call.on("stream", (userVideoStream) => {
        addVideoStream(call.peer, video, userVideoStream)
    })

    call.on("close", () => {
        video.remove()
    })
    peers[userId] = call
}

function addVideoStream(callerId, video, stream) {
    video.srcObject = stream
    video.addEventListener("loadedmetadata", () => {
        video.play()
    })
    video.setAttribute("callerId", callerId)

    if (callerId.substring(0, 6) != "screen") {
        // For User (non-screen)
        // Flip camera (not screen) for better UX
        video.classList.add("flip-camera")
    } else {
        // For Screen
        // Update object-fit for better UX
        video.style.objectFit = "fill"
    }
    videoGrid.append(video)
}

/////////////////// ------------ ///////////////////
/////////////////// Screen Share ///////////////////
/////////////////// ------------ ///////////////////

const screenButton = document.getElementById("shareScreen")
const videoElem = document.createElement("video")
videoElem.muted = true

/*
    screenId - is a random UUID start with 'screen-'
*/
let screenId = "screen-" + uuidV4().substring(6)
let myScreen = new Peer(screenId, peerServerConfig)
let screenSharing = false

screenButton.addEventListener(
    "click",
    (event) => {
        // If screen is NOT sharing, start to share
        if (!screenSharing) {
            navigator.mediaDevices
                .getDisplayMedia({
                    video: true,
                    audio: true,
                })
                .then((stream) => {
                    addVideoStream(screenId, videoElem, stream)
                    for (var user in peers) {
                        // Use screenPeer to Call other peers
                        const call = myScreen.call(user, stream)
                    }
                    // Set screenShare toggle and update icon
                    screenSharing = true
                    screenButton.innerHTML =
                        '<i class="material-icons">stop_screen_share</i>'
                }, false)
        } else {
            // If screen is sharing, STOP sharing

            // Remove screen in others screen
            // TODO: this is a workaround using SocketIO instead of
            // using close event of PeerJS
            socket.emit("screen-disconnected-event", screenId)

            if (!videoElem) return
            let tracks = videoElem.srcObject.getTracks()
            tracks.forEach((track) => track.stop())
            videoElem.srcObject = null
            videoElem.remove()
            // Set screenShare toggle and update icon
            screenSharing = false
            screenButton.innerHTML =
                '<i class="material-icons">screen_share</i>'
        }
    },
    false
)

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

// On-off mic
const muteButton = document.querySelector("#muteButton")
muteButton.addEventListener("click", () => {
    let enabled = myVideoStream.getAudioTracks()[0].enabled
    if (enabled) {
        myVideoStream.getAudioTracks()[0].enabled = false
        html = `<i class="fas fa-microphone-slash"></i>`
        muteButton.classList.toggle("background__red")
        muteButton.innerHTML = html
    } else {
        myVideoStream.getAudioTracks()[0].enabled = true
        html = `<i class="fas fa-microphone"></i>`
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
        html = `<i class="fas fa-video-slash"></i>`
        stopVideo.classList.toggle("background__red")
        stopVideo.innerHTML = html
    } else {
        myVideoStream.getVideoTracks()[0].enabled = true
        html = `<i class="fas fa-video"></i>`
        stopVideo.classList.toggle("background__red")
        stopVideo.innerHTML = html
    }
})

// Invite button
const inviteButton = document.querySelector("#inviteButton")
inviteButton.addEventListener("click", (e) => {
    prompt("Share this link with your friends", window.location.href)
})

// Start Resizer between video and chat bar
const resizer = document.getElementById("dragMe")
const leftSide = resizer.previousElementSibling
const rightSide = resizer.nextElementSibling

// The current position of mouse
let x = 0
let y = 0

// Width of left side
let leftWidth = 0

// Handle the mousedown event
// that's triggered when user drags the resizer
const mouseDownHandler = function (e) {
    // Get the current mouse position
    x = e.clientX
    y = e.clientY
    leftWidth = leftSide.getBoundingClientRect().width

    // Attach the listeners to `document`
    document.addEventListener("mousemove", mouseMoveHandler)
    document.addEventListener("mouseup", mouseUpHandler)
}

const mouseMoveHandler = function (e) {
    // How far the mouse has been moved
    const dx = e.clientX - x
    const dy = e.clientY - y

    const newLeftWidth =
        ((leftWidth + dx) * 100) /
        resizer.parentNode.getBoundingClientRect().width
    leftSide.style.width = `${newLeftWidth}%`

    document.body.style.cursor = "col-resize"
    leftSide.style.userSelect = "none"
    leftSide.style.pointerEvents = "none"

    rightSide.style.userSelect = "none"
    rightSide.style.pointerEvents = "none"
}

const mouseUpHandler = function () {
    resizer.style.removeProperty("cursor")
    document.body.style.removeProperty("cursor")

    leftSide.style.removeProperty("user-select")
    leftSide.style.removeProperty("pointer-events")

    rightSide.style.removeProperty("user-select")
    rightSide.style.removeProperty("pointer-events")

    // Remove the handlers of `mousemove` and `mouseup`
    document.removeEventListener("mousemove", mouseMoveHandler)
    document.removeEventListener("mouseup", mouseUpHandler)
}

// Attach the handler
resizer.addEventListener("mousedown", mouseDownHandler)

// End resizer

/////////////////// -------- ///////////////////////
/////////////////// Message ///////////////////////
/////////////////// ------- //////////////////////

let text = document.querySelector("#chat_message")
let send = document.getElementById("send")
let messages = document.querySelector(".messages")

send.addEventListener("click", (e) => {
    if (text.value.length !== 0) {
        socket.emit("message", text.value)
        text.value = ""
    }
})

text.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && text.value.length !== 0) {
        socket.emit("message", text.value)
        text.value = ""
    }
})

socket.on("createMessage", (message, userName) => {
    messages.innerHTML =
        messages.innerHTML +
        `<div class="message">
            <b> 
                <i class="far fa-user-circle"></i>
                <span> ${userName === user ? "me" : userName}</span>
            </b>
            <span>${message}</span>
        </div>`

    // Scroll to newest message
    let scroller = document.querySelector(".main__chat_window")
    scroller.scrollTop = scroller.scrollHeight
})