
/*
 * GET home page.
 */

exports.index = function(req, res){
  if (req.user){
  	console.log(req.user.userName);
  };
  res.render('index', { title: 'Express', user: req.user});
};