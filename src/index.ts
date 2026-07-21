import { Hono } from 'hono';
import * as fs from 'fs';
import path from 'path';
import { initDB, basicDB } from './database.js';

let db: any;
// exists as a super basic gettable + settable JSON
const basicDb = basicDB();
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

const genericConnector = new Hono().basePath('/genericConnector');
genericConnector.get("/metadata/:asset", async (context: any) => {
  const asset = context.req.param('asset');
  context.header("Access-Control-Allow-Origin", "*");

  return context.json(basicDb.getMetadata(asset), 201);
});

genericConnector.post("/updateMetadata/:asset", async(context: any) => {
  const body = await context.req.json();
  const asset = context.req.param('asset');

  const key = body.metadataKey;
  const value = body.metadataValue;
  console.log(body, key, value);
  basicDb.updateMetadata(asset, key, value);
  return context.text("Updated metadata!");
});

const app = new Hono();
app.route("/", resources);
app.route("/", search);
app.route("/", genericConnector);
app.get("/", context => {
  return context.text("Hello :)");
})



export default app;