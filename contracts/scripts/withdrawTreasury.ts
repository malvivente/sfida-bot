import { toNano, Address } from '@ton/core';
import { ClashMaster } from '../build/clash_master/clash_master_ClashMaster';
import { NetworkProvider } from '@ton/blueprint';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });

export async function run(provider: NetworkProvider) {
    const sender = provider.sender();
    const deployerAddress = sender.address;
    if (!deployerAddress) {
        throw new Error('Deployer wallet address not available from provider.');
    }

    const clashMasterAddressStr = process.env.CLASH_MASTER_ADDRESS;
    if (!clashMasterAddressStr) {
        throw new Error('CLASH_MASTER_ADDRESS non configurato nel .env.');
    }

    const clashMasterAddress = Address.parse(clashMasterAddressStr);
    const clashMaster = provider.open(ClashMaster.fromAddress(clashMasterAddress));

    console.log(`\n========================================`);
    console.log(`🏦 SfidaBot ClashMaster Treasury Withdrawal`);
    console.log(`========================================`);
    console.log(`- ClashMaster Address: ${clashMasterAddress.toString()}`);
    console.log(`- Caller / Recipient:  ${deployerAddress.toString()}`);

    const stats = await clashMaster.getGetStats();
    console.log(`- Contract Balance:    ${Number(stats.balance) / 1e9} TON`);
    console.log(`- Contract Matches:    ${stats.matchCount}`);
    console.log(`- Contract Owner:      ${stats.owner.toString()}`);
    console.log(`========================================\n`);

    const reserve = toNano('0.15'); // keep 0.15 TON in reserve for storage rent
    if (stats.balance <= reserve) {
        console.log(`ℹ️ Il saldo del contratto (${Number(stats.balance) / 1e9} TON) è inferiore o uguale alla riserva minima (0.15 TON).`);
        console.log(`Nessun prelievo necessario.`);
        return;
    }

    const withdrawAmount = stats.balance - reserve;
    console.log(`🚀 Prelievo in corso di ${Number(withdrawAmount) / 1e9} TON verso ${deployerAddress.toString()}...`);

    await clashMaster.send(
        sender,
        {
            value: toNano('0.05'), // gas per il messaggio di prelievo
        },
        {
            $$type: 'WithdrawTreasury',
            amount: withdrawAmount,
            recipient: deployerAddress,
        }
    );

    console.log(`✅ Richiesta di prelievo inviata con successo! I fondi appariranno a breve sul tuo wallet.`);
}
