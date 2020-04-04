const axios = require('axios');
const cheerio = require('cheerio');
const getCountries = async () => {
    let response;
    try {
		response = await axios.get('https://www.worldometers.info/coronavirus/');
		if (response.status !== 200) {
			console.log('Error', response.status);
		}
	} catch (err) {
		return null;
    }
    const result = [];
	const totalColumns = 12;
    const html = cheerio.load(response.data);
    const countriesTable = html('table#main_table_countries_today');
    const countriesTableCells = countriesTable
		.children('tbody')
		.children('tr')
        .children('td');
    for (let i = 0; i < countriesTableCells.length - totalColumns; i += 1) {
        const cell = countriesTableCells[i];
        if (i % totalColumns === 0) {
            let country = (cell.children[0].data
                || cell.children[0].children[0].data
                || cell.children[0].children[0].children[0].data
                || cell.children[0].children[0].children[0].children[0].data
                || '').trim();
            if (country.length === 0) {
                country = (cell.children[0].next.children[0].data || '').trim();
            }
            result.push({ country });
        }
        if (i % totalColumns === 1) {
            const data = cell.children.length !== 0 ? cell.children[0].data : '';
            result[result.length - 1].casos = parseInt(data.trim().replace(/,/g, '') || '0',10);
        }
    }
    console.log(result);

}

getCountries();