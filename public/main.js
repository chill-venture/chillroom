// import firebase from "firebase/app"
import * as firebase from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js"
// import "firebase/firestore"
import {
    connectFirestoreEmulator,
    getFirestore,
    collection,
    addDoc,
    getDoc,
    doc,
    setDoc,
    updateDoc,
    onSnapshot,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js"

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

const app = await firebase.initializeApp(firebaseConfig)
const firestore = await getFirestore(app)
connectFirestoreEmulator(firestore, "localhost", 8080)

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

// Global State
const pc = new RTCPeerConnection(servers)
let localStream = null
let remoteStream = null

// HTML elements
const webcamButton = document.getElementById("webcamButton")
const webcamVideo = document.getElementById("webcamVideo")
const callButton = document.getElementById("callButton")
const callInput = document.getElementById("callInput")
const answerButton = document.getElementById("answerButton")
const remoteVideo = document.getElementById("remoteVideo")
const hangupButton = document.getElementById("hangupButton")

// 1. Setup media sources
localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
})
remoteStream = new MediaStream()

// Push tracks from local stream to peer connection
localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream)
})

// Pull tracks from remote stream, add to video stream
pc.ontrack = (event) => {
    console.log(event.streams)
    event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track)
    })
}

webcamVideo.srcObject = localStream
webcamVideo.muted = true
remoteVideo.srcObject = remoteStream

callButton.disabled = false
answerButton.disabled = false
webcamButton.disabled = true

// 2. Create an offer
callButton.onclick = async function () {
    // Reference Firestore collections for signaling
    const callDoc = doc(collection(firestore, "calls"))
    const offerCandidates = await collection(callDoc, "offerCandidates")
    // await addDoc(offerCandidates, {})
    const answerCandidates = await collection(callDoc, "answerCandidates")
    // await addDoc(answerCandidates, {})
    callInput.value = callDoc.id

    // Get candidates for caller, save to db
    pc.onicecandidate = (event) => {
        event.candidate && addDoc(offerCandidates, event.candidate.toJSON())
    }

    // Create offer
    const offerDescription = await pc.createOffer()
    await pc.setLocalDescription(offerDescription)
    const offer = {
        sdp: offerDescription.sdp,
        type: offerDescription.type,
    }

    await setDoc(callDoc, { offer })

    // Listen for remote answer
    onSnapshot(doc(firestore, "calls", callDoc.id), (snapshot) => {
        const data = snapshot.data()
        if (!pc.currentRemoteDescription && data?.answer) {
            const answerDescription = new RTCSessionDescription(data.answer)
            pc.setRemoteDescription(answerDescription)
        }
    })

    // When answered, add candidate to peer connection
    onSnapshot(answerCandidates, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const candidate = new RTCIceCandidate(change.doc.data())
                pc.addIceCandidate(candidate)
            }
        })
    })

    hangupButton.disabled = false
}

// 3. Answer the call with the unique ID
answerButton.onclick = async function () {
    const callId = callInput.value
    const callDoc = doc(firestore, "calls", callId)
    const answerCandidates = await collection(callDoc, "answerCandidates")
    const offerCandidates = await collection(callDoc, "offerCandidates")

    pc.onicecandidate = (event) => {
        event.candidate && addDoc(answerCandidates, event.candidate.toJSON())
    }

    const callData = (await getDoc(doc(firestore, "calls", callId))).data()

    const offerDescription = callData.offer
    await pc.setRemoteDescription(new RTCSessionDescription(offerDescription))

    const answerDescription = await pc.createAnswer()
    await pc.setLocalDescription(answerDescription)

    const answer = {
        type: answerDescription.type,
        sdp: answerDescription.sdp,
    }

    await updateDoc(doc(firestore, "calls", callId), { answer })

    onSnapshot(offerCandidates, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                let data = change.doc.data()
                pc.addIceCandidate(new RTCIceCandidate(data))
            }
        })
    })
}
