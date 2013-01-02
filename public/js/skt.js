var socket = io.connect('http://chattinga.jit.su');

var load = function() {
	socket.on('history',function (data) {
		var history = '';
		alert(data);
		for(var c in data)
		{	
			console.log(data[c][picture]);
			//history += '<article class="msg"><section class="pic"><img src="'+ c.picture +'" /></section><section class="nombre">'+c.nombre+'</section><section class="mensaje">'+c.mensaje+'</section></article>'
		};
	});
	socket.on('nMensaje',function (data){
		$('#messages').append('<article class="msg"><section class="pic"><img src="'+ data.picture +'" /></section><section class="nombre">'+data.nombre+'</section><section class="mensaje">'+data.mensaje+'</section></article>');
	   	$('#messages').animate({ scrollTop: 60000 }, 'slow');
	});
	$('#say input').keypress(function (e) {
	    if(e.which == 13) {
	    	var message = $('#say input').val();
	    	socket.emit('mensaje',{m: message});
	    	$('#say input').attr("value","");
	    }
	});
};

$(document).on('ready', load);