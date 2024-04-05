import https from 'https';
import sqlite3 from 'sqlite3';
import fs from 'fs';
import { US_STATES } from './enums';
import { hipcampScraper } from './hipcamp-scraper';
import { join } from 'path';

async function readHipcampData(city, state = 'Colorado') {
  //lookup state if it's abbreviated
  if (state.length === 2) {
    state = US_STATES[state.toUpperCase()];
  }
  //normalize city and state
  city = city.toLowerCase();
  state = state.toLowerCase();

  // TODO: copy properties to /dist/properties
  const dbPath = join(__dirname, `../src/properties/${city}_${state}.db`);

  //check if database exists
  if (!fs.existsSync(dbPath)) {
    console.log('fetehing new data');
    // call hipcamp-scraper to get data
    let dataFetchSuccess = await hipcampScraper(city, state);
    if (!dataFetchSuccess) {
      return Promise.resolve(
        new Error('Failed to fetch data for the provided city and state'),
      );
    }
  } else {
    console.log('using cached data');
  }

  const db = new sqlite3.Database(dbPath);
  const query = `SELECT * FROM properties ORDER BY name`;

  return new Promise((resolve, reject) => {
    db.all(query, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        db.close();
        resolve(JSON.stringify(rows));
      }
    });
  });
}

export async function runConversation(
  userMessage: string = 'Welcome to the future',
) {
  const messages = [
    {
      role: 'user',
      content: userMessage,
    },
    {
      role: 'user',
      content:
        'The response should include 3 to 5 options and include the URL link.',
    },
    // { role: "system", content: "The response should be in JSON format."},
  ];

  const tools = [
    {
      type: 'function',
      function: {
        name: 'read_hipcamp_data',
        description: 'Get hipcamp data for a city and state',
        parameters: {
          type: 'object',
          properties: {
            city: {
              type: 'string',
              description: 'The city to get hipcamp data for',
            },
            state: {
              type: 'string',
              description: 'The state to get hipcamp data for',
            },
          },
          required: ['city', 'state'],
        },
      },
    },
  ];

  const requestData = JSON.stringify({
    model: 'gpt-3.5-turbo',
    messages: messages,
    // response_format: { "type": "json_object" },
    tools: tools,
    tool_choice: 'auto',
  });

  const options = {
    hostname: 'api.openai.com',
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, // Replace with your OpenAI API key
    },
  };

  const response: any = await new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve(JSON.parse(data));
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(requestData);
    req.end();
  });

  const responseMessage = response.choices[0].message;

  if (responseMessage.tool_calls) {
    console.log('Tool calls detected', responseMessage.tool_calls);
    const toolCalls = responseMessage.tool_calls;
    const availableFunctions = {
      read_hipcamp_data: readHipcampData,
    };

    messages.push(responseMessage);

    const functionResponses = await Promise.all(
      toolCalls.map(async (toolCall) => {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);
        const functionToCall = availableFunctions[functionName];
        const functionResponse = await functionToCall(
          functionArgs.city,
          functionArgs.state,
        );
        return {
          tool_call_id: toolCall.id,
          role: 'tool',
          name: functionName,
          content: functionResponse,
        };
      }),
    );

    messages.push(...functionResponses);

    const secondRequestData = JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: messages,
    });

    const secondResponse = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          resolve(JSON.parse(data));
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(secondRequestData);
      req.end();
    });

    return secondResponse;
  }
}
