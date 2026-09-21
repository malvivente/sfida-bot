import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { beginCell, toNano, Address, Cell } from '@ton/core';

export function useTonClashContract() {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();

  const isConnected = !!wallet;
  const userAddress = wallet?.account.address;

  // Deposit Wager into MatchEscrow (Player B)
  const joinMatchOnChain = async (escrowAddress: string, matchId: string, wagerTon: string) => {
    if (!wallet) throw new Error('Wallet non connesso');
    if (!escrowAddress) throw new Error('Indirizzo del contratto MatchEscrow non trovato');

    // Opcode: 1174555988 (0x46026554) (JoinMatch)
    const bodyCell = beginCell()
      .storeUint(1174555988, 32)
      .storeUint(BigInt(matchId), 64)
      .storeAddress(null) // recruiterB null
      .endCell();

    // Wager + 0.05 TON gas buffer so ctx.value in Tact is strictly >= self.wagerAmount
    const totalAmount = toNano(wagerTon) + toNano('0.05');

    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 360,
      messages: [
        {
          address: escrowAddress,
          amount: totalAmount.toString(),
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
    if (!wallet) throw new Error('Wallet non connesso');
    if (!escrowAddress) throw new Error('Indirizzo del contratto MatchEscrow non trovato per piazzare la scommessa');

    // Opcode: 3365506230 (0xc89954b6) (BetSpectator)
    const bodyCell = beginCell()
      .storeUint(3365506230, 32)
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
      throw new Error('Connect your wallet first to create the duel on-chain');
    }

    const masterAddr = clashMasterAddress || (import.meta as any).env?.VITE_CLASH_MASTER_ADDRESS;
    if (!masterAddr) {
      console.warn('[useTonClashContract] CLASH_MASTER_ADDRESS not configured.');
      return null;
    }

    const wagerNano = toNano(wagerTon);
    // Tact contract requirement:
    // - msg.wagerAmount: initial wager deposited into child escrow
    // - ton("0.02"): platform creation fee
    // - ton("0.05"): child contract initial balance & storage reserve
    // - ton("0.08"): gas & network forwarding buffer for deploying the 2KB StateInit BOC
    // Total buffer = 0.15 TON
    const totalRequired = wagerNano + toNano('0.15');

    // Opcode for DeployMatch: 310075029 (0x127b5095)
    const bodyCell = beginCell()
      .storeUint(310075029, 32)
      .storeUint(BigInt(matchId), 64)
      .storeCoins(wagerNano)
      .storeAddress(null) // recruiterA: null (TL-B addr_none 00)
      .storeAddress(null) // groupAdminAddress: null (TL-B addr_none 00)
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
    if (!wallet) throw new Error('Wallet not connected');
    if (!matchEscrowAddress) throw new Error('Missing MatchEscrow address for refund');

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
          amount: toNano('0.05').toString(), // gas fee for processing refund and sweeping dust
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

  // Claim 1v1 Winner Payout on TON Blockchain (ResolveMatch)
  const claimWinnerPayout = async (
    escrowAddress: string,
    matchId: string,
    winnerAddress: string,
    timestamp: number,
    signatureCellBoc: string
  ) => {
    if (!wallet) {
      tonConnectUI.openModal();
      throw new Error('Wallet not connected');
    }
    if (!escrowAddress) throw new Error('Missing MatchEscrow address for prize claim');

    const sigCell = Cell.fromBase64(signatureCellBoc);

    // Opcode for ResolveMatch: 756388397 (0x2d15922d)
    const bodyCell = beginCell()
      .storeUint(756388397, 32)
      .storeUint(BigInt(matchId), 64)
      .storeAddress(Address.parse(winnerAddress))
      .storeUint(timestamp, 32)
      .storeRef(sigCell)
      .endCell();

    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 360,
      messages: [
        {
          address: escrowAddress,
          amount: toNano('0.06').toString(), // 0.06 TON gas for escrow payout distribution
          payload: bodyCell.toBoc().toString('base64'),
        },
      ],
    };

    return await tonConnectUI.sendTransaction(transaction);
  };

  // Send Real Deposit to Platform Smart Contract / Cassa
  const sendDepositTransaction = async (
    targetAddress: string,
    amountGram: string,
    comment?: string
  ) => {
    if (!wallet) {
      tonConnectUI.openModal();
      throw new Error('Please connect your Tonkeeper wallet first');
    }
    if (!targetAddress) {
      throw new Error('Deposit destination address not available');
    }

    const amountNano = toNano(amountGram);
    const commentStr = comment || `Sfida Deposit for ${userAddress}`;
    const bodyCell = beginCell()
      .storeUint(0, 32)
      .storeStringTail(commentStr)
      .endCell();

    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 360,
      messages: [
        {
          address: targetAddress,
          amount: amountNano.toString(),
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
    sendDepositTransaction,
    createMatchOnChain,
    joinMatchOnChain,
    cancelMatchOnChain,
    claimWinnerPayout,
    placeSpectatorBetOnChain,
    claimSpectatorPayout,
    openWalletModal,
  };
}
