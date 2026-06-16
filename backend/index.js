import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const rooms = new Map();

const languageMap = {
  cpp: 54,
  java: 62,
  python: 71,
  javascript: 63,
};

io.on("connection", (socket) => {
  console.log("User Connected", socket.id);

  let currentRoom = null;
  let currentUser = null;

  socket.on("join", ({ roomId, userName }) => {
    if (currentRoom) {
      socket.leave(currentRoom);
      rooms.get(currentRoom)?.users?.delete(currentUser);
      io.to(currentRoom).emit(
        "userJoined",
        Array.from(rooms.get(currentRoom)?.users || [])
      );
    }

    currentRoom = roomId;
    currentUser = userName;

    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, { users: new Set(), code: "// start code here" });
    }

    rooms.get(roomId).users.add(userName);

    socket.emit("codeUpdate", rooms.get(roomId).code);

    io.to(roomId).emit("userJoined", Array.from(rooms.get(roomId).users));
  });

  socket.on("codeChange", ({ roomId, code }) => {
    if (rooms.has(roomId)) {
      rooms.get(roomId).code = code;
    }
    socket.to(roomId).emit("codeUpdate", code);
  });

  socket.on("leaveRoom", () => {
    if (currentRoom && currentUser) {
      rooms.get(currentRoom)?.users?.delete(currentUser);
      io.to(currentRoom).emit(
        "userJoined",
        Array.from(rooms.get(currentRoom)?.users || [])
      );
      socket.leave(currentRoom);

      currentRoom = null;
      currentUser = null;
    }
  });

  socket.on("typing", ({ roomId, userName }) => {
    socket.to(roomId).emit("userTyping", userName);
  });

  socket.on("languageChange", ({ roomId, language }) => {
    io.to(roomId).emit("languageUpdate", language);
  });

 socket.on(
  "compileCode",
  async ({ code, roomId, language, input }) => {
    try {
      const language_id = languageMap[language];

      const response = await axios.post(
        "https://judge0-ce.p.rapidapi.com/submissions",
        {
          source_code: code,
          language_id,
          stdin: input,
        },
        {
          params: {
            base64_encoded: "false",
            wait: "true",
          },
          headers: {
            "Content-Type": "application/json",
            "X-RapidAPI-Key": process.env.RAPID_API_KEY,
            "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
          },
        }
      );

      const output =
        response.data.stdout ||
        response.data.stderr ||
        response.data.compile_output ||
        "No Output";

      io.to(roomId).emit("codeResponse", {
        run: { output },
      });
    } catch (error) {
      io.to(roomId).emit("codeResponse", {
        run: {
          output:
            error.response?.data?.message ||
            error.message ||
            "Compilation failed",
        },
      });
    }
  }
);

  socket.on("disconnect", () => {
    if (currentRoom && currentUser) {
      rooms.get(currentRoom)?.users?.delete(currentUser);
      io.to(currentRoom).emit(
        "userJoined",
        Array.from(rooms.get(currentRoom)?.users || [])
      );
    }
    console.log("user Disconnected");
  });
});

// ======== Serve frontend for production ========
const port = process.env.PORT || 5000;
const __dirname = path.resolve();

app.use(express.static(path.join(__dirname, "../frontend/dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
});

server.listen(port, () => {
  console.log("server is working on port", port);
});
