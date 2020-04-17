var express = require('express');
var cors = require('cors');
var admin = require('firebase-admin');
var serviceAccount = require('./covid-19-jp-firebase-adminsdk-ffufw-8c154a1321.json');
const { NovelCovid } = require('novelcovid');
const track = new NovelCovid();
const { config } = require('./instances');
const notifications = require('./funcs/notifications');
const etarioColombia = require('./funcs/dataColombia')[0];
const datosColombia = require('./funcs/dataColombia')[1];

const app = express();
app.use(cors());

// initializing firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://covid-19-jp.firebaseio.com"
});

notifications();
setInterval(notifications, config.interval);

app.get('/all', async (req, res) => {
	res.send(await track.all());
});

app.get('/countries', async (req, res) => {
	const { sort } = req.query;
	let countries = await track.countries();
	if (sort) {
		countries = countries.sort((a, b) => a[sort] > b[sort] ? -1 : 1);
	}
	res.send(countries);
});

app.get('/countries/:query', async (req, res) => {
	const { query } = req.params;
	res.send(await track.countries(query));
});

app.get('/states', async (req, res) => {
	res.send(await track.states());
});

app.get('/v2/historical', async (req, res) => {
	res.send(await track.historical());
});

app.get('/v2/historical/all', async (req, res) => {
	res.send(await track.historical(true));
});

app.get('/v2/historical/:query', async (req, res) => {
	const { query } = req.params;
	res.send(await track.historical(null, query));
});

app.get('/v2/historical/:query', async (req, res) => {
	const { query } = req.params;
	res.send(await track.historical(null, query));
});

app.get('/v2/etario-colombia', async (req, res) => {
	res.send(await etarioColombia());
});

app.get('/v2/datos-colombia', async (req, res) => {
	res.send(await datosColombia());
});


const listener = app.listen(config.port, () => {
	console.log(`Your app is listening on port ${listener.address().port}`);
});