
/**
 * Module dependencies.
 */
var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , app = express()
  , MemoryStore = express.session.MemoryStore
  , sessionStore = new MemoryStore()
  , http = require('http').createServer(app)
  , path = require('path')
  , io = require('socket.io').listen(http)
  , config = require('./config')
  , passport = require('passport')
  , FacebookStrategy = require('passport-facebook').Strategy
  , TwitterStrategy = require('passport-twitter').Strategy
  , mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , cookieParser = express.cookieParser('saracatungacatunga')
  , connect = require('connect')
  , parseSignedCookie = connect.utils.parseSignedCookies
  , cookie = require('express/node_modules/cookie')
  , Session = connect.middleware.session.Session;

mongoose.connect('mongodb://nodejitsu:ae590d674c8b70d6b05a8ed0177ef389@linus.mongohq.com:10003/nodejitsudb2206317863');
//mongoose.connect('localhost', 'test');

var CommentSchema = new Schema({
  userId: { type: Schema.ObjectId, ref: 'User' },
  userName: String,
  pic: String,
  comentario: String
});

var UserSchema = new Schema({
  userName: { type: String, required: true },
  email: String,
  pic: String,
  conecciones: [
    {
      id: { type: String, unique: true },
      red: { type: String, required: true },
      userToken: { type: String, required: true },
      userTokenSecret: String
    }
  ],
  registrado: Date
});

UserSchema.static('authenticate', 
  function(perfil, red, token, tokensecret, callback) {
  this.findOne({ 'conecciones.id': perfil.id, 'conecciones.red': red }, 
    function(err, user) {
      if (err) { return callback('pepe '+err); }
      if (user === null) {
        return callback(err, user, red, token, tokensecret);
      } else {
        return callback(null, user);
      }
  });
});



passport.serializeUser(function(user, done) {
  console.log('serialize ' + user);
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  console.log('deserialize ' + user);
  done(null, user);
/*
  User.findOne({'conecciones.id': id}, function(err, user) {
    done(err, user);
  });


  User.findById(id, function(err, user) {
    done(err, user);
  });
*/
});

var User = mongoose.model('User', UserSchema);
var Comment = mongoose.model('Comment', CommentSchema);


io.configure(function (){
  io.set('authorization', function (handshakeData, callback) {
    if (handshakeData.headers.cookie) {
      handshakeData.cookie = parseSignedCookie(cookie.parse(handshakeData.headers.cookie),'MySuperSecretP@ssw0rd');
      console.log(handshakeData.cookie);
      handshakeData.sessionID = handshakeData.cookie['express.sid'];
//      cookie.parse(decodeURIComponent(req.headers.cookie)),'your cookie secret')
      console.log(handshakeData.sessionID);
      handshakeData.sessionStore = sessionStore;
      sessionStore.get(handshakeData.sessionID, function (err, session) {
        if (err || !session) {
          callback(err, false);
        } else {
          // create a session object, passing data as request and our
          // just acquired session data
          handshakeData.session = new Session(handshakeData, session);
          callback(null, true);
        }
      });
    } else {
       return callback('No cookie transmitted.', false);
    }
  });
});

io.sockets.on('connection', function (socket) {
  Comment.find({})
  .limit(25)
  .sort('-_id')
  .lean()
  .exec(function(err,comments){
    socket.emit('history',comments);
  });
  socket.on('mensaje',function(message){
    console.log(message.m);
    sessionStore.get(socket.handshake.sessionID, function(err, session) {
      console.log(session);//.passport.user.userName);
      var msg = mongoose.model('Comment', CommentSchema);
      var m = new msg({
          userId: session.passport.user._id,
          userName: session.passport.user.userName,
          pic: session.passport.user.pic,
          comentario: message.m
      });
      m.save(function(err, comment){
        console.log(comment);
      });
      io.sockets.emit('nMensaje',{nombre: session.passport.user.userName, picture: session.passport.user.pic, mensaje: message.m});
    });
  });
});

passport.use(new FacebookStrategy({
    clientID: config.fb.appId,
    clientSecret: config.fb.appSecret,
    //callbackURL: "http://localhost:3000/auth/facebook/callback"
    callbackURL: "http://chattinga.jit.su/auth/facebook/callback"
  },
  function(accessToken, refreshToken, profile, done) {
      User.authenticate(profile, 'fb', accessToken, refreshToken,
        function(err, user, red, token, tokensecret) {
      console.log(profile);
      if (user === null) {
        var usr = mongoose.model('User', UserSchema);
        console.log('1');
        var elId = profile.id.toString();
        var u = new usr({
          userName: profile.displayName,
          email: '',
          pic: 'https://graph.facebook.com/'+elId+'/picture?width=25&height=25',
          conecciones: [
            {
              id: elId,
              red: red,
              userToken: token,
              userTokenSecret: tokensecret
            }
          ],
          registrado: Date.now()
        });
        console.log('2');
        u.save(function(err, user){
          if (err) {
            console.log('no creó '+ err);
            return done(null, err);
          } else {
            console.log('creó '+ user);
            return done(null, user);
          }
        });
     } else {
      return done(null, user);
     }
    });
  }
));

passport.use(new TwitterStrategy({
    consumerKey: config.twit.consumerKey,
    consumerSecret: config.twit.consumerSecret,
    //callbackURL: "http://localhost:3000/auth/twitter/callback"
    callbackURL: "http://chattinga.jit.su/auth/twitter/callback"
  },
  function(token, tokenSecret, profile, done) {
    User.authenticate(profile, 'tw', token, tokenSecret, function(err, user, red, token, tokensecret) {
      console.log(profile);
      if (user === null) {
        var usr = mongoose.model('User', UserSchema);
        console.log('1');
        var elId = profile.id.toString();
        var u = new usr({
          userName: profile.displayName,
          email: '',
          pic: profile._json.profile_image_url,
          conecciones: [
            {
              id: elId,
              red: red,
              userToken: token,
              userTokenSecret: tokensecret
            }
          ],
          registrado: Date.now()
        });
        console.log('2');
        u.save(function(err, user){
          console.log('enziño');
          if (err) {
            return done(null, err);
          } else {
            return done(null, user);
          }
        });
     } else {
      return done(null, user);
     }
    });
  }
));



app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(cookieParser);
  app.use(express.session({store: sessionStore
        , secret: 'MySuperSecretP@ssw0rd'
        , key: 'express.sid'}));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(require('stylus').middleware(__dirname + '/public'));
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/auth/twitter', passport.authenticate('twitter'));
app.get('/auth/facebook', passport.authenticate('facebook'));

app.get('/auth/twitter/callback', 
  passport.authenticate('twitter', { successRedirect: '/',
                                     failureRedirect: '/error' }));
app.get('/auth/facebook/callback', 
  passport.authenticate('facebook', { successRedirect: '/',
                                      failureRedirect: '/error' }));

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

http.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
