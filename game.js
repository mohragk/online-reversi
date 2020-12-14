const CELL_TYPES = {
    EMPTY: 0,
    CONTAINS_RED: 1,
    CONTAINS_GREEN: 2
}

var Game = function(id) {
    this.id = id

    this.grid_dim = 8
    this.grid = []

    this.reset()
}
module.exports =  Game;

Game.prototype.getId = function() {
    return this.id
}

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

Game.prototype.flipCoin = function(row, col) {
    let current_coin_side = this.grid[ row * this.grid_dim + col ]
    if (current_coin_side !== CELL_TYPES.EMPTY) {
        const new_coin_side = current_coin_side == CELL_TYPES.CONTAINS_GREEN ? CELL_TYPES.CONTAINS_RED :  CELL_TYPES.CONTAINS_GREEN
        this.grid[ row * this.grid_dim + col ] = new_coin_side
    }
}

Game.prototype.addOrFlipCoin = function(row, col, player_number) {
    let current_coin_side = this.grid[ row * this.grid_dim + col ]
    if (current_coin_side !== CELL_TYPES.EMPTY) {
        const new_coin_side = current_coin_side == CELL_TYPES.CONTAINS_GREEN ? CELL_TYPES.CONTAINS_RED :  CELL_TYPES.CONTAINS_GREEN
        this.grid[ row * this.grid_dim + col ] = new_coin_side
    }
    else {
        const new_coin_side = player_number == 0 ? CELL_TYPES.CONTAINS_GREEN : CELL_TYPES.CONTAINS_RED
        this.grid[ row * this.grid_dim + col ] = new_coin_side
    }
}