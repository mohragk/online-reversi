const CELL_TYPES = require('./public/cell_types')

const PLAYER_MOVES_STATE = {
    IDLE: -1,
    ADD_COIN: 0,
    FLIP_COIN: 1,
    BLOCKED: 2
}


var Game = function(id) {
    this.id = id

    this.grid_dim = 8
    this.grid = []

    this.current_player_number = CELL_TYPES.CONTAINS_RED 
    this.current_player_moves_state = PLAYER_MOVES_STATE.ADD_COIN
    this.current_player_flip_direction = {row_dir: 0, col_dir: 0}

    this.reset()
}
module.exports = Game;


Game.prototype.reset = function() {
    for (let row = 0 ; row < this.grid_dim; row++) {
        for (let col = 0 ; col < this.grid_dim; col++) {
            this.grid[row * this.grid_dim + col] = CELL_TYPES.EMPTY
        }
    }

    {
        let row = 3
        let col = 3
        this.grid[row * this.grid_dim + col] = CELL_TYPES.CONTAINS_RED
    }
    
    {
        let row = 3
        let col = 4
        this.grid[row * this.grid_dim + col] = CELL_TYPES.CONTAINS_RED
    }

    {
        let row = 4
        let col = 3
        this.grid[row * this.grid_dim + col] = CELL_TYPES.CONTAINS_GREEN
    }

    {
        let row = 4
        let col = 4
        this.grid[row * this.grid_dim + col] = CELL_TYPES.CONTAINS_GREEN
    }
}


Game.prototype.setPlayerNumber = function(player_number) {
    this.current_player_number = player_number

    this.current_player_moves_state = PLAYER_MOVES_STATE.ADD_COIN
}

Game.prototype.flipCoin = function(row, col) {
    let current_coin_side = this.grid[ row * this.grid_dim + col ]
    if (current_coin_side !== CELL_TYPES.EMPTY) {
        const new_coin_side = current_coin_side == CELL_TYPES.CONTAINS_GREEN ? CELL_TYPES.CONTAINS_RED :  CELL_TYPES.CONTAINS_GREEN
        this.grid[ row * this.grid_dim + col ] = new_coin_side
    }
}

Game.prototype.removeCoin = function(grid_pos) {
    let current_coin_side = this.grid[ grid_pos.row * this.grid_dim + grid_pos.col ]
    if (current_coin_side !== CELL_TYPES.EMPTY) {
        this.grid[ grid_pos.row * this.grid_dim + grid_pos.col ] = CELL_TYPES.EMPTY
        this.current_player_moves_state = PLAYER_MOVES_STATE.ADD_COIN
    }
}

Game.prototype.addOrFlipCoin = function(row, col, player_number) {
    // Not allowed to change board when not player's turn
    if (player_number !== this.current_player_number) return

    let current_cell_value = this.grid[ row * this.grid_dim + col ]

    // FLIP COIN
    if (current_cell_value !== CELL_TYPES.EMPTY) {
        if (this.current_player_moves_state === PLAYER_MOVES_STATE.FLIP_COIN) {
            const new_cell_value = current_cell_value == CELL_TYPES.CONTAINS_GREEN ? CELL_TYPES.CONTAINS_RED :  CELL_TYPES.CONTAINS_GREEN
            this.grid[ row * this.grid_dim + col ] = new_cell_value
        }
    }
    //ADD COIN
    else if (this.isValidPlacement({row, col})) {
        if (this.current_player_moves_state === PLAYER_MOVES_STATE.ADD_COIN) {
            const new_cell_value = player_number
            this.grid[ row * this.grid_dim + col ] = new_cell_value

            // Update player_moves_state
            this.current_player_moves_state = PLAYER_MOVES_STATE.FLIP_COIN
        }
    }

}

Game.prototype.isValidPlacement = function(grid_pos) {
    
    test = false;

    grid_dim = this.grid_dim;
    for (let neighbour_row = -1; neighbour_row <= 1; neighbour_row++) {
        for (let neighbour_col = -1; neighbour_col <= 1; neighbour_col++) {
            // Skip itself
            if (neighbour_col == 0 && neighbour_row == 0) continue;

            let col = grid_pos.col + neighbour_col;
            let row = grid_pos.row + neighbour_row;

            // Skip "neighbours" outside grid
            if (col < 0 || col >= grid_dim) { continue }
            if (row < 0 || row >= grid_dim) { continue }


            let slot_index = Math.floor( grid_dim * row + col );
            let neighbour_slottype = this.grid[slot_index];

            // Skip empty cells
            if (neighbour_slottype == CELL_TYPES.EMPTY) { continue }

            // ONLY return true when neighbour differs from player
            if (neighbour_slottype !== this.current_player_number) { return true }
        }
    }

    return test;
}

Game.prototype.resetMovesState = function() {
    this.current_player_moves_state = PLAYER_MOVES_STATE.IDLE
    this.current_player_flip_direction = {row_dir: 0, col_dir: 0}
}