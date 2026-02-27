import { Hono } from 'hono';
import * as fs from 'fs';
import { parse } from "csv-parse";
import path from 'path';
import { Readable } from 'stream';

let db: any;
// Very simple check if /initDB will actually do anything, no reason to parse sheet every time a call gets made from connector
let dbLastSheet = "";

const resources = new Hono().basePath('/resources');

resources.get("/dummyimg", async (context: any) => {
  const imgPath = path.join(process.cwd(), "public", "test1.png")
  const img = await fs.promises.readFile(imgPath);
  context.header("Access-Control-Allow-Origin", "*");
  context.header("Cache-Control", "no-cache");
  context.header("Accept-Ranges", "bytes");

  return context.body(img, 201, {
    'Content-Type': "img/png"
  });
});

resources.get("/:sheetName", async (context: any) => {
  const sheetPath = path.join(process.cwd(), "public", `${context.req.param('sheetName')}`)
  const csv = await fs.promises.readFile(sheetPath, 'utf8');
  context.header("Access-Control-Allow-Origin", "*");
  return context.text(csv);
});

resources.post("/initDB", async (context: any) => {
  const body = await context.req.json();
  context.header("Access-Control-Allow-Origin", "*");
  // Check if a new sheet is being passed through or not
  if (body.sheetEndpoint !== dbLastSheet) {
    db = await initDB(body.sheetEndpoint);
    dbLastSheet = body.sheetEndpoint;
    return context.text("DB Initialized from sheet")
  } else {
    return context.text("DB already initialized!")
  }
});

const search = new Hono().basePath('/search');
search.get("/:searchOn/:searchQuery", async (context: any) => {
  const searchOn = context.req.param('searchOn');
  const searchQuery = context.req.param('searchQuery');
  context.header("Access-Control-Allow-Origin", "*");
  return context.json(db.getRecord(searchOn, searchQuery), 201);
});

search.get("/all", async (context: any) => {
  context.header("Access-Control-Allow-Origin", "*");
  return context.json(db.getSheet(), 201);
});
const app = new Hono();
app.route("/", resources);
app.route("/", search);
app.get("/", context => {
  return context.text("Hello :)");
})

// moving all of the database.ts stuff to the main index.ts file, don't want to debug vercel stuff anymore...
async function initDB(csvEndpoint: any) {
  // Assume fetching the CSV
  const csv = await fetch(csvEndpoint);
  const csvData: any = [];
  const parser = parse({ columns: true });
  const csvPath = path.join(process.cwd(), "public", "loadedFile.csv");
  // instead of writing to the path, create readable stream from whatever CSV we get
  const stream = new Readable();
  stream.push(await csv.text());
  stream.push(null);
  // Read raw CSV as stream, then parse to array of JSONs using csv-parse
  return new Promise((res, rej) => {
    stream
      .pipe(parser)
      .on('data', (r) => {
        csvData.push(r);
      });
    parser.on('end', () => {
      res({
        getRecord: (searchOn: string, query: string) => {
          // needs some basic handling for records not found
          return csvData.find((record: any) => record[searchOn] == query);
        },
        // Probably won't use, but nice to have just in case
        getSheet: () => {
          return csvData;
        }
      });
    });
  })
}

export default app;