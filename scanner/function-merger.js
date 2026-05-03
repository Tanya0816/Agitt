// it merges pass 1 and pass 2 findings 
// pass2 findings overrides pass1 if both pass1 and pass2 have same function 

const Severity_order=["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"];

export function mergeFindings(pass1Findings =[], pass2Findings=[]) {
    const map =new Map();
    for(const findings of pass1Findings) {
        const key=dedupeKey(finding);
        map.set(key, finding);
    }

    for(const finding of pass2Findings) {
        const key=dedupeKey(finding);
        const existing=map.get(key);

        if(!existing) {
            map.set(key, finding);
        } else {
            const existingRank=Severity_order.indexOf(existing.severity);
            const newRank=Severity_order.indexOf(finding.severity);
            if(newRank <= existingRank) {
                map.set(key, finding);
            }
        }
    }

    const sorted=[...map.values()].sort((a,b) => {
        return Severity_order.indexOf(a.severity)-Severity_order.indexOf(b.severity);
    });
    return sorted.map((f, i) => ({
        ...f,
        id: `F-${String(i+1).padStart(2, "0")}`,
    }));
}
