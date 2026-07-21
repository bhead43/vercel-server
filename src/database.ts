import path from 'path';
import { parse } from "csv-parse";
import { Readable } from 'stream';
import * as fs from "fs";

// moving all of the database.ts stuff to the main index.ts file, don't want to debug vercel stuff anymore...
export async function initDB(csvEndpoint: any) {
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

// DB function that just has a local JSON, and a function to update it. For basic asset metadata testing for GraFx connectors
export function basicDB() {

    const dbPath = path.join(process.cwd(), "tmp", `db.json`)
    // don't need this... at all really?
    const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));

    return {
        getMetadata: (asset: string) => {
            return db.assets[asset];
        },
        updateMetadata: (asset: string, key: string, value: string) => {
            db.assets[asset][key] = value;
            // write this back to db
            fs.writeFileSync(path.join("/tmp", 'db.json'), JSON.stringify(db));
        }
    }
}