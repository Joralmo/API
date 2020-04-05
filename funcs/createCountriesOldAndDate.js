const moment = require('moment');
const { redis, config } = require('../instances');
const { keys } = config;
const { NovelCovid } = require('novelcovid');
const track = new NovelCovid();

main();

async function main () {
    console.log('Registro de fecha para actualizar países');
    const b = moment().endOf('day').format();
    await redis.set(keys.fecha, b);
    console.log('Fecha registrada');
    console.log('Registro de países');
    const arrayTemp = {};
    let countryTemp = {};
	const result = await track.countries();
    result.map(country => {
        countryTemp = {
            country: country.country,
            cases: country.cases
        };
        arrayTemp[country.country] = countryTemp;
    });
    await redis.set(keys.countries_old, JSON.stringify(arrayTemp));
    console.log('Países registrados');
    process.exit();
}