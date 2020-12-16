const UUID = require('uuid');
const Game = require('./game.js')
const CELL_TYPES = require('./public/cell_types')

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
    } )


    socket.on('request_update', () => {
        const game_id = users[socket.id].game_id
        const game = runningGames[game_id]
        if (game) {
            socket.emit('game_update', game)
        }
        else {
            socket.emit('game_ended', 'The game ended')
        }
    } )

   

    socket.on('add_or_flip_coin', (player_data) => {
        const game_id = users[socket.id].game_id
        if (game_id) {
            runningGames[game_id].addOrFlipCoin(player_data.pos, player_data.player_number)
            socket.emit('game_update',  runningGames[game_id])
        }
    })

    socket.on('remove_coin', (player_data) => {
        const game = getGameFromSocketId(users, socket.id)
        if (game) {
            game.removeCoin(player_data.pos, player_data.player_number)
            socket.emit('game_update', game)
        }
    })

    socket.on('switch_to_other_player', from_player_number => {
        let other_player_number = from_player_number == 1 ? 2 : 1
        const game_id = users[socket.id].game_id
        if (game_id) {
            runningGames[game_id].setPlayerNumber(other_player_number)
            socket.emit('game_update',  runningGames[game_id])
        }
    })

    createGameSessionForWaiting()
})

function getGameFromSocketId(users, socket_id) {
    const game_id = users[socket_id].game_id
    return runningGames[game_id]
}

function createGameSessionForWaiting() {
    const room_clients = getClientsForRoom(ROOM_TYPES.waiting)

    if (room_clients.length >= 2) {
       
        const game_uuid = UUID.v4();
        addPlayerToGame( room_clients, CELL_TYPES.CONTAINS_RED, game_uuid)        
        addPlayerToGame( room_clients, CELL_TYPES.CONTAINS_GREEN, game_uuid)
        game_count++
        
        const game = new Game(game_uuid)
        runningGames[game_uuid] = game    
    }
    
    console.log(`Current active users:`)
    console.log(users)
}

function addPlayerToGame(clients, player_number, game_id) {
    const socket = clients[player_number - 1]
    socket.leave(ROOM_TYPES.waiting)
    const game_room_name = ROOM_TYPES.game+game_id
    socket.join(game_room_name)

    const player_socket_id = socket.id
    users[player_socket_id].player_side = player_number
    users[player_socket_id].game_id = game_id

    socket.emit('player_number', player_number)

    
    console.log(`Adding player ${player_number} to game(${game_id}) with id: ${player_socket_id}`)
    
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

            console.log(`Current active users:`)
            console.log(users)
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