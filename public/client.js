const GAMESTATE_POLL_RATE_HZ = 3
let socket

let player_number
let player_score
let player_turn = false

let cell_size_pixels = 48
let mouse_position

let flip_immediately = false

const BUTTON_STATES_TEXT = {
    WAIT: 'Wait turn',
    ACTIVE: 'End turn'
}

function drawCircle(context, x, y, radius) {
    context.beginPath();
    
    // Draws a circle of radius 20 at the coordinates 100,100 on the canvas
    const new_x = x + (0.5 * radius)
    const new_y = y + (0.5 * radius)
    context.arc(new_x, new_y, 0.5*radius, 0, Math.PI*2, true);
    context.closePath();
    context.fill();
}

const isSamePos = (last_cell_pos, curr_cell_pos) => last_cell_pos.row === curr_cell_pos.row && last_cell_pos.col == curr_cell_pos.col



jQuery(document).ready(async function($) {

    socket = await io.connect('')

    
    var canvas = document.getElementById('grid_canvas');
    var ctx = canvas.getContext('2d');
    
    
    canvas.addEventListener('mousemove', function(e) {
        const getMousePos = (canvas,e) => {
            var rect = canvas.getBoundingClientRect();
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        }
        mouse_position = getMousePos(canvas, e);
    }, false);
    

    let is_double_tapping = false
    let latest_click_cell_pos = {row: 0, col: 0}
    
    canvas.addEventListener("click", function(e) {
        // Convert mouse coords to grid coords
        const col = Math.floor(mouse_position.x / cell_size_pixels)
        const row = Math.floor(mouse_position.y / cell_size_pixels)

        const current_click_cell_pos = {row, col}
        const is_same_cell = isSamePos(latest_click_cell_pos, current_click_cell_pos)
        const player_data = {pos:current_click_cell_pos, player_number, flip_immediately}
       
        if ( is_double_tapping && is_same_cell ) {
            socket.emit('remove_coin', player_data)
        }
        else {
            socket.emit('add_or_flip_coin', player_data)
        }

        if (!is_double_tapping) {
            is_double_tapping = true
            window.setTimeout(() => { is_double_tapping = false }, 260)
        }
        
        latest_click_cell_pos = {...current_click_cell_pos}
    }, false);


    canvas.addEventListener('contextmenu', function(e) {
        e.preventDefault()

        // Convert mouse coords to grid coords
        const col = Math.floor(mouse_position.x / cell_size_pixels)
        const row = Math.floor(mouse_position.y / cell_size_pixels)
        socket.emit('remove_coin', {pos: {row, col}, player_number })
    })

    window.addEventListener('keydown', function(e) {
        //S or E
        if (e.key === 'e' || e.key === 's' ) {
            socket.emit('switch_to_other_player', player_number)
        }

        if (e.shiftKey && e.key === 'F') {
            flip_immediately = !flip_immediately
            console.log(`We are${flip_immediately ? '' : ' not'} flipping immediately`)
        }

        if (e.ctrlKey && e.key === 'z') {
            socket.emit('undo')
        }
    })

 

    $('#end_turn_button').click(function(e) {
        e.preventDefault()
        socket.emit('switch_to_other_player', player_number)
    })
    .prop('disabled', true) // hide at start
    .text(BUTTON_STATES_TEXT.WAIT)


    $('#undo_button').click(function(e) {
        e.preventDefault()
        socket.emit('undo')
    })

    // SOCKET STUFF
    
    socket.on('waiting', (msg)=> {
        // $('#player_data').text('Waiting for other player')
    })

    socket.on('game_ended', function(msg) {
        var canvas_w = canvas.width;
        var canvas_h = canvas.height;
        ctx.clearRect(0,0, canvas_w, canvas_h)

        // draw border
        ctx.strokeStyle = 'black'
        ctx.lineWidth = 4;
        ctx.strokeRect(0,0, canvas_w, canvas_h )

        ctx.font = "32px Arial"
        ctx.textAlign = "center"
        ctx.fillStyle = 'black'
        ctx.fillText("No other player available", canvas_w/2 , canvas_h/2);
        
        player_score = 0;

        updateHTMLTurnButton(false)
        updateHTMLPlayerHeader('Waiting for other player')
        updateHTMLPlayerScore(-1) // -1 = No score display
    })

    socket.on('player_number', number => {
        player_number = number;
        updateHTMLPlayerHeader()
    })

 

    socket.on('game_update', (game_state) => {
        if (game_state !== null) {
           
            player_turn = (game_state.current_player_number === player_number)
            updateHTMLTurnButton(player_turn)
           

            var canvas_w = canvas.width;
            var canvas_h = canvas.height;
            ctx.clearRect(0,0, canvas_w, canvas_h)

            // reset, is recalculated based on board
            player_score = 0
            
            // update and draw grid
            const { grid, grid_dim } = game_state
            cell_size_pixels = canvas_h / grid_dim
            for (let row = 0 ; row < grid_dim; row++) {
                for (let col = 0 ; col < grid_dim; col++) {
                    const margin = 8
                    const half_margin = margin / 2
                    let x = col * cell_size_pixels + (0.5 * half_margin)
                    let y = row * cell_size_pixels + (0.5 * half_margin)
                    
                    const cell_value = grid[row * grid_dim + col]
                    if (cell_value === player_number) player_score++
                    ctx.fillStyle = 'rgb(37, 37, 37)'
                    ctx.fillRect(x, y, cell_size_pixels - half_margin, cell_size_pixels - half_margin)
                    


                    x += 0.5 * half_margin
                    y += 0.5 * half_margin
                    if (cell_value == 1) {

                        ctx.fillStyle = 'red'
                        drawCircle(ctx, x, y, cell_size_pixels - margin)
                    }
                    else if (cell_value == 2) {
                        ctx.fillStyle = 'green' 
                        drawCircle(ctx, x, y, cell_size_pixels - margin)
                    }
                }
            }
            
           

            if (player_turn) {
                // draw border
                ctx.strokeStyle = player_number === 1 ? `rgba(255, 0 , 0, 0.8)` : `rgba(0, 180, 0, 0.8)`
                
                ctx.lineWidth = 8 * 4;
                ctx.strokeRect(0,0, canvas_w, canvas_h )
            }


           updateHTMLPlayerScore(player_score)
           updateHTMLPlayerHeader()
        }
    })


    // Poll game update at interval
    setInterval( () => { 
        socket.emit('request_update')
    }, 1000/GAMESTATE_POLL_RATE_HZ )
    
    function updateHTMLTurnButton(is_active) {
        $('#end_turn_button')
        .prop('disabled', !is_active)
        .text(is_active ? BUTTON_STATES_TEXT.ACTIVE : BUTTON_STATES_TEXT.WAIT)
    }

    function updateHTMLPlayerScore(score) {
        if (score < 0) {
            $('#player_score').text(``)
        }
        else {
            $('#player_score').text(`Score: ${score}`)
        }

    }

    function updateHTMLPlayerHeader(set_message = '') {
        const player_data = $('#player_data');
        
        let player_color
        if (player_number == 1) {
            player_color = `RED`
        }
        else {
            player_color = `GREEN`
        }
        let message = `You're the ${player_color} player`

        if (set_message !== '') message = set_message

        player_data.empty().append (
            $('<h4>').text(message)
        )
    }
    
}) //jQuery