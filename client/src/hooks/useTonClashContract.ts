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

  // Deploy / Create Match on TON Blockchain via ClashMaster
  const createMatchOnChain = async (
    matchId: string,
    wagerTon: string,
    clashMasterAddress?: string
  ) => {
    if (!wallet) {
      tonConnectUI.openModal();
      throw new Error('Connetti prima il tuo wallet per creare la sfida on-chain');
    }

    const masterAddr = clashMasterAddress || (import.meta as any).env?.VITE_CLASH_MASTER_ADDRESS;
    if (!masterAddr) {
      console.warn('[useTonClashContract] CLASH_MASTER_ADDRESS non configurato.');
      return null;
    }

    const wagerNano = toNano(wagerTon);
    // Tact contract requirement: msg.wagerAmount + ton("0.02") creation fee + ton("0.05") deployment gas
    const totalRequired = wagerNano + toNano('0.07');

    // Opcode for DeployMatch: 310075029 (0x127b5095)
    const bodyCell = beginCell()
      .storeUint(310075029, 32)
      .storeUint(BigInt(matchId), 64)
      .storeCoins(wagerNano)
      .storeBit(0) // recruiterA: null
      .storeBit(0) // groupAdminAddress: null
      .endCell();

    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 360,
      messages: [
        {
          address: masterAddr,
          amount: totalRequired.toString(),
          payload: bodyCell.toBoc().toString('base64'),
        },
      ],
    };

    return await tonConnectUI.sendTransaction(transaction);
  };

  // Cancel Match on TON Blockchain (Player A only, before Player B joins)
  const cancelMatchOnChain = async (
    matchEscrowAddress: string,
    matchId: string
  ) => {
    if (!wallet) throw new Error('Wallet non connesso');

    // Opcode for CancelMatch: 2731538680 (0xa2cf00f8)
    const reasonCell = beginCell().storeStringTail('Player A Cancellation').endCell();
    const emptySigCell = beginCell().endCell();

    const bodyCell = beginCell()
      .storeUint(2731538680, 32)
      .storeUint(BigInt(matchId), 64)
      .storeRef(reasonCell)
      .storeRef(emptySigCell)
      .endCell();

    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 360,
      messages: [
        {
          address: matchEscrowAddress,
          amount: toNano('0.03').toString(), // gas fee
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

  const openWalletModal = () => {
    tonConnectUI.openModal();
  };

  return {
    isConnected,
    userAddress,
    createMatchOnChain,
    joinMatchOnChain,
    cancelMatchOnChain,
    placeSpectatorBetOnChain,
    claimSpectatorPayout,
    openWalletModal,
  };
}
