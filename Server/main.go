package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

type Room struct {
	name      string
	clients   map[*websocket.Conn]bool
	broadcast chan Message
}

var rooms = make(map[string]*Room)
var mutex = &sync.Mutex{}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type Message struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

func main() {
	r := mux.NewRouter()
	router(r)

	log.Println("WebSocket server started on :8080")
	log.Fatal(http.ListenAndServe(":8080",
		handlers.CORS(
			handlers.AllowedOrigins([]string{"*"}),
			handlers.AllowedMethods([]string{"POST", "OPTIONS", "GET", "DELETE", "PUT"}),
			handlers.AllowedHeaders([]string{"Content-Type"}),
		)(r)))
}

func router(r *mux.Router) {
	r.HandleFunc("/create", handleRoomCreation).Methods("GET")
	r.HandleFunc("/getroominfo", handleGetRoomInfo).Methods("GET")
	r.HandleFunc("/join", handleJoinRoom).Methods("GET")
	r.HandleFunc("/ws", handleRoomConnection)
}

func handleGetRoomInfo(w http.ResponseWriter, r *http.Request) {
	roomCode := r.URL.Query().Get("roomCode")
	mutex.Lock()
	room, exists := rooms[roomCode]
	mutex.Unlock()
	if exists {
		response := make(map[string]string)
		response["name"] = room.name
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		fmt.Println("handleGetRoomInfo Exrecuted.")
		fmt.Println(response)
	} else {
		response := make(map[string]string)
		response["name"] = "nothing"
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		fmt.Println("handleGetRoomInfo Exrecuted.")
		fmt.Println(response)
	}
}

// handleRoomCreation creates a new room with a unique code and name
func handleRoomCreation(w http.ResponseWriter, r *http.Request) {
	roomName := r.URL.Query().Get("roomName")
	// var request struct {
	// 	Name string `json:"name"`
	// }
	// err := json.NewDecoder(r.Body).Decode(&request)
	// if err != nil || request.Name == "" {
	// 	http.Error(w, "Room name required", http.StatusBadRequest)
	// 	return
	// }

	roomCode := generateRoomCode()
	mutex.Lock()
	rooms[roomCode] = &Room{
		name:      roomName,
		clients:   make(map[*websocket.Conn]bool),
		broadcast: make(chan Message),
	}
	mutex.Unlock()
	go handleRoomMessages(roomCode)

	// var response struct{ code string }
	// response.code = roomCode
	response := make(map[string]string)
	response["code"] = roomCode
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
	fmt.Println("handleRoomCreation executed.")
	fmt.Println(response)
}

// handleJoinRoom checks if a room exists and returns its name if valid
func handleJoinRoom(w http.ResponseWriter, r *http.Request) {
	roomCode := r.URL.Query().Get("code")
	mutex.Lock()
	room, exists := rooms[roomCode]
	mutex.Unlock()

	if exists {
		response := map[string]string{"name": room.name}
		json.NewEncoder(w).Encode(response)
	} else {
		http.Error(w, "Invalid room code", http.StatusNotFound)
	}
}

// handleConnections manages WebSocket connections for each room
func handleRoomConnection(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Fatalf("Error upgrading connection: %v", err)
	}
	defer ws.Close()

	roomCode := r.URL.Query().Get("room")
	mutex.Lock()
	room, exists := rooms[roomCode]
	mutex.Unlock()

	if !exists {
		ws.WriteMessage(websocket.TextMessage, []byte("Room does not exist"))
		return
	}

	room.clients[ws] = true
	fmt.Println("handleRoomConnection executed.")
	for {
		fmt.Println("Message Received.")
		var msg Message
		err := ws.ReadJSON(&msg)
		if err != nil {
			mutex.Lock()
			delete(room.clients, ws)
			mutex.Unlock()
			break
		}
		room.broadcast <- msg
	}
}

// handleRoomMessages broadcasts messages to all clients in a room
func handleRoomMessages(roomCode string) {
	room := rooms[roomCode]
	for {
		msg := <-room.broadcast
		mutex.Lock()
		for client := range room.clients {
			err := client.WriteJSON(msg)
			if err != nil {
				client.Close()
				delete(room.clients, client)
			}
		}
		mutex.Unlock()
	}
}

// Function to generate new random room code.
func generateRoomCode() string {
	rand.New(rand.NewSource(time.Now().UnixNano()))
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, 6)
	for i := range b {
		b[i] = charset[rand.Intn(len(charset))]
	}
	fmt.Println("Room Code Generated: ", string(b))
	return string(b)
}
