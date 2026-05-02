// it runs the full pipeline:
// 1. Detect language + version
// 2.Load skills( on the basis of which the agent will work)
// 3.Pass 1- traiage scan (LLM identifies risky functions)
// 4. User checkpoint- show risky functions and asks y/n handle options
// 5.Pass 2- deep audit (per function LLM calls)
// 6. Marge findings
// 7. geenrate report
// 8. Optionally store to 0G

import fs from "fs";
import readline from "readline";

