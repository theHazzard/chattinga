 var socket = io.connect('http://localhost:3000');
  socket.on('nuevo', function (data) {
    alert(data.data);
    socket.emit('my other event', { my: 'data' });
  });