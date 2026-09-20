import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { beginCell, toNano, Address } from '@ton/core';

export function useTonClashContract() {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();

  const isConnected = !!wallet;
  const userAddress = wallet?.account.address;

  // Deposit Wager into MatchEscrow
  const joinMatchOnChain = async (escrowAddress: string, matchId: string, wagerTon: string) => {
    if (!wallet) throw new Error('Wallet not connected');

    // Construct JoinMatch internal message cell
    // Opcode: 0x47b56dc6 (JoinMatch)
    const bodyCell = beginCell()
      .storeUint(0x47b56dc6, 32)
      .storeUint(BigInt(matchId), 64)
      .storeBit(0) // recruiterB null
      .endCell();

    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 360,
      messages: [
        {
          address: escrowAddress,
          amount: toNano(wagerTon).toString(),
          payload: bodyCell.toBoc().toString('base64'),
        },
      ],
    };

    return await tonConnectUI.sendTransaction(transaction);
  };

  // Place Spectator Pari-Mutuel Bet
  const placeSpectatorBetOnChain = async (
    escrowAddress: string,
    matchId: string,
    targetPlayerAddress: string,
    betAmountTon: string
  ) => {
    if (!wallet) throw new Error('Wallet not connected');

    // Opcode: 0x6e73f4e1 (BetSpectator)
    const bodyCell = beginCell()
      .storeUint(0x6e73f4e1, 32)
      .storeUint(BigInt(matchId), 64)
      .storeAddress(Address.parse(targetPlayerAddress))
      .endCell();

    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 360,
      messages: [
        {
          address: escrowAddress,
          amount: toNano(betAmountTon).toString(),
          payload: bodyCell.toBoc().toString('base64'),
        },
      ],
    };

    return await tonConnectUI.sendTransaction(transaction);
  };

  // Claim Spectator Totalizer Payout
  const claimSpectatorPayout = async (escrowAddress: string, matchId: string) => {
    if (!wallet) throw new Error('Wallet not connected');

    // Opcode: 0x1f94ea51 (ClaimSpectatorReward)
    const bodyCell = beginCell()
      .storeUint(0x1f94ea51, 32)
      .storeUint(BigInt(matchId), 64)
      .endCell();

    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 360,
      messages: [
        {
          address: escrowAddress,
          amount: toNano('0.05').toString(), // gas fee
          payload: bodyCell.toBoc().toString('base64'),
        },
      ],
    };

    return await tonConnectUI.sendTransaction(transaction);
  };

  return {
    isConnected,
    userAddress,
    joinMatchOnChain,
    placeSpectatorBetOnChain,
    claimSpectatorPayout,
  };
}
