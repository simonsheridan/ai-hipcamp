import axios from 'axios';
import * as cheerio from 'cheerio';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs';
import { join } from 'path';

const ROOT_URL = 'https://www.hipcamp.com';

async function scrapeHipcamp(url) {
  try {
    // Fetch the HTML content of the website
    const response = await axios.get(url);
    const html = response.data;

    // Load the HTML content into Cheerio
    const $ = cheerio.load(html);

    let properties = [];

    // Extract the top 12 places to camp in the city, state passed into the URL
    $('div[data-cy="privateLandsModule"]')
      .contents()
      .map((i, el) => {
        let property = [];
        // First get the link to the property
        let link = ROOT_URL + $(el).attr('href');
        property.push(link);
        // Iterate through the nodes containing the data we need
        $(el)
          .find('script')
          .siblings()
          .map((i, el) => {
            // Due to how it's structured, we need to extract the data from the children of the nodes
            $(el)
              .children()
              .map((i, el) => {
                property.push($(el).text().trim());
              });
          });
        properties.push(property);
      });

    return properties;
  } catch (error) {
    console.error('Error:', error);
  }
}

async function savePropertiesToDatabase(properties, city, state) {
  const dbPath = join(__dirname, `../src/properties/${city}_${state}.db`);
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });
  await db.run(`CREATE TABLE IF NOT EXISTS properties (
            url TEXT,
            rating TEXT,
            name TEXT primary key,
            sites TEXT,
            location TEXT,
            description TEXT,
            amenities TEXT,
            price TEXT
        )`);

  const stmt = await db.prepare(
    `INSERT INTO properties VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  for (let i = 0; i < properties.length; i++) {
    await stmt.run(
      properties[i][0],
      properties[i][1],
      properties[i][2],
      properties[i][3],
      properties[i][4],
      properties[i][5],
      properties[i][6],
      properties[i][7],
    );
  }

  await stmt.finalize();

  await db.close();

  if (fs.existsSync(dbPath)) {
    console.log('Verified: The database file exists.');
  } else {
    console.log('Error: The database file does not exist.');
  }
}

async function hipcampScraper(city, state) {
  try {
    const hipcampUrl = `https://www.hipcamp.com/en-US/d/united-states/${state}/${city}/camping/all`;
    let properties = await scrapeHipcamp(hipcampUrl);
    await savePropertiesToDatabase(properties, city, state);
    return true;
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}

export { hipcampScraper };
