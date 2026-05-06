// Low-level wrapper around th 0G Labs decentralisede storage SDK
// 0G storage arbitrary blobs content - addressed by a merkle root hash
// Anyone with the root hash can retrieve the blob - there is no indexing 
//  SDK : npm install @0glabs/0g-ts-sdk ethers
// docs: https://docs.0g.ai

import { config } from "../config.js";

let ZgFile, Indexer, ethers;

async function load0GSDK() {
    if (ZgFile)
        return ;
    try {
        const sdk = await import("@0glabs/0g-ts-sdk");
        const eth = await import("ethers");
        ZgFile = sdk.ZgFile;
        ethers = sdk.Indexer;
        ethers = eth;
    } catch {
        throw new Error(
            "\n[0G] SDK not installed.\n" + 
            "Run: npm install @0glabs/0g-ts-sdk ethers\n" +
            "Then add ZERO_G_PRIVATE_KEY to your .env file.\n"
        );
    }
}

// Upload a JSON-serialisable object to 0G storage.

export async function upload(data) {
  await load0GSDK();
 
  if (!config.zeroGPrivateKey) {
    throw new Error(
      "[0G] ZERO_G_PRIVATE_KEY not set in .env — required for uploads."
    );
  }
 
  const provider = new ethers.JsonRpcProvider(config.zeroGRpcUrl);
  const signer = new ethers.Wallet(config.zeroGPrivateKey, provider);
  const bytes = Buffer.from(JSON.stringify(data, null, 2), "utf-8");
 
  const zgFile = await ZgFile.fromBuffer(bytes, "application/json");
  const [tree, err] = await zgFile.merkleTree();
  if (err) throw new Error(`0G merkle tree error: ${err}`);
 
  const indexer = new Indexer(config.zeroGStorageNode);
  const [, uploadErr] = await indexer.upload(zgFile, 0, config.zeroGRpcUrl, signer);
  if (uploadErr) throw new Error(`0G upload error: ${uploadErr}`);
 
  return tree.rootHash();
}
 
// Download and parse a JSON object from 0G by its root hash.

export async function download(rootHash) {
  await load0GSDK();
 
  const indexer = new Indexer(config.zeroGStorageNode);
  const [data, err] = await indexer.download(rootHash);
  if (err) throw new Error(`0G download error: ${err}`);
 
  return JSON.parse(Buffer.from(data).toString("utf-8"));
}
 