import { toNano, Address } from '@ton/core';
import { ClashMaster } from '../build/clash_master/clash_master_ClashMaster';
import { NetworkProvider } from '@ton/blueprint';
import { keyPairFromSeed } from '@ton/crypto';
import dotenv from 'dotenv';
import path from 'path';
// Load .env from root, server, and current directories
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
if (typeof __dirname !== 'undefined') {
    dotenv.config({ path: path.resolve(__dirname, '../../.env') });
    dotenv.config({ path: path.resolve(__dirname, '../../server/.env') });
    dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

export async function run(provider: NetworkProvider) {
    const deployer = provider.sender().address;
    if (!deployer) {
        throw new Error('Deployer wallet address not available from provider.');
    }

    // 1. Treasury / Owner Address (Default: deployer's wallet)
    const ownerAddress = process.env.OWNER_ADDRESS
        ? Address.parse(process.env.OWNER_ADDRESS)
        : deployer;

    // 2. Server Ed25519 Public Key
    let seed: Buffer;
    const seedHex = process.env.SERVER_SIGNER_SEED;
    if (seedHex && seedHex.length >= 64) {
        seed = Buffer.from(seedHex.slice(0, 64), 'hex');
    } else {
        console.log('⚠️ SERVER_SIGNER_SEED non impostato nel .env! Uso seed predefinito di test (Buffer.alloc(32, 7)).');
        seed = Buffer.alloc(32, 7);
    }

    const keypair = keyPairFromSeed(seed);
    const serverPublicKeyBigInt = BigInt('0x' + keypair.publicKey.toString('hex'));

    console.log(`\n========================================`);
    console.log(`🚀 Deploying SfidaBot ClashMaster Factory`);
    console.log(`========================================`);
    console.log(`- Owner / Treasury Wallet: ${ownerAddress.toString()}`);
    console.log(`- Server Public Key (Hex): ${keypair.publicKey.toString('hex')}`);
    console.log(`- Server Public Key (BigInt): ${serverPublicKeyBigInt.toString()}`);
    console.log(`========================================\n`);

    const clashMaster = provider.open(
        await ClashMaster.fromInit(ownerAddress, serverPublicKeyBigInt)
    );

    await clashMaster.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        null
    );

    await provider.waitForDeploy(clashMaster.address);

    console.log(`\n✅ ClashMaster distribuito con successo sul network TON!`);
    console.log(`📍 Contract Address (Testnet/Mainnet):`);
    console.log(`   ${clashMaster.address.toString()}`);
    console.log(`\n👉 Configurazione .env:`);
    console.log(`CLASH_MASTER_ADDRESS=${clashMaster.address.toString()}`);
    console.log(`SERVER_SIGNER_SEED=${seed.toString('hex')}`);
}
