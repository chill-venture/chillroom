# [the-chill-room](https://da-chill-room.herokuapp.com)

This project is created based on the curiosity as well as concern of a young engineer about the monetization of current world. Intend to create a communication platform that protects privacy for our users.

## Introduction

The-chill-room is a zoom-like app that provides the high-quality, real-time video communication. Some of the features include:
- Multi-party audio and video conferencing
- Screen sharing with high quality audio
- In-call messaging feature
- Invitation
- ... shipping more

We **deployed** on Heroku so you can enjoy it

- Make your **digital life** better [here](https://chillroom.live/) :metal::sunglasses:🎉
- Don't forget to share it with your friends

## Install and Run on local environment
1. Clone this project
2. Run ```npm ci``` to install all dependencies
3. Run ```npm run dev_start``` to start with dev mode
4. Go to **localhost:8000** to enjoy!

## Contribution guide

### Peer-to-peer in a server-client world
This application is built upon two main libraries [SocketIO](https://github.com/socketio/socket.io) and [PeerJS](https://github.com/peers/peerjs). PeerJS is served as peer-to-peer communication and socketIO is served as signaling server (at the current time, socketIO also servers messaging feature).

- PeerJS provides a complete, configurable and easy-to-use API build on top of WebRTC, supporting both data chanenels and media streams.
- Socket.IO enables real-time bidirectional event-based communication.

Check out [this contribution guide](docs/README.md) for more information.

## Credits
Inspired by Zoom and thanks to [WebDevSimplied](https://github.com/WebDevSimplified) for great resources.
