var Game = function(id) {
    this.id = id
}
module.exports =  Game;

Game.prototype.getId = function() {
    return this.id
}