// returns an array of {
//     name: string -function name
//     source: string-full function source 
// }

export function parseAllFunctions(source, language) {

    const lang = language.toLowerCase();

    if(lang === "solidity")
        return parseSolidity(source);
    if(lang === "rust")
        return parseRustGo(source, /^\s*(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/);
    if(lang === "go")
        return parseRustGo(source, /^func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)/);
    if(lang === "vyper")
        return parseIndentBased(source, /^(?:@\w+\n)*def\s+(\w+)/);
    if(lang === "python")
        return parseIndentBased(source, /^def\s+(\w+)/);

    return parseSolidity(source);
}

function parseSolidity(source) {
    const lines = source.split("\n");
    const results = [];

    const fnRegex = /^\s*(?:function\s+(\w+)|constructor\s*\(|receive\s*\(|fallback\s*\(|modifier\s+(\w+)))))/;

    let i=0;
    while(i<lines.length) {
        const match = lines[i].match(fnRegex);
        if(match){
            const name=match[1] || match[2] || lines[i].trim().split("")[0].trim();
            const starLine=i+1;
            const {body, endLine }= extractBrarceBlock(lines,i);

            results.push({name, source:body,startLine, endLine});
            i=endLine;
        } else {
            i++;
        }
    }
    return results;
}

function parseRustGo(source, declarationRegex) {
    const lines=source.split("\n");
    const results=[];
    let i=0;
    while(i<lines.length){
        const match=lines[i].match(declarationRegex);
        if(match){
            const name=match[1];
            const startLine=i+1;
            const{body, endLine}=extractBrarceBlock(lines,i);
            results.push({name, source:body, startLine,endLine});
            i=endLine;
        } else {
            i++;
        }
    }
    return results;
}

function parseIndentBased(source, declarationRegex) {
    const lines=source.split("\n");
    const results=[];
    let i=0;
    while(i<lines.length) {
        const match=lines[i].match(declarationRegex);
        if(match) {
            const name=match[1];
            const startLine=i+1;
            const baseIndent=lines[1].match(/^(\s*)/)[1].length;
            let j=i+1;
            while(j<lines.length) {
                const lineIndent=lines[j].match(/^(\s*)/)[1].length;
                const isEmpty =lines[j].trim() === "";
                if(!isEmpty && lineIndent <= baseIndent)
                    break;
                j++;
            }

            const body = lines.slice(i, j).join("\n");
            results.push({ name, source:body, startLine, endLine: j});
            i=j;
        } else {
            i++;
        }
    }
    return results;
}

function extractBrarceBlock(lines, startIndex) {
    let depth=0;
    let started=false;
    let j=startIndex;

    while(j<lines.length) {
        for(const ch of lines[j]) {
            if(ch === "{") {
                depth++;
                started=true;
            }
            if(ch === "}") {
                depth--;
            }
        }
        if(started && depth === 0) {
            const body = lines.slice(startIndex, j+1).join("\n");
            return {body, endLine:j+1};
        }
        j++;
    }

    const body=lines.slice(startIndex, j).join("\n");
    return {body, endLine:j};
}