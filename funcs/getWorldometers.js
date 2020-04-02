const axios = require('axios');
const cheerio = require('cheerio');
const countryUtils = require('../utils/country_utils');
const admin = require('firebase-admin');
const moment = require('moment');

function getCountryData(cell) {
	let country = (cell.children[0].data
		|| cell.children[0].children[0].data
		// country name with link has another level
		|| cell.children[0].children[0].children[0].data
		|| cell.children[0].children[0].children[0].children[0].data
		|| '').trim();
	if (country.length === 0) {
		// parse with hyperlink
		country = (cell.children[0].next.children[0].data || '').trim();
	}
	return country;
}

function getCellData(cell) {
	const data = cell.children.length !== 0 ? cell.children[0].data : '';
	return parseInt(
		data.trim().replace(/,/g, '') || '0',
		10
	);
}

function fillResult(html, yesterday = false) {
	// to store parsed data
	const result = [];
	// NOTE: this will change when table format change in website
	const totalColumns = 10;
	const countryColIndex = 0;
	const casesColIndex = 1;
	const newCasesColIndex = 2;
	const deathsColIndex = 3;
	const newDeathsColIndex = 4;
	const curedColIndex = 5;
	const activeColIndex = 6;
	const criticalColIndex = 7;
	const casesPerOneMillionColIndex = 8;
	const deathsPerOneMillionColIndex = 9;

	const countriesTable = yesterday ? html('table#main_table_countries_yesterday') : html('table#main_table_countries_today');
	const countriesTableCells = countriesTable
		.children('tbody')
		.children('tr')
		.children('td');

	// minus totalColumns to skip last row, which is total
	for (let i = 0; i < countriesTableCells.length - totalColumns; i += 1) {
		const cell = countriesTableCells[i];
		// get country
		if (i % totalColumns === countryColIndex) {
			const country = getCountryData(cell);
			const countryData = countryUtils.getCountryData(country);
			delete countryData.country;
			result.push({ country, countryInfo: countryData });
		}
		// get cases
		if (i % totalColumns === casesColIndex) {
			result[result.length - 1].cases = getCellData(cell);
		}
		// get today cases
		if (i % totalColumns === newCasesColIndex) {
			result[result.length - 1].todayCases = getCellData(cell);
		}
		// get deaths
		if (i % totalColumns === deathsColIndex) {
			result[result.length - 1].deaths = getCellData(cell);
		}
		// get yesterdays deaths
		if (i % totalColumns === newDeathsColIndex) {
			result[result.length - 1].todayDeaths = getCellData(cell);
		}
		// get cured
		if (i % totalColumns === curedColIndex) {
			result[result.length - 1].recovered = getCellData(cell);
		}
		// get active
		if (i % totalColumns === activeColIndex) {
			result[result.length - 1].active = getCellData(cell);
		}
		// get critical
		if (i % totalColumns === criticalColIndex) {
			result[result.length - 1].critical = getCellData(cell);
		}
		// get total cases per one million population
		if (i % totalColumns === casesPerOneMillionColIndex) {
			const casesPerOneMillion = cell.children.length !== 0 ? cell.children[0].data : '';
			result[result.length - 1].casesPerOneMillion = parseFloat(casesPerOneMillion.split(',').join(''));
		}

		// get total deaths per one million population
		if (i % totalColumns === deathsPerOneMillionColIndex) {
			const deathsPerOneMillion = cell.children.length !== 0 ? cell.children[0].data : '';
			result[result.length - 1].deathsPerOneMillion = parseFloat(deathsPerOneMillion.split(',').join(''));
			result[result.length - 1].updated = Date.now();
		}
	}
	return result;
}

const getCountries = async (keys, redis) => {
	let response;
	const db = admin.firestore();
	const messagin = admin.messaging();
	try {
		response = await axios.get('https://www.worldometers.info/coronavirus/');
		if (response.status !== 200) {
			console.log('Error', response.status);
		}
	} catch (err) {
		return null;
	}
	// get HTML and parse death rates
	const html = cheerio.load(response.data);
	const result = fillResult(html);
	const string = JSON.stringify(result);
	redis.set(keys.countries, string);
	if (!(await redis.get(keys.fecha))) {
		console.log('Registro de fecha para actualizar países');
		const b = moment().endOf('day').format();
		redis.set(keys.fecha, b);
	}
	if (!(await redis.get(keys.countries_old))) {
		console.log('Registro de países');
		const arrayTemp = {};
		let countryTemp = {};
		result.map(country => {
			countryTemp = {
				country: country.country,
				cases: country.cases
			}
			arrayTemp[country.country] = countryTemp;
		});
		redis.set(keys.countries_old, JSON.stringify(arrayTemp));
	}
	const fecha = await redis.get(keys.fecha);
	console.log(moment().format(), moment(fecha).format());
	if (moment() < moment(fecha)) {
		console.log('usando países guardados');
		let countries = await redis.get(keys.countries_old);
		countries = JSON.parse(countries);
		let newCases = 0;
		const mensajes = [];
		let mensaje = {};
		let country;
		Object.keys(countries).forEach(value => {
			country = countries[value];
			let countryData = result.filter(obj => obj.country.toLowerCase() == country.country.toLowerCase());
			countryData = countryData[0];
			if (countryData.cases > country.cases) {
				newCases = countryData.cases - country.cases;
				mensaje = {
					country: countryData.country.toLowerCase(),
					newCases,
					totalCases: countryData.cases
				};
				mensajes.push(mensaje);
				countries[country.country].cases = countryData.cases;
			}
		});
		redis.set(keys.countries_old, JSON.stringify(countries));
		for (const msg of mensajes) {
			console.log(msg);
			db.collection('tokens')
				.where('country', '==', msg.country)
				.get()
				.then(docs => {
					docs.forEach(doc => {
						const upper = msg.country.charAt(0).toUpperCase() + msg.country.substring(1);
						try {
							messagin
								.sendToDevice(doc.data().token, {
									notification: {
										title: `${msg.newCases} Nuevos infectados`,
										body: `Para un total de ${msg.totalCases} casos en ${upper}`,
										icon:
											'https://firebasestorage.googleapis.com/v0/b/covid-19-jp.appspot.com/o/covid19_v02_circle.png?alt=media&token=816c7cda-22de-447e-b39f-e00fcc52d7a6'
									}
								})
								.then(() => console.log('mensaje envíado'))
								.catch(err =>
									console.log('error en la notificación', err)
								);
						} catch (error) {
							console.log('Error messaging', error);
						}
					});
				})
				.catch(() => {})
		}
	} else {
		console.log('actualizando países');
		const arrayTemp = {};
		let countryTemp = {};
		result.map(country => {
			countryTemp = {
				country: country.country,
				cases: country.cases
			}
			arrayTemp[country.country] = countryTemp;
		});
		redis.set(keys.countries_old, JSON.stringify(arrayTemp));
		console.log('Actualizando fecha');
		const b = moment().endOf('day').format();
		redis.set(keys.fecha, b);
	}
	return console.log(`Updated countries statistics: ${result.length}`);
};

const getYesterday = async (keys, redis) => {
	let response;
	try {
		response = await axios.get('https://www.worldometers.info/coronavirus/#nav-yesterday');
		if (response.status !== 200) {
			console.log('Error', response.status);
		}
	} catch (err) {
		return null;
	}
	// get HTML and parse death rates
	const html = cheerio.load(response.data);
	const result = fillResult(html, true);
	const string = JSON.stringify(result);
	redis.set(keys.yesterday, string);
	return console.log(`Updated yesterdays statistics: ${result.length}`);
};

module.exports = {
	getCountries,
	getYesterday
};
