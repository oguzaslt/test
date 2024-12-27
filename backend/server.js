// Server-side code (server.js)

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("join_room", ({ roomName, username }) => {
    socket.join(roomName);
    socket.username = username;
    console.log(`User ${socket.id} (${username}) joined  ${roomName}`);
  });  

  socket.on("send_message", ({ roomName, username, message}) => {
    io.to(roomName).emit("receive_message", { username, message });
  });

  socket.on("disconnect", ({username}) => {
    console.log(`User disconnected: ${socket.id}, Username: ${socket.username}`);
  });
});

server.listen(3000, ()=> {
  console.log("Server is running on port 3000");
});
