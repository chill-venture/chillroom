import {
    peerConnection,
    peerDisconnect,
    roomId,
    userId,
} from "./initializer.js"
peerConnection()
peerDisconnect()

// const screenButton = document.getElementById("shareScreen")
// const videoElem = document.createElement("video")
// videoElem.muted = true
// let screenId = "screen"
// let screenSharing = false

// screenButton.addEventListener("click", (event) => {
//     if (!screenSharing) {
//         navigator.mediaDevices
//             .getDisplayMedia({
//                 mediaOption,
//             })
//             .then((stream) => {})
//     } else {
//     }
// })

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
