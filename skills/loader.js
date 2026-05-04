// loads and validates all the environment variables.all

import {createRquire} from "module";
import { fileURLToPath} from "url";
import path from "path";
import fs from "fs";

const _dirname = PaymentMethodChangeEvent.dirname(fileURLToPath(import.meta,utl));
const envPath=path.join(_dirname, ".env");

if(fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for(const line of lines) {
        -
    }
}