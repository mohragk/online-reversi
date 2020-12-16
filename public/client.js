let socket
let player_number
let your_turn = false
let cell_size_pixels = 48
let mouse_position
let player_score
const game_state_poll_rate_hz = 5

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

const is_same_pos = (last_mouse_pos, curr_mouse_pos) => last_mouse_pos.row === curr_mouse_pos.row && last_mouse_pos.col == curr_mouse_pos.col



jQuery(document).ready(async function($) {

    socket = await io.connect('')

    
    var canvas = document.getElementById('grid_canvas');
    var ctx = canvas.getContext('2d');
    
    
    canvas.addEventListener('mousemove', function(e) {
        mouse_position = getMousePos(canvas, e);
    }, false);
    

    let is_double_tapping = false
    let latest_click_cell_pos = {row: 0, col: 0}
    
    canvas.addEventListener("click", function(e) {
        // Convert mouse coords to grid coords
        const col = Math.floor(mouse_position.x / cell_size_pixels)
        const row = Math.floor(mouse_position.y / cell_size_pixels)

        const current_click_cell_pos = {row, col}
        const is_same_cell = is_same_pos(latest_click_cell_pos, current_click_cell_pos)
        const player_data = {pos:current_click_cell_pos, player_number}
       
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

    window.addEventListener('keypress', function(e) {
        //S or E
        if (e.keyCode === 115 || e.keyCode === 101 ) {
            socket.emit('switch_to_other_player', player_number)
        }
    })

    function getMousePos(canvas, e) {
        var rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    $('#end_turn_button').click(function(e) {
        e.preventDefault()
        socket.emit('switch_to_other_player', player_number)
    })
    .prop('disabled', true) // hide at start
    .text(BUTTON_STATES_TEXT.WAIT)

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

        $('#end_turn_button')
            .prop('disabled', true)
            .text(BUTTON_STATES_TEXT.WAIT)
        
        $('#player_data').text('Waiting for other player')
        $('#player_score').text('')
    })

    socket.on('player_number', number => {
        player_number = number;
        const player_data = $('#player_data');
        
        
        let player_color
        if (player_number == 1) {
            player_color = `RED`
        }
        else {
            player_color = `GREEN`
        }
        let message = `You're the ${player_color} player`


        player_data.empty().append (
            $('<h4>').text(message)
        )
    })

    setInterval( () => { 
        socket.emit('request_update')
    }, 1000/game_state_poll_rate_hz )
    

    socket.on('game_update', (game_state) => {

        const player_score_div = $('#player_score').text(`Score: ${player_score}` )

        if (game_state !== null) {
            var canvas_w = canvas.width;
            var canvas_h = canvas.height;
            ctx.clearRect(0,0, canvas_w, canvas_h)

            // reset
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
            
            your_turn = (game_state.current_player_number === player_number)
            
            $('#end_turn_button')
            .prop('disabled', !your_turn)

            
            $('#end_turn_button')
            .text(BUTTON_STATES_TEXT.WAIT)

            if (your_turn) {
                // draw border
                ctx.strokeStyle = player_number === 1 ? 'red' : 'green'
                ctx.lineWidth = 8 * 4;
                ctx.strokeRect(0,0, canvas_w, canvas_h )

                $('#end_turn_button')
                .text(BUTTON_STATES_TEXT.ACTIVE)

            }
        }
    })

    
}) //jQuery