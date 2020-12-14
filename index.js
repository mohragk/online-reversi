const UUID = require('uuid');
const Game = require('./game.js')

const express = require('express')
const app = express()

const PORT = process.env.PORT || 3000

const server = app.listen(PORT, () => {
    console.log(`Listening on port: ${PORT}`)
})
app.use(express.static('public'));


let users = {}
let allClients = {}
let game_count = 0
let runningGames = {}

const ROOM_TYPES = {
    waiting: "waiting_room",
    game: "game_room_"
}


const socket = require('socket.io')
const io = socket(server)

io.sockets.on('connection', (socket) => {
    
    socket.emit('waiting', 'we are readying server');

    
    socket.join(ROOM_TYPES.waiting);

    // Keep a list of all clients
    allClients[socket.id] = socket

    // Add to connecters users
    users[socket.id] = {
        player_side: null,
        game_id: null
    }    

    socket.on('disconnect', () => {
        leaveGame(socket)
        delete users[socket.id]
        delete allClients[socket.id]
        console.log(users)
        console.log(runningGames)
    } )

    socket.on('leave', () => {
        console.log(`Elvis has left the building`)
    })

    createGameSessionForWaiting()
    console.log(users)
    console.log(runningGames)
})

function createGameSessionForWaiting() {
    const room_clients = getClientsForRoom(ROOM_TYPES.waiting)

    if (room_clients.length >= 2) {
       
        const game_uuid = UUID.v4();
        addPlayerToGame( room_clients, 0, game_uuid)        
        addPlayerToGame( room_clients, 1, game_uuid)
        game_count++
        
        const game = new Game(game_uuid)
        runningGames[game_uuid] = game    
    }
    
}

function addPlayerToGame(clients, player_number, game_id) {
    clients[player_number].leave(ROOM_TYPES.waiting)
    const game_room_name = ROOM_TYPES.game+game_id
    clients[player_number].join(game_room_name)

    const player_socket_id = clients[player_number].id
    users[player_socket_id].player_side = player_number
    users[player_socket_id].game_id = game_id

    console.log(`Adding player to game(${game_id}) with id: ${player_socket_id}`)
}
    
function leaveGame(socket) {
    if (users[socket.id].game_id !== null) {
        const game_room_name = `${ROOM_TYPES.game}${users[socket.id].game_id}`

        console.log(`Removing player from game room(${game_room_name}) with id: ${socket.id}`)
        socket.leave(game_room_name)
        
        users[socket.id].player_side = null
        users[socket.id].game_id     = null

         // there is no point in keeping a game and game_room running.
        // so, check if there are others and remove them from game/game_room
        let players = getClientsForRoom(game_room_name);
        let other_socket = players.filter((player) => {
            return player.id !== socket.id
        })[0];

        //console.logger.log(other.id, ' != ', socket.id);
        if (other_socket) {
            const game_id = users[other_socket.id].game_id
            delete runningGames[ game_id ] 

            leaveGame(other_socket);
            other_socket.join(ROOM_TYPES.waiting)
        }
    }
}



function getClientsForRoom(room) {
    var clients = []
    const rooms_map = io.sockets.adapter.rooms
    const room_clients = rooms_map.get(room)
    if (typeof room_clients !== 'undefined') {
        room_clients.forEach(client_id => {
            clients.push(allClients[client_id])
        });
    }

    return clients;
}