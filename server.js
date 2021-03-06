'use strict';

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

var _querystring = require('querystring');

var _querystring2 = _interopRequireDefault(_querystring);

var _cookieParser = require('cookie-parser');

var _cookieParser2 = _interopRequireDefault(_cookieParser);

var _bodyParser = require('body-parser');

var _bodyParser2 = _interopRequireDefault(_bodyParser);

var _requestPromise = require('request-promise');

var _requestPromise2 = _interopRequireDefault(_requestPromise);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// "Request" library
var port = process.env.PORT || 3030; // Express web server framework


var client_id = process.env["SPOTIFY_ID"],
    client_secret = process.env["SPOTIFY_SECRET"],
    redirect_uri = 'http://localhost:8888/callback',
    // Your redirect uri
spotifyBaseUrl = 'https://api.spotify.com',
    spotifyAudioAnalysis = '/v1/audio-features/',
    spotifySearch = '/v1/search',
    geniusBaseUrl = 'https://api.genius.com',
    geniusSearch = '/search',
    genius_token = process.env["GENIUS_TOKEN"],
    lastfmBaseUrl = 'http://ws.audioscrobbler.com/2.0/',
    lastfm_id = process.env["LASTFM_ID"],
    lastfmSimilar = '?method=track.getsimilar&format=json&api_key=' + lastfm_id;

var access_token = void 0,
    refresh_token = void 0,
    path = void 0;

var stateKey = 'spotify_auth_state';
var app = (0, _express2.default)();

app.use(_bodyParser2.default.json()) // support json encoded bodies
.use(_bodyParser2.default.urlencoded({ extended: true })) // support encoded bodies
.set('view engine', 'pug').use('/public', _express2.default.static(__dirname + '/public')).use((0, _cookieParser2.default)()).get('/', function (req, res) {
  res.render('index');
}).get('/search', function (req, res) {
  var query_track = encodeURI(req.query.title);
  var query_artist = encodeURI(req.query.artist);
  console.log('Search for ' + query_track + ' by ' + query_artist);

  // If the user wants the features of the song
  if (req.query.button == 'features') {
    // Searching for the song
    var options = {
      url: '' + spotifyBaseUrl + spotifySearch + '?q=track:' + query_track + '%20artist:' + query_artist + '&type=track',
      json: true
    };

    (0, _requestPromise2.default)(options) // Make the request to look for the song
    .then(function (body) {
      // If the API returns something but not a list of songs as we're expecting
      if (typeof body.tracks.items["0"] === 'undefined') {
        res.render('index', {
          message: 'Sorry, we couldn\'t find your song.',
          instruction: 'Please try again with the exact Artist and Title names.'
        });
      }
      // If the API returns a list of songs as expected
      else {
          (function () {
            // Log the first result in the response
            var id = body.tracks.items["0"].id;
            var track = body.tracks.items["0"].name;
            var artist = body.tracks.items[0].album.artists[0].name;
            console.log('Spotify:' + id + ' for ' + track + ' by ' + artist);
            var genius_options = {
              url: '' + geniusBaseUrl + geniusSearch + '?q=' + artist + '%20' + track,
              headers: {
                'Authorization': 'Bearer ' + genius_token
              },
              json: true,
              timeout: 1000
            };

            (0, _requestPromise2.default)(genius_options).then(function (song) {
              console.log('Genius ID: ' + song.response.hits[0].result.id + ' for ' + song.response.hits[0].result.full_title);
              path = song.response.hits[0].result.api_path;
              // Authenticate to get the Track features
              var authOptions = {
                url: 'https://accounts.spotify.com/api/token',
                headers: {
                  'Authorization': 'Basic ' + new Buffer(client_id + ':' + client_secret).toString('base64')
                },
                form: {
                  grant_type: 'client_credentials'
                },
                json: true
              };

              // Authenticate on the API
              _requestPromise2.default.post(authOptions).then(function (body) {
                // Use the access token in the request for the audio features
                var token = body.access_token;
                var options = {
                  url: '' + spotifyBaseUrl + spotifyAudioAnalysis + id,
                  headers: {
                    'Authorization': 'Bearer ' + token
                  },
                  json: true
                };

                // Make the request to get the Song's features
                (0, _requestPromise2.default)(options).then(function (body) {
                  var features = body;
                  // Send the results with the lyrics
                  res.render('features', {
                    status: 'Song found',
                    track: track,
                    artist: artist,
                    features: features,
                    path: path
                  });
                }).catch(function (error) {
                  console.log(error); // Error from Spotify API
                });
              }).catch(function (error) {
                console.log(error);
              });
            }).catch(function (error) {
              console.log('No lyrics found');
              path = "No lyrics found";
              var authOptions = {
                url: 'https://accounts.spotify.com/api/token',
                headers: {
                  'Authorization': 'Basic ' + new Buffer(client_id + ':' + client_secret).toString('base64')
                },
                form: {
                  grant_type: 'client_credentials'
                },
                json: true
              };

              // Authenticate on the API
              _requestPromise2.default.post(authOptions).then(function (body) {
                // Use the access token in the request for the audio features
                var token = body.access_token;
                var options = {
                  url: '' + spotifyBaseUrl + spotifyAudioAnalysis + id,
                  headers: {
                    'Authorization': 'Bearer ' + token
                  },
                  json: true
                };

                // Make the request to get the Song's features
                (0, _requestPromise2.default)(options).then(function (body) {
                  var features = body;
                  // Send the results without the lyrics
                  res.render('features', {
                    status: 'Song found',
                    track: track,
                    artist: artist,
                    features: features,
                    path: path
                  });
                }).catch(function (error) {
                  console.log(error); // Error from Spotify API
                });
              }).catch(function (error) {
                console.log(error);
              });
            });
          })();
        }
    }).catch(function (err) {
      console.log(err); // Error when searching the song
    });
  } else {
    // Getting the similar list of tracks with LastFM
    var lastfm_options = {
      url: '' + lastfmBaseUrl + lastfmSimilar + '&artist=' + query_artist + '&track=' + query_track,
      json: true
    };

    (0, _requestPromise2.default)(lastfm_options).then(function (body) {
      if (body.similartracks) {
        console.log(body.similartracks);
        var tracks = body.similartracks.track.length > 9 ? body.similartracks.track.slice(0, 10) : body.similartracks.track;
        if (track.lenth > 0) {
          res.render('similar', {
            tracks: tracks,
            track: req.query.title,
            artist: req.query.artist
          });
        } else {
          res.render('index', {
            message: 'Sorry, we couldn\'t find any song similar ' + req.query.title + ' by ' + req.query.artist + '.',
            instruction: 'Try with another one?'
          });
        }
      } else {
        res.render('index', {
          message: 'Sorry, we couldn\'t find ' + req.query.title + ' by ' + req.query.artist + '.',
          instruction: 'Please try again and check the spelling of the Artist and Title names.'
        });
      }
    }).catch(function (err) {
      console.log(err);
    });
  }
}).listen(port);
console.log('Server listening on ' + port);