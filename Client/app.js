// // Index Page
// function myFunction() {
//   window.location.href = "start.html";
// }


// Play page

let socket;
let PlayerRoomCode;
let currentRoom = null;
const canvas = document.querySelector("canvas")
let ctx = null;

// let drawing = false;
// let color = document.getElementById("colorPicker").value;
// let brushSize = document.getElementById("brushSize").value;

// document.getElementById("colorPicker").addEventListener("change", (e) => color = e.target.value);
// document.getElementById("brushSize").addEventListener("input", (e) => brushSize = e.target.value);

function enterRoom() {
  document.getElementById("page2").style.display = "none";
  document.getElementById("canvasRoom").style.display = "block";
  // document.getElementById("errorMessage").textContent = "";
  ctx = canvas.getContext("2d");
}

function showCreateRoomForm() {
  document.getElementById("createRoomForm").style.display = "block";
  document.getElementById("joinRoomForm").style.display = "none";
  document.getElementById("errorMessage").textContent = ""
}

function showJoinRoomForm() {
  document.getElementById("createRoomForm").style.display = "none";
  document.getElementById("joinRoomForm").style.display = "block";
  document.getElementById("errorMessage").textContent = "";
}

function showRoomInfo() {
  document.getElementById("page1").style.display = "none";
  document.getElementById("page2").style.display = "block";
  document.getElementById("roomInfo").textContent = `Room Name: ${currentRoom.name}, Code: ${currentRoom.code}`;
}

// function enterRoom() {
//   document.getElementById("page2").style.display = "none";
//   document.getElementById("page3").style.display = "block";
//   document.getElementById("roomNameDisplay").textContent = `Room: ${currentRoom.name}`;
// }

function updateNavbar() {
  const roomCodeDisplay = document.getElementById("roomCodeDisplay");
  const leaveRoomBtn = document.getElementById("leaveRoomBtn");

  if (!currentRoom) {
    roomCodeDisplay.textContent = "xx-xx-xx";
    leaveRoomBtn.style.display = "none";
  } else {
    roomCodeDisplay.textContent = currentRoom.code;
    leaveRoomBtn.style.display = "inline-block";
  }
}

async function createRoom(event) {
  event.preventDefault()
  roomName = document.getElementById("createRoomName").value;
  if (!roomName) {
    document.getElementById("roomNameError").style.display = "block";
    return;
  }
  if(window["WebSocket"]) {
    console.log("Supports Websockets");
    // socket = new WebSocket("ws://localhost:8080/ws");
  }
  const response = await fetch(`http://localhost:8080/create?roomName=${roomName}`,{
    method: "GET",
    mode: 'cors'
  })
  .then(response => {
    if (!response.ok){
      throw new Error('Network response was not ok');
    }
    console.log(response);
    return response.json();
  })
  .catch(error => {
    console.error('Error:', error);
  });
  PlayerRoomCode = response.code;
  console.log("Room Code Generated: " + PlayerRoomCode);
  currentRoom = {
    name: roomName,
    code: PlayerRoomCode,
  }

  updateNavbar();
  showRoomInfo();
  // document.getElementById("roomCodeDisplay").textContent = `Room Code: ${response.code}`;
}

async function joinRoomWithCreatedCode(event) {
  event.preventDefault()
  const roomCode = document.getElementById("joinRoomCode").value;
  if (!roomCode) {
    alert("Please enter a room code.");
    return;
  }
  const response = await fetch(`http://localhost:8080/getroominfo?roomCode=${roomCode}`,{
    method: "GET",
  })
  .then(response => {
    if (!response.ok){
      throw new Error('Network response was not ok');
    }
    console.log(response);
    return response.json();
  })
  currentRoom = {
    name: response.name,
    code: roomCode,
  }
  updateNavbar()
  showRoomInfo()
}

async function joinRoom() {
  try {
    const response = await fetch(`http://localhost:8080/join?code=${PlayerRoomCode}`);
    if (!response.ok) throw new Error("Room not found");

    const data = await response.json();
    // document.getElementById("roomNameDisplay").textContent = `Room Name: ${data.name}`;
    connectWebSocket(PlayerRoomCode);
  } catch (error) {
    alert(error.message);
  }
  enterRoom()
}

function connectWebSocket(roomCode) {
  socket = new WebSocket(`ws://localhost:8080/ws?room=${roomCode}`);
  // Adding a listener to teh onmessage event
  socket.onmessage = handleSocketMessage;
}

// Function to print the message sent from the event on each client's frontend
function handleSocketMessage(message) {
  const { type, data } = JSON.parse(message.data);

  if (type === "draw") {
    const { x, y, color, brushSize } = data;
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineTo(x, y);
    ctx.stroke();
  } else if (type === "clear") {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

// canvas.addEventListener("mousedown", startDrawing);
// canvas.addEventListener("mousemove", draw);
// canvas.addEventListener("mouseup", stopDrawing);
// canvas.addEventListener("mouseout", stopDrawing);

// function startDrawing(event) {
//   drawing = true;
//   const { x, y } = getMousePos(event);
//   ctx.beginPath();
//   ctx.moveTo(x, y);
// }

// function draw(event) {
//   if (!drawing) return;

//   const { x, y } = getMousePos(event);
//   ctx.lineTo(x, y);
//   ctx.strokeStyle = color;
//   ctx.lineWidth = brushSize;
//   ctx.lineCap = "round";
//   ctx.stroke();

//   const drawData = { x, y, color, brushSize };
//   socket.send(JSON.stringify({ type: "draw", data: drawData }));
// }

// function stopDrawing() {
//   drawing = false;
//   ctx.closePath();
// }

// function getMousePos(event) {
//   const rect = canvas.getBoundingClientRect();
//   return {
//     x: event.clientX - rect.left,
//     y: event.clientY - rect.top,
//   };
// }

// set up all the global variables

// const canvas = document.querySelector("canvas"),
const toolBtns = document.querySelectorAll(".tool"),
fillColor = document.querySelector("#fill-color"),
sizeSlider = document.querySelector("#size-slider"),
colorBtns = document.querySelectorAll(".colors .option"),
colorPicker = document.querySelector("#color-picker"),
clearCanvas = document.querySelector(".clear-canvas"),
saveImg = document.querySelector(".save-img");
// ctx = canvas.getContext("2d");

// global variables with default value
let prevMouseX, prevMouseY, snapshot,
isDrawing = false,
selectedTool = "brush",
brushWidth = 5,
selectedColor = "#000";

const setCanvasBackground = () => {
    // setting whole canvas background to white, so the downloaded img background will be white
    if(ctx) ctx.fillStyle = "#fff";
    if(ctx) ctx.fillRect(0, 0, canvas.width, canvas.height);
    if(ctx) ctx.fillStyle = selectedColor; // setting fillstyle back to the selectedColor, it'll be the brush color
}

window.addEventListener("load", () => {
    // setting canvas width/height.. offsetwidth/height returns viewable width/height of an element
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    setCanvasBackground();
});

const drawRect = (e) => {
    // if fillColor isn't checked draw a rect with border else draw rect with background
    if(!fillColor.checked) {
        // creating circle according to the mouse pointer
        return ctx.strokeRect(e.offsetX, e.offsetY, prevMouseX - e.offsetX, prevMouseY - e.offsetY);
    }
    ctx.fillRect(e.offsetX, e.offsetY, prevMouseX - e.offsetX, prevMouseY - e.offsetY);
}

const drawCircle = (e) => {
  if(ctx) ctx.beginPath(); // creating new path to draw circle
    // getting radius for circle according to the mouse pointer
    let radius = Math.sqrt(Math.pow((prevMouseX - e.offsetX), 2) + Math.pow((prevMouseY - e.offsetY), 2));
    if(ctx) ctx.arc(prevMouseX, prevMouseY, radius, 0, 2 * Math.PI); // creating circle according to the mouse pointer
    if(ctx) fillColor.checked ? ctx.fill() : ctx.stroke(); // if fillColor is checked fill circle else draw border circle
}

const drawTriangle = (e) => {
  if(ctx) ctx.beginPath(); // creating new path to draw circle
  if(ctx) ctx.moveTo(prevMouseX, prevMouseY); // moving triangle to the mouse pointer
  if(ctx) ctx.lineTo(e.offsetX, e.offsetY); // creating first line according to the mouse pointer
  if(ctx) ctx.lineTo(prevMouseX * 2 - e.offsetX, e.offsetY); // creating bottom line of triangle
  if(ctx) ctx.closePath(); // closing path of a triangle so the third line draw automatically
  if(ctx) fillColor.checked ? ctx.fill() : ctx.stroke(); // if fillColor is checked fill triangle else draw border
}

const startDraw = (e) => {
    isDrawing = true;
    prevMouseX = e.offsetX; // passing current mouseX position as prevMouseX value
    prevMouseY = e.offsetY; // passing current mouseY position as prevMouseY value
    if(ctx) ctx.beginPath(); // creating new path to draw
    if(ctx) ctx.lineWidth = brushWidth; // passing brushSize as line width
    if(ctx) ctx.strokeStyle = selectedColor; // passing selectedColor as stroke style
    if(ctx) ctx.fillStyle = selectedColor; // passing selectedColor as fill style
    // copying canvas data & passing as snapshot value.. this avoids dragging the image
    if(ctx) snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
}

const drawing = (e) => {
    if(!isDrawing) return; // if isDrawing is false return from here
    if(ctx) ctx.putImageData(snapshot, 0, 0); // adding copied canvas data on to this canvas

    if(selectedTool === "brush" || selectedTool === "eraser") {
        // if selected tool is eraser then set strokeStyle to white 
        // to paint white color on to the existing canvas content else set the stroke color to selected color
        if(ctx) ctx.strokeStyle = selectedTool === "eraser" ? "#fff" : selectedColor;
        if(ctx) ctx.lineTo(e.offsetX, e.offsetY); // creating line according to the mouse pointer
        if(ctx) ctx.stroke(); // drawing/filling line with color
    } else if(selectedTool === "rectangle"){
        drawRect(e);
    } else if(selectedTool === "circle"){
        drawCircle(e);
    } else {
        drawTriangle(e);
    }
}

toolBtns.forEach(btn => {
    btn.addEventListener("click", () => { // adding click event to all tool option
        // removing active class from the previous option and adding on current clicked option
        document.querySelector(".options .active").classList.remove("active");
        btn.classList.add("active");
        selectedTool = btn.id;
    });
});

sizeSlider.addEventListener("change", () => brushWidth = sizeSlider.value); // passing slider value as brushSize

colorBtns.forEach(btn => {
    btn.addEventListener("click", () => { // adding click event to all color button
        // removing selected class from the previous option and adding on current clicked option
        document.querySelector(".options .selected").classList.remove("selected");
        btn.classList.add("selected");
        // passing selected btn background color as selectedColor value
        selectedColor = window.getComputedStyle(btn).getPropertyValue("background-color");
    });
});

colorPicker.addEventListener("change", () => {
    // passing picked color value from color picker to last color btn background
    colorPicker.parentElement.style.background = colorPicker.value;
    colorPicker.parentElement.click();
});

clearCanvas.addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // clearing whole canvas
    setCanvasBackground();
});

saveImg.addEventListener("click", () => {
    const link = document.createElement("a"); // creating <a> element
    link.download = `${Date.now()}.jpg`; // passing current date as link download value
    link.href = canvas.toDataURL(); // passing canvasData as link href value
    link.click(); // clicking link to download image
});

canvas.addEventListener("mousedown", startDraw);
canvas.addEventListener("mousemove", drawing);
canvas.addEventListener("mouseup", () => isDrawing = false);