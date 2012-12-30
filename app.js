
/**
 * Module dependencies.
 */
var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , app = express()
  , http = require('http').createServer(app)
  , path = require('path')
  , io = require('socket.io').listen(http)
  , config = require('./config')
  , passport = require('passport')
  , FacebookStrategy = require('passport-facebook').Strategy
  , TwitterStrategy = require('passport-twitter').Strategy
  , mongoose = require('mongoose')
  , Schema = mongoose.Schema;

//mongoose.connect('mongodb://nodejitsu:ae590d674c8b70d6b05a8ed0177ef389@linus.mongohq.com:10003');
mongoose.connect('localhost', 'test');


var UserSchema = new Schema({
  userName: { type: String, required: true },
  email: String,
  conecciones: [
    {
      id: { type: String, unique: true },
      red: { type: String, required: true },
      userToken: { type: String, required: true },
      userTokenSecret: { type: String, required: true }
    }
  ],
  registrado: Date
});

UserSchema.static('authenticate', function(perfil, red, token, tokensecret, callback) {
  this.findOne({ 'conecciones.id': perfil.id, 'conecciones.red': red }, function(err, user) {
      if (err) { return callback(err); }
      if (user === null) {
        return callback(err, user, red, token, tokensecret);
      } else {
        return callback(null, user);
      }
  });
});



passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
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

passport.use(new FacebookStrategy({
    clientID: config.twit.consumerKey,
    clientSecret: config.twit.consumerSecret,
    callbackURL: "http://www.example.com/auth/facebook/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    User.authenticate(profile, 'fb', accessToken, refreshToken, function(err, user) {
      if (err) { return done(err); }
      done(null, user);
    });
  }
));

passport.use(new TwitterStrategy({
    consumerKey: config.twit.consumerKey,
    consumerSecret: config.twit.consumerSecret,
    callbackURL: "http://localhost:3000/auth/twitter/callback"
  },
  function(token, tokenSecret, profile, done) {
    User.authenticate(profile, 'tw', token, tokenSecret, function(err, user, red, token, tokensecret) {
      if (user === null) {
        var usr = mongoose.model('User', UserSchema);
        console.log('1');
        var elId = profile.id.toString();
        var u = new usr({
          userName: profile.displayName,
          email: '',
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
     }
      return done(null, user);
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
  app.use(express.cookieParser('your secret here'));
  app.use(express.session());
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
app.get('/auth/twitter/callback', 
  passport.authenticate('twitter', { successRedirect: '/',
                                     failureRedirect: '/error' }));

http.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
