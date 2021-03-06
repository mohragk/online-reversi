const CELL_TYPES = require('./public/cell_types')

const PLAYER_MOVES_STATE = {
    IDLE: -1,
    ADD_COIN: 0,
    FLIP_COIN: 1,
    FLIP_REST_COIN: 2
}


var Game = function(id) {
    this.id = id

    this.grid_dim = 8
    this.grid = []

    this.current_player_number = CELL_TYPES.CONTAINS_RED 
    this.current_player_moves_state = PLAYER_MOVES_STATE.ADD_COIN

    this.last_placed_coin_pos = null
    this.flippable_coins = []

    this.previous_game_state = null

    this.reset()

    this.saveState()
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
        this.grid[row * this.grid_dim + col] = CELL_TYPES.CONTAINS_GREEN
    }

   

    {
        let row = 4
        let col = 3
        this.grid[row * this.grid_dim + col] = CELL_TYPES.CONTAINS_GREEN
    }

    {
        let row = 4
        let col = 4
        this.grid[row * this.grid_dim + col] = CELL_TYPES.CONTAINS_RED
    }

    
}

Game.prototype.saveState = function() {
    this.previous_game_state = {
        grid: [...this.grid],
        player_moves_state: this.current_player_moves_state
    }
}
Game.prototype.setPlayerNumber = function(player_number) {
    this.current_player_number = player_number
    this.current_player_moves_state = PLAYER_MOVES_STATE.ADD_COIN
    this.saveState()
}

Game.prototype.shallPass = function(player_number) {
     // Not allowed to change board when not player's turn
     if (player_number !== this.current_player_number) 
        return false
     if (this.current_player_moves_state == PLAYER_MOVES_STATE.IDLE) 
        return false
    
     return true
}


Game.prototype.resetToPreviousState = function() {
    this.grid = [...this.previous_game_state.grid]
    this.current_player_moves_state = this.previous_game_state.player_moves_state
    this.flippable_coins = []
}

const isSamePos = (pos_a, pos_b) => {
    return pos_a.row === pos_b.row && pos_a.col === pos_b.col
}

Game.prototype.removeCoin = function(grid_pos, player_number) {
    if ( ! this.shallPass(player_number) ) 
        return

    if ( this.last_placed_coin_pos == null ) 
        return 

    
    if ( isSamePos(this.last_placed_coin_pos, grid_pos) ) {
        const {row, col} = grid_pos
        
        this.grid[ row * this.grid_dim + col ] = CELL_TYPES.EMPTY

        this.last_placed_coin_pos = null
        this.flippable_coins = []
        
        // Reset state to be able add coin
        this.current_player_moves_state = PLAYER_MOVES_STATE.ADD_COIN
    }
}



Game.prototype.addOrFlipCoin = function(grid_pos, player_number, immediate_mode = false) {
    if ( ! this.shallPass(player_number) ) 
        return

    
    const {row, col} = grid_pos
    
    let current_cell_value = this.grid[ row * this.grid_dim + col ]

    // FLIP COIN
    if (current_cell_value !== CELL_TYPES.EMPTY) {
        
        // First flip, determines working direction
        if (this.current_player_moves_state === PLAYER_MOVES_STATE.FLIP_COIN) {

            
            if ( ! this.isValidFirstFlip(grid_pos) ) 
                return

            if ( isSamePos(this.last_placed_coin_pos, grid_pos) ) 
                return

            const new_cell_value = current_cell_value == CELL_TYPES.CONTAINS_GREEN ? CELL_TYPES.CONTAINS_RED :  CELL_TYPES.CONTAINS_GREEN
            this.grid[ row * this.grid_dim + col ] = new_cell_value

          
            
            const success = this.createFlippableList(grid_pos)
            if (success) {
                if (this.flippable_coins.length > 0) {
                    this.current_player_moves_state = PLAYER_MOVES_STATE.FLIP_REST_COIN
                }
                else {
                    this.current_player_moves_state = PLAYER_MOVES_STATE.IDLE
                }
            }
            
                

        }
        else if (this.current_player_moves_state === PLAYER_MOVES_STATE.FLIP_REST_COIN) {
            const is_valid_flip = this.isValidFlip(grid_pos)
            if (is_valid_flip) {
                const new_cell_value = current_cell_value == CELL_TYPES.CONTAINS_GREEN ? CELL_TYPES.CONTAINS_RED :  CELL_TYPES.CONTAINS_GREEN
                this.grid[ row * this.grid_dim + col ] = new_cell_value
            }

            if (this.flippable_coins.length <= 0) {
                this.current_player_moves_state = PLAYER_MOVES_STATE.IDLE
                this.last_placed_coin_pos = null
            }
        }
    }
    //ADD COIN
    else if (this.isValidPlacement({row, col})) {
        if (this.current_player_moves_state === PLAYER_MOVES_STATE.ADD_COIN) {
            const new_cell_value = player_number
            this.grid[ row * this.grid_dim + col ] = new_cell_value

            this.last_placed_coin_pos = {...grid_pos}

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

Game.prototype.isValidFlip = function(flip_pos) {

    if (this.flippable_coins.length > 0) {
        const first_pos = this.flippable_coins[0]
    
        if (first_pos.row == flip_pos.row && first_pos.col == flip_pos.col) {
            this.flippable_coins.shift()
            return true
        }

        return false
    } 

    return false
}


// Determine enclosure line direction
const direction = (last_placed_pos, flip_pos) => {
    const row_dir = flip_pos.row - last_placed_pos.row
    const col_dir = flip_pos.col - last_placed_pos.col
    return {row_dir, col_dir}
}

Game.prototype.isValidFirstFlip = function(flip_pos) {
    if (this.last_placed_coin_pos !== null) {   
        const new_dir = direction(this.last_placed_coin_pos, flip_pos)

        // only allowed to flip neighbouring coin
        if (new_dir.row_dir > 1 || new_dir.col_dir > 1) return false

        // Iteratively check if next coins are flippable

        let cell_pos = {...flip_pos}
        while(true) {
            cell_pos.row += new_dir.row_dir 
            cell_pos.col += new_dir.col_dir 
            const cell_value = this.grid[ cell_pos.row * this.grid_dim + cell_pos.col ]
            
            // OOB
            if (cell_pos.row < 0 && cell_pos.row >= this.grid_dim) {
                if (cell_pos.col < 0 && cell_pos.col >= this.grid_dim) {
                    this.flippable_coins = []
                    return false    
                }
            }

            // Not enclosing
            if (cell_value === CELL_TYPES.EMPTY) {
                return false
            }
            
            if (cell_value !== this.current_player_number) {
                continue
            }
            else {
                return true
            }
            
            
        }
    }
}

Game.prototype.createFlippableList = function(first_flip_pos) {
    
    if (this.last_placed_coin_pos !== null) {   
        const new_dir = direction(this.last_placed_coin_pos, first_flip_pos)
        

        // Iteratively check if next coins are flippable
        // Save those in flippable list
        let cell_pos = {...first_flip_pos}
        while(true) {
            cell_pos.row += new_dir.row_dir 
            cell_pos.col += new_dir.col_dir 
            const cell_value = this.grid[ cell_pos.row * this.grid_dim + cell_pos.col ]
            
            // OOB
            if (cell_pos.row < 0 && cell_pos.row >= this.grid_dim) {
                if (cell_pos.col < 0 && cell_pos.col >= this.grid_dim) {
                    this.flippable_coins = []
                    return false    
                }
            }

            // Not enclosing
            if (cell_value === CELL_TYPES.EMPTY) {
                this.flippable_coins = []
                return false
            }
            
            if (cell_value !== this.current_player_number) {
                this.flippable_coins.push({...cell_pos})
            }
            else {
                this.last_placed_coin_pos = null
                return true
            }
            
            
        }
    }
}
