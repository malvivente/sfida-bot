import {
    Cell,
    Slice,
    Address,
    Builder,
    beginCell,
    ComputeError,
    TupleItem,
    TupleReader,
    Dictionary,
    contractAddress,
    address,
    ContractProvider,
    Sender,
    Contract,
    ContractABI,
    ABIType,
    ABIGetter,
    ABIReceiver,
    TupleBuilder,
    DictionaryValue
} from '@ton/core';

export type DataSize = {
    $$type: 'DataSize';
    cells: bigint;
    bits: bigint;
    refs: bigint;
}

export function storeDataSize(src: DataSize) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.cells, 257);
        b_0.storeInt(src.bits, 257);
        b_0.storeInt(src.refs, 257);
    };
}

export function loadDataSize(slice: Slice) {
    const sc_0 = slice;
    const _cells = sc_0.loadIntBig(257);
    const _bits = sc_0.loadIntBig(257);
    const _refs = sc_0.loadIntBig(257);
    return { $$type: 'DataSize' as const, cells: _cells, bits: _bits, refs: _refs };
}

export function loadTupleDataSize(source: TupleReader) {
    const _cells = source.readBigNumber();
    const _bits = source.readBigNumber();
    const _refs = source.readBigNumber();
    return { $$type: 'DataSize' as const, cells: _cells, bits: _bits, refs: _refs };
}

export function loadGetterTupleDataSize(source: TupleReader) {
    const _cells = source.readBigNumber();
    const _bits = source.readBigNumber();
    const _refs = source.readBigNumber();
    return { $$type: 'DataSize' as const, cells: _cells, bits: _bits, refs: _refs };
}

export function storeTupleDataSize(source: DataSize) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.cells);
    builder.writeNumber(source.bits);
    builder.writeNumber(source.refs);
    return builder.build();
}

export function dictValueParserDataSize(): DictionaryValue<DataSize> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDataSize(src)).endCell());
        },
        parse: (src) => {
            return loadDataSize(src.loadRef().beginParse());
        }
    }
}

export type SignedBundle = {
    $$type: 'SignedBundle';
    signature: Buffer;
    signedData: Slice;
}

export function storeSignedBundle(src: SignedBundle) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeBuffer(src.signature);
        b_0.storeBuilder(src.signedData.asBuilder());
    };
}

export function loadSignedBundle(slice: Slice) {
    const sc_0 = slice;
    const _signature = sc_0.loadBuffer(64);
    const _signedData = sc_0;
    return { $$type: 'SignedBundle' as const, signature: _signature, signedData: _signedData };
}

export function loadTupleSignedBundle(source: TupleReader) {
    const _signature = source.readBuffer();
    const _signedData = source.readCell().asSlice();
    return { $$type: 'SignedBundle' as const, signature: _signature, signedData: _signedData };
}

export function loadGetterTupleSignedBundle(source: TupleReader) {
    const _signature = source.readBuffer();
    const _signedData = source.readCell().asSlice();
    return { $$type: 'SignedBundle' as const, signature: _signature, signedData: _signedData };
}

export function storeTupleSignedBundle(source: SignedBundle) {
    const builder = new TupleBuilder();
    builder.writeBuffer(source.signature);
    builder.writeSlice(source.signedData.asCell());
    return builder.build();
}

export function dictValueParserSignedBundle(): DictionaryValue<SignedBundle> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSignedBundle(src)).endCell());
        },
        parse: (src) => {
            return loadSignedBundle(src.loadRef().beginParse());
        }
    }
}

export type StateInit = {
    $$type: 'StateInit';
    code: Cell;
    data: Cell;
}

export function storeStateInit(src: StateInit) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeRef(src.code);
        b_0.storeRef(src.data);
    };
}

export function loadStateInit(slice: Slice) {
    const sc_0 = slice;
    const _code = sc_0.loadRef();
    const _data = sc_0.loadRef();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

export function loadTupleStateInit(source: TupleReader) {
    const _code = source.readCell();
    const _data = source.readCell();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

export function loadGetterTupleStateInit(source: TupleReader) {
    const _code = source.readCell();
    const _data = source.readCell();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

export function storeTupleStateInit(source: StateInit) {
    const builder = new TupleBuilder();
    builder.writeCell(source.code);
    builder.writeCell(source.data);
    return builder.build();
}

export function dictValueParserStateInit(): DictionaryValue<StateInit> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeStateInit(src)).endCell());
        },
        parse: (src) => {
            return loadStateInit(src.loadRef().beginParse());
        }
    }
}

export type Context = {
    $$type: 'Context';
    bounceable: boolean;
    sender: Address;
    value: bigint;
    raw: Slice;
}

export function storeContext(src: Context) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeBit(src.bounceable);
        b_0.storeAddress(src.sender);
        b_0.storeInt(src.value, 257);
        b_0.storeRef(src.raw.asCell());
    };
}

export function loadContext(slice: Slice) {
    const sc_0 = slice;
    const _bounceable = sc_0.loadBit();
    const _sender = sc_0.loadAddress();
    const _value = sc_0.loadIntBig(257);
    const _raw = sc_0.loadRef().asSlice();
    return { $$type: 'Context' as const, bounceable: _bounceable, sender: _sender, value: _value, raw: _raw };
}

export function loadTupleContext(source: TupleReader) {
    const _bounceable = source.readBoolean();
    const _sender = source.readAddress();
    const _value = source.readBigNumber();
    const _raw = source.readCell().asSlice();
    return { $$type: 'Context' as const, bounceable: _bounceable, sender: _sender, value: _value, raw: _raw };
}

export function loadGetterTupleContext(source: TupleReader) {
    const _bounceable = source.readBoolean();
    const _sender = source.readAddress();
    const _value = source.readBigNumber();
    const _raw = source.readCell().asSlice();
    return { $$type: 'Context' as const, bounceable: _bounceable, sender: _sender, value: _value, raw: _raw };
}

export function storeTupleContext(source: Context) {
    const builder = new TupleBuilder();
    builder.writeBoolean(source.bounceable);
    builder.writeAddress(source.sender);
    builder.writeNumber(source.value);
    builder.writeSlice(source.raw.asCell());
    return builder.build();
}

export function dictValueParserContext(): DictionaryValue<Context> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeContext(src)).endCell());
        },
        parse: (src) => {
            return loadContext(src.loadRef().beginParse());
        }
    }
}

export type SendParameters = {
    $$type: 'SendParameters';
    mode: bigint;
    body: Cell | null;
    code: Cell | null;
    data: Cell | null;
    value: bigint;
    to: Address;
    bounce: boolean;
}

export function storeSendParameters(src: SendParameters) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.mode, 257);
        if (src.body !== null && src.body !== undefined) { b_0.storeBit(true).storeRef(src.body); } else { b_0.storeBit(false); }
        if (src.code !== null && src.code !== undefined) { b_0.storeBit(true).storeRef(src.code); } else { b_0.storeBit(false); }
        if (src.data !== null && src.data !== undefined) { b_0.storeBit(true).storeRef(src.data); } else { b_0.storeBit(false); }
        b_0.storeInt(src.value, 257);
        b_0.storeAddress(src.to);
        b_0.storeBit(src.bounce);
    };
}

export function loadSendParameters(slice: Slice) {
    const sc_0 = slice;
    const _mode = sc_0.loadIntBig(257);
    const _body = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _code = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _data = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _value = sc_0.loadIntBig(257);
    const _to = sc_0.loadAddress();
    const _bounce = sc_0.loadBit();
    return { $$type: 'SendParameters' as const, mode: _mode, body: _body, code: _code, data: _data, value: _value, to: _to, bounce: _bounce };
}

export function loadTupleSendParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _code = source.readCellOpt();
    const _data = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'SendParameters' as const, mode: _mode, body: _body, code: _code, data: _data, value: _value, to: _to, bounce: _bounce };
}

export function loadGetterTupleSendParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _code = source.readCellOpt();
    const _data = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'SendParameters' as const, mode: _mode, body: _body, code: _code, data: _data, value: _value, to: _to, bounce: _bounce };
}

export function storeTupleSendParameters(source: SendParameters) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.mode);
    builder.writeCell(source.body);
    builder.writeCell(source.code);
    builder.writeCell(source.data);
    builder.writeNumber(source.value);
    builder.writeAddress(source.to);
    builder.writeBoolean(source.bounce);
    return builder.build();
}

export function dictValueParserSendParameters(): DictionaryValue<SendParameters> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSendParameters(src)).endCell());
        },
        parse: (src) => {
            return loadSendParameters(src.loadRef().beginParse());
        }
    }
}

export type MessageParameters = {
    $$type: 'MessageParameters';
    mode: bigint;
    body: Cell | null;
    value: bigint;
    to: Address;
    bounce: boolean;
}

export function storeMessageParameters(src: MessageParameters) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.mode, 257);
        if (src.body !== null && src.body !== undefined) { b_0.storeBit(true).storeRef(src.body); } else { b_0.storeBit(false); }
        b_0.storeInt(src.value, 257);
        b_0.storeAddress(src.to);
        b_0.storeBit(src.bounce);
    };
}

export function loadMessageParameters(slice: Slice) {
    const sc_0 = slice;
    const _mode = sc_0.loadIntBig(257);
    const _body = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _value = sc_0.loadIntBig(257);
    const _to = sc_0.loadAddress();
    const _bounce = sc_0.loadBit();
    return { $$type: 'MessageParameters' as const, mode: _mode, body: _body, value: _value, to: _to, bounce: _bounce };
}

export function loadTupleMessageParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'MessageParameters' as const, mode: _mode, body: _body, value: _value, to: _to, bounce: _bounce };
}

export function loadGetterTupleMessageParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'MessageParameters' as const, mode: _mode, body: _body, value: _value, to: _to, bounce: _bounce };
}

export function storeTupleMessageParameters(source: MessageParameters) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.mode);
    builder.writeCell(source.body);
    builder.writeNumber(source.value);
    builder.writeAddress(source.to);
    builder.writeBoolean(source.bounce);
    return builder.build();
}

export function dictValueParserMessageParameters(): DictionaryValue<MessageParameters> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeMessageParameters(src)).endCell());
        },
        parse: (src) => {
            return loadMessageParameters(src.loadRef().beginParse());
        }
    }
}

export type DeployParameters = {
    $$type: 'DeployParameters';
    mode: bigint;
    body: Cell | null;
    value: bigint;
    bounce: boolean;
    init: StateInit;
}

export function storeDeployParameters(src: DeployParameters) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.mode, 257);
        if (src.body !== null && src.body !== undefined) { b_0.storeBit(true).storeRef(src.body); } else { b_0.storeBit(false); }
        b_0.storeInt(src.value, 257);
        b_0.storeBit(src.bounce);
        b_0.store(storeStateInit(src.init));
    };
}

export function loadDeployParameters(slice: Slice) {
    const sc_0 = slice;
    const _mode = sc_0.loadIntBig(257);
    const _body = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _value = sc_0.loadIntBig(257);
    const _bounce = sc_0.loadBit();
    const _init = loadStateInit(sc_0);
    return { $$type: 'DeployParameters' as const, mode: _mode, body: _body, value: _value, bounce: _bounce, init: _init };
}

export function loadTupleDeployParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _bounce = source.readBoolean();
    const _init = loadTupleStateInit(source);
    return { $$type: 'DeployParameters' as const, mode: _mode, body: _body, value: _value, bounce: _bounce, init: _init };
}

export function loadGetterTupleDeployParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _bounce = source.readBoolean();
    const _init = loadGetterTupleStateInit(source);
    return { $$type: 'DeployParameters' as const, mode: _mode, body: _body, value: _value, bounce: _bounce, init: _init };
}

export function storeTupleDeployParameters(source: DeployParameters) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.mode);
    builder.writeCell(source.body);
    builder.writeNumber(source.value);
    builder.writeBoolean(source.bounce);
    builder.writeTuple(storeTupleStateInit(source.init));
    return builder.build();
}

export function dictValueParserDeployParameters(): DictionaryValue<DeployParameters> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDeployParameters(src)).endCell());
        },
        parse: (src) => {
            return loadDeployParameters(src.loadRef().beginParse());
        }
    }
}

export type StdAddress = {
    $$type: 'StdAddress';
    workchain: bigint;
    address: bigint;
}

export function storeStdAddress(src: StdAddress) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.workchain, 8);
        b_0.storeUint(src.address, 256);
    };
}

export function loadStdAddress(slice: Slice) {
    const sc_0 = slice;
    const _workchain = sc_0.loadIntBig(8);
    const _address = sc_0.loadUintBig(256);
    return { $$type: 'StdAddress' as const, workchain: _workchain, address: _address };
}

export function loadTupleStdAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readBigNumber();
    return { $$type: 'StdAddress' as const, workchain: _workchain, address: _address };
}

export function loadGetterTupleStdAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readBigNumber();
    return { $$type: 'StdAddress' as const, workchain: _workchain, address: _address };
}

export function storeTupleStdAddress(source: StdAddress) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.workchain);
    builder.writeNumber(source.address);
    return builder.build();
}

export function dictValueParserStdAddress(): DictionaryValue<StdAddress> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeStdAddress(src)).endCell());
        },
        parse: (src) => {
            return loadStdAddress(src.loadRef().beginParse());
        }
    }
}

export type VarAddress = {
    $$type: 'VarAddress';
    workchain: bigint;
    address: Slice;
}

export function storeVarAddress(src: VarAddress) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.workchain, 32);
        b_0.storeRef(src.address.asCell());
    };
}

export function loadVarAddress(slice: Slice) {
    const sc_0 = slice;
    const _workchain = sc_0.loadIntBig(32);
    const _address = sc_0.loadRef().asSlice();
    return { $$type: 'VarAddress' as const, workchain: _workchain, address: _address };
}

export function loadTupleVarAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readCell().asSlice();
    return { $$type: 'VarAddress' as const, workchain: _workchain, address: _address };
}

export function loadGetterTupleVarAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readCell().asSlice();
    return { $$type: 'VarAddress' as const, workchain: _workchain, address: _address };
}

export function storeTupleVarAddress(source: VarAddress) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.workchain);
    builder.writeSlice(source.address.asCell());
    return builder.build();
}

export function dictValueParserVarAddress(): DictionaryValue<VarAddress> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeVarAddress(src)).endCell());
        },
        parse: (src) => {
            return loadVarAddress(src.loadRef().beginParse());
        }
    }
}

export type BasechainAddress = {
    $$type: 'BasechainAddress';
    hash: bigint | null;
}

export function storeBasechainAddress(src: BasechainAddress) {
    return (builder: Builder) => {
        const b_0 = builder;
        if (src.hash !== null && src.hash !== undefined) { b_0.storeBit(true).storeInt(src.hash, 257); } else { b_0.storeBit(false); }
    };
}

export function loadBasechainAddress(slice: Slice) {
    const sc_0 = slice;
    const _hash = sc_0.loadBit() ? sc_0.loadIntBig(257) : null;
    return { $$type: 'BasechainAddress' as const, hash: _hash };
}

export function loadTupleBasechainAddress(source: TupleReader) {
    const _hash = source.readBigNumberOpt();
    return { $$type: 'BasechainAddress' as const, hash: _hash };
}

export function loadGetterTupleBasechainAddress(source: TupleReader) {
    const _hash = source.readBigNumberOpt();
    return { $$type: 'BasechainAddress' as const, hash: _hash };
}

export function storeTupleBasechainAddress(source: BasechainAddress) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.hash);
    return builder.build();
}

export function dictValueParserBasechainAddress(): DictionaryValue<BasechainAddress> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeBasechainAddress(src)).endCell());
        },
        parse: (src) => {
            return loadBasechainAddress(src.loadRef().beginParse());
        }
    }
}

export type DeployMatch = {
    $$type: 'DeployMatch';
    matchId: bigint;
    wagerAmount: bigint;
    recruiterA: Address | null;
    groupAdminAddress: Address | null;
}

export function storeDeployMatch(src: DeployMatch) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(310075029, 32);
        b_0.storeUint(src.matchId, 64);
        b_0.storeCoins(src.wagerAmount);
        b_0.storeAddress(src.recruiterA);
        b_0.storeAddress(src.groupAdminAddress);
    };
}

export function loadDeployMatch(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 310075029) { throw Error('Invalid prefix'); }
    const _matchId = sc_0.loadUintBig(64);
    const _wagerAmount = sc_0.loadCoins();
    const _recruiterA = sc_0.loadMaybeAddress();
    const _groupAdminAddress = sc_0.loadMaybeAddress();
    return { $$type: 'DeployMatch' as const, matchId: _matchId, wagerAmount: _wagerAmount, recruiterA: _recruiterA, groupAdminAddress: _groupAdminAddress };
}

export function loadTupleDeployMatch(source: TupleReader) {
    const _matchId = source.readBigNumber();
    const _wagerAmount = source.readBigNumber();
    const _recruiterA = source.readAddressOpt();
    const _groupAdminAddress = source.readAddressOpt();
    return { $$type: 'DeployMatch' as const, matchId: _matchId, wagerAmount: _wagerAmount, recruiterA: _recruiterA, groupAdminAddress: _groupAdminAddress };
}

export function loadGetterTupleDeployMatch(source: TupleReader) {
    const _matchId = source.readBigNumber();
    const _wagerAmount = source.readBigNumber();
    const _recruiterA = source.readAddressOpt();
    const _groupAdminAddress = source.readAddressOpt();
    return { $$type: 'DeployMatch' as const, matchId: _matchId, wagerAmount: _wagerAmount, recruiterA: _recruiterA, groupAdminAddress: _groupAdminAddress };
}

export function storeTupleDeployMatch(source: DeployMatch) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.matchId);
    builder.writeNumber(source.wagerAmount);
    builder.writeAddress(source.recruiterA);
    builder.writeAddress(source.groupAdminAddress);
    return builder.build();
}

export function dictValueParserDeployMatch(): DictionaryValue<DeployMatch> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDeployMatch(src)).endCell());
        },
        parse: (src) => {
            return loadDeployMatch(src.loadRef().beginParse());
        }
    }
}

export type JoinMatch = {
    $$type: 'JoinMatch';
    matchId: bigint;
    recruiterB: Address | null;
}

export function storeJoinMatch(src: JoinMatch) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1174555988, 32);
        b_0.storeUint(src.matchId, 64);
        b_0.storeAddress(src.recruiterB);
    };
}

export function loadJoinMatch(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1174555988) { throw Error('Invalid prefix'); }
    const _matchId = sc_0.loadUintBig(64);
    const _recruiterB = sc_0.loadMaybeAddress();
    return { $$type: 'JoinMatch' as const, matchId: _matchId, recruiterB: _recruiterB };
}

export function loadTupleJoinMatch(source: TupleReader) {
    const _matchId = source.readBigNumber();
    const _recruiterB = source.readAddressOpt();
    return { $$type: 'JoinMatch' as const, matchId: _matchId, recruiterB: _recruiterB };
}

export function loadGetterTupleJoinMatch(source: TupleReader) {
    const _matchId = source.readBigNumber();
    const _recruiterB = source.readAddressOpt();
    return { $$type: 'JoinMatch' as const, matchId: _matchId, recruiterB: _recruiterB };
}

export function storeTupleJoinMatch(source: JoinMatch) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.matchId);
    builder.writeAddress(source.recruiterB);
    return builder.build();
}

export function dictValueParserJoinMatch(): DictionaryValue<JoinMatch> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeJoinMatch(src)).endCell());
        },
        parse: (src) => {
            return loadJoinMatch(src.loadRef().beginParse());
        }
    }
}

export type BetSpectator = {
    $$type: 'BetSpectator';
    matchId: bigint;
    targetPlayer: Address;
}

export function storeBetSpectator(src: BetSpectator) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(3365506230, 32);
        b_0.storeUint(src.matchId, 64);
        b_0.storeAddress(src.targetPlayer);
    };
}

export function loadBetSpectator(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 3365506230) { throw Error('Invalid prefix'); }
    const _matchId = sc_0.loadUintBig(64);
    const _targetPlayer = sc_0.loadAddress();
    return { $$type: 'BetSpectator' as const, matchId: _matchId, targetPlayer: _targetPlayer };
}

export function loadTupleBetSpectator(source: TupleReader) {
    const _matchId = source.readBigNumber();
    const _targetPlayer = source.readAddress();
    return { $$type: 'BetSpectator' as const, matchId: _matchId, targetPlayer: _targetPlayer };
}

export function loadGetterTupleBetSpectator(source: TupleReader) {
    const _matchId = source.readBigNumber();
    const _targetPlayer = source.readAddress();
    return { $$type: 'BetSpectator' as const, matchId: _matchId, targetPlayer: _targetPlayer };
}

export function storeTupleBetSpectator(source: BetSpectator) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.matchId);
    builder.writeAddress(source.targetPlayer);
    return builder.build();
}

export function dictValueParserBetSpectator(): DictionaryValue<BetSpectator> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeBetSpectator(src)).endCell());
        },
        parse: (src) => {
            return loadBetSpectator(src.loadRef().beginParse());
        }
    }
}

export type ResolveMatch = {
    $$type: 'ResolveMatch';
    matchId: bigint;
    winner: Address;
    timestamp: bigint;
    signature: Slice;
}

export function storeResolveMatch(src: ResolveMatch) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(756388397, 32);
        b_0.storeUint(src.matchId, 64);
        b_0.storeAddress(src.winner);
        b_0.storeUint(src.timestamp, 32);
        b_0.storeRef(src.signature.asCell());
    };
}

export function loadResolveMatch(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 756388397) { throw Error('Invalid prefix'); }
    const _matchId = sc_0.loadUintBig(64);
    const _winner = sc_0.loadAddress();
    const _timestamp = sc_0.loadUintBig(32);
    const _signature = sc_0.loadRef().asSlice();
    return { $$type: 'ResolveMatch' as const, matchId: _matchId, winner: _winner, timestamp: _timestamp, signature: _signature };
}

export function loadTupleResolveMatch(source: TupleReader) {
    const _matchId = source.readBigNumber();
    const _winner = source.readAddress();
    const _timestamp = source.readBigNumber();
    const _signature = source.readCell().asSlice();
    return { $$type: 'ResolveMatch' as const, matchId: _matchId, winner: _winner, timestamp: _timestamp, signature: _signature };
}

export function loadGetterTupleResolveMatch(source: TupleReader) {
    const _matchId = source.readBigNumber();
    const _winner = source.readAddress();
    const _timestamp = source.readBigNumber();
    const _signature = source.readCell().asSlice();
    return { $$type: 'ResolveMatch' as const, matchId: _matchId, winner: _winner, timestamp: _timestamp, signature: _signature };
}

export function storeTupleResolveMatch(source: ResolveMatch) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.matchId);
    builder.writeAddress(source.winner);
    builder.writeNumber(source.timestamp);
    builder.writeSlice(source.signature.asCell());
    return builder.build();
}

export function dictValueParserResolveMatch(): DictionaryValue<ResolveMatch> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeResolveMatch(src)).endCell());
        },
        parse: (src) => {
            return loadResolveMatch(src.loadRef().beginParse());
        }
    }
}

export type ClaimSpectatorReward = {
    $$type: 'ClaimSpectatorReward';
    matchId: bigint;
}

export function storeClaimSpectatorReward(src: ClaimSpectatorReward) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(3249897020, 32);
        b_0.storeUint(src.matchId, 64);
    };
}

export function loadClaimSpectatorReward(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 3249897020) { throw Error('Invalid prefix'); }
    const _matchId = sc_0.loadUintBig(64);
    return { $$type: 'ClaimSpectatorReward' as const, matchId: _matchId };
}

export function loadTupleClaimSpectatorReward(source: TupleReader) {
    const _matchId = source.readBigNumber();
    return { $$type: 'ClaimSpectatorReward' as const, matchId: _matchId };
}

export function loadGetterTupleClaimSpectatorReward(source: TupleReader) {
    const _matchId = source.readBigNumber();
    return { $$type: 'ClaimSpectatorReward' as const, matchId: _matchId };
}

export function storeTupleClaimSpectatorReward(source: ClaimSpectatorReward) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.matchId);
    return builder.build();
}

export function dictValueParserClaimSpectatorReward(): DictionaryValue<ClaimSpectatorReward> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeClaimSpectatorReward(src)).endCell());
        },
        parse: (src) => {
            return loadClaimSpectatorReward(src.loadRef().beginParse());
        }
    }
}

export type CancelMatch = {
    $$type: 'CancelMatch';
    matchId: bigint;
    reason: string;
    signature: Slice;
}

export function storeCancelMatch(src: CancelMatch) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2731538680, 32);
        b_0.storeUint(src.matchId, 64);
        b_0.storeStringRefTail(src.reason);
        b_0.storeRef(src.signature.asCell());
    };
}

export function loadCancelMatch(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2731538680) { throw Error('Invalid prefix'); }
    const _matchId = sc_0.loadUintBig(64);
    const _reason = sc_0.loadStringRefTail();
    const _signature = sc_0.loadRef().asSlice();
    return { $$type: 'CancelMatch' as const, matchId: _matchId, reason: _reason, signature: _signature };
}

export function loadTupleCancelMatch(source: TupleReader) {
    const _matchId = source.readBigNumber();
    const _reason = source.readString();
    const _signature = source.readCell().asSlice();
    return { $$type: 'CancelMatch' as const, matchId: _matchId, reason: _reason, signature: _signature };
}

export function loadGetterTupleCancelMatch(source: TupleReader) {
    const _matchId = source.readBigNumber();
    const _reason = source.readString();
    const _signature = source.readCell().asSlice();
    return { $$type: 'CancelMatch' as const, matchId: _matchId, reason: _reason, signature: _signature };
}

export function storeTupleCancelMatch(source: CancelMatch) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.matchId);
    builder.writeString(source.reason);
    builder.writeSlice(source.signature.asCell());
    return builder.build();
}

export function dictValueParserCancelMatch(): DictionaryValue<CancelMatch> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeCancelMatch(src)).endCell());
        },
        parse: (src) => {
            return loadCancelMatch(src.loadRef().beginParse());
        }
    }
}

export type EmergencyRefund = {
    $$type: 'EmergencyRefund';
    matchId: bigint;
}

export function storeEmergencyRefund(src: EmergencyRefund) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(3781632330, 32);
        b_0.storeUint(src.matchId, 64);
    };
}

export function loadEmergencyRefund(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 3781632330) { throw Error('Invalid prefix'); }
    const _matchId = sc_0.loadUintBig(64);
    return { $$type: 'EmergencyRefund' as const, matchId: _matchId };
}

export function loadTupleEmergencyRefund(source: TupleReader) {
    const _matchId = source.readBigNumber();
    return { $$type: 'EmergencyRefund' as const, matchId: _matchId };
}

export function loadGetterTupleEmergencyRefund(source: TupleReader) {
    const _matchId = source.readBigNumber();
    return { $$type: 'EmergencyRefund' as const, matchId: _matchId };
}

export function storeTupleEmergencyRefund(source: EmergencyRefund) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.matchId);
    return builder.build();
}

export function dictValueParserEmergencyRefund(): DictionaryValue<EmergencyRefund> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeEmergencyRefund(src)).endCell());
        },
        parse: (src) => {
            return loadEmergencyRefund(src.loadRef().beginParse());
        }
    }
}

export type SetServerPublicKey = {
    $$type: 'SetServerPublicKey';
    newKey: bigint;
}

export function storeSetServerPublicKey(src: SetServerPublicKey) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(3723581606, 32);
        b_0.storeUint(src.newKey, 256);
    };
}

export function loadSetServerPublicKey(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 3723581606) { throw Error('Invalid prefix'); }
    const _newKey = sc_0.loadUintBig(256);
    return { $$type: 'SetServerPublicKey' as const, newKey: _newKey };
}

export function loadTupleSetServerPublicKey(source: TupleReader) {
    const _newKey = source.readBigNumber();
    return { $$type: 'SetServerPublicKey' as const, newKey: _newKey };
}

export function loadGetterTupleSetServerPublicKey(source: TupleReader) {
    const _newKey = source.readBigNumber();
    return { $$type: 'SetServerPublicKey' as const, newKey: _newKey };
}

export function storeTupleSetServerPublicKey(source: SetServerPublicKey) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.newKey);
    return builder.build();
}

export function dictValueParserSetServerPublicKey(): DictionaryValue<SetServerPublicKey> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSetServerPublicKey(src)).endCell());
        },
        parse: (src) => {
            return loadSetServerPublicKey(src.loadRef().beginParse());
        }
    }
}

export type EventMatchCreated = {
    $$type: 'EventMatchCreated';
    matchId: bigint;
    playerA: Address;
    wagerAmount: bigint;
    creationFee: bigint;
}

export function storeEventMatchCreated(src: EventMatchCreated) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(188414402, 32);
        b_0.storeUint(src.matchId, 64);
        b_0.storeAddress(src.playerA);
        b_0.storeCoins(src.wagerAmount);
        b_0.storeCoins(src.creationFee);
    };
}

export function loadEventMatchCreated(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 188414402) { throw Error('Invalid prefix'); }
    const _matchId = sc_0.loadUintBig(64);
    const _playerA = sc_0.loadAddress();
    const _wagerAmount = sc_0.loadCoins();
    const _creationFee = sc_0.loadCoins();
    return { $$type: 'EventMatchCreated' as const, matchId: _matchId, playerA: _playerA, wagerAmount: _wagerAmount, creationFee: _creationFee };
}

export function loadTupleEventMatchCreated(source: TupleReader) {
    const _matchId = source.readBigNumber();
    const _playerA = source.readAddress();
    const _wagerAmount = source.readBigNumber();
    const _creationFee = source.readBigNumber();
    return { $$type: 'EventMatchCreated' as const, matchId: _matchId, playerA: _playerA, wagerAmount: _wagerAmount, creationFee: _creationFee };
}

export function loadGetterTupleEventMatchCreated(source: TupleReader) {
    const _matchId = source.readBigNumber();
    const _playerA = source.readAddress();
    const _wagerAmount = source.readBigNumber();
    const _creationFee = source.readBigNumber();
    return { $$type: 'EventMatchCreated' as const, matchId: _matchId, playerA: _playerA, wagerAmount: _wagerAmount, creationFee: _creationFee };
}

export function storeTupleEventMatchCreated(source: EventMatchCreated) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.matchId);
    builder.writeAddress(source.playerA);
    builder.writeNumber(source.wagerAmount);
    builder.writeNumber(source.creationFee);
    return builder.build();
}

export function dictValueParserEventMatchCreated(): DictionaryValue<EventMatchCreated> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeEventMatchCreated(src)).endCell());
        },
        parse: (src) => {
            return loadEventMatchCreated(src.loadRef().beginParse());
        }
    }
}

export type EventPlayerJoined = {
    $$type: 'EventPlayerJoined';
    matchId: bigint;
    playerB: Address;
}

export function storeEventPlayerJoined(src: EventPlayerJoined) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(31607001, 32);
        b_0.storeUint(src.matchId, 64);
        b_0.storeAddress(src.playerB);
    };
}

export function loadEventPlayerJoined(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 31607001) { throw Error('Invalid prefix'); }
    const _matchId = sc_0.loadUintBig(64);
    const _playerB = sc_0.loadAddress();
    return { $$type: 'EventPlayerJoined' as const, matchId: _matchId, playerB: _playerB };
}

export function loadTupleEventPlayerJoined(source: TupleReader) {
    const _matchId = source.readBigNumber();
    const _playerB = source.readAddress();
    return { $$type: 'EventPlayerJoined' as const, matchId: _matchId, playerB: _playerB };
}

export function loadGetterTupleEventPlayerJoined(source: TupleReader) {
    const _matchId = source.readBigNumber();
    const _playerB = source.readAddress();
    return { $$type: 'EventPlayerJoined' as const, matchId: _matchId, playerB: _playerB };
}

export function storeTupleEventPlayerJoined(source: EventPlayerJoined) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.matchId);
    builder.writeAddress(source.playerB);
    return builder.build();
}

export function dictValueParserEventPlayerJoined(): DictionaryValue<EventPlayerJoined> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeEventPlayerJoined(src)).endCell());
        },
        parse: (src) => {
            return loadEventPlayerJoined(src.loadRef().beginParse());
        }
    }
}

export type EventSpectatorBet = {
    $$type: 'EventSpectatorBet';
    matchId: bigint;
    spectator: Address;
    targetPlayer: Address;
    amount: bigint;
    totalBetsA: bigint;
    totalBetsB: bigint;
}

export function storeEventSpectatorBet(src: EventSpectatorBet) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1752582815, 32);
        b_0.storeUint(src.matchId, 64);
        b_0.storeAddress(src.spectator);
        b_0.storeAddress(src.targetPlayer);
        b_0.storeCoins(src.amount);
        b_0.storeCoins(src.totalBetsA);
        b_0.storeCoins(src.totalBetsB);
    };
}

export function loadEventSpectatorBet(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1752582815) { throw Error('Invalid prefix'); }
    const _matchId = sc_0.loadUintBig(64);
    const _spectator = sc_0.loadAddress();
    const _targetPlayer = sc_0.loadAddress();
    const _amount = sc_0.loadCoins();
    const _totalBetsA = sc_0.loadCoins();
    const _totalBetsB = sc_0.loadCoins();
    return { $$type: 'EventSpectatorBet' as const, matchId: _matchId, spectator: _spectator, targetPlayer: _targetPlayer, amount: _amount, totalBetsA: _totalBetsA, totalBetsB: _totalBetsB };
}

export function loadTupleEventSpectatorBet(source: TupleReader) {
    const _matchId = source.readBigNumber();
    const _spectator = source.readAddress();
    const _targetPlayer = source.readAddress();
    const _amount = source.readBigNumber();
    const _totalBetsA = source.readBigNumber();
    const _totalBetsB = source.readBigNumber();
    return { $$type: 'EventSpectatorBet' as const, matchId: _matchId, spectator: _spectator, targetPlayer: _targetPlayer, amount: _amount, totalBetsA: _totalBetsA, totalBetsB: _totalBetsB };
}

export function loadGetterTupleEventSpectatorBet(source: TupleReader) {
    const _matchId = source.readBigNumber();
    const _spectator = source.readAddress();
    const _targetPlayer = source.readAddress();
    const _amount = source.readBigNumber();
    const _totalBetsA = source.readBigNumber();
    const _totalBetsB = source.readBigNumber();
    return { $$type: 'EventSpectatorBet' as const, matchId: _matchId, spectator: _spectator, targetPlayer: _targetPlayer, amount: _amount, totalBetsA: _totalBetsA, totalBetsB: _totalBetsB };
}

export function storeTupleEventSpectatorBet(source: EventSpectatorBet) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.matchId);
    builder.writeAddress(source.spectator);
    builder.writeAddress(source.targetPlayer);
    builder.writeNumber(source.amount);
    builder.writeNumber(source.totalBetsA);
    builder.writeNumber(source.totalBetsB);
    return builder.build();
}

export function dictValueParserEventSpectatorBet(): DictionaryValue<EventSpectatorBet> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeEventSpectatorBet(src)).endCell());
        },
        parse: (src) => {
            return loadEventSpectatorBet(src.loadRef().beginParse());
        }
    }
}

export type EventMatchResolved = {
    $$type: 'EventMatchResolved';
    matchId: bigint;
    winner: Address;
    playerPotPayout: bigint;
    totalPlayerRake: bigint;
    distributableSpectatorPool: bigint;
    totalSpectatorRake: bigint;
}

export function storeEventMatchResolved(src: EventMatchResolved) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1249309108, 32);
        b_0.storeUint(src.matchId, 64);
        b_0.storeAddress(src.winner);
        b_0.storeCoins(src.playerPotPayout);
        b_0.storeCoins(src.totalPlayerRake);
        b_0.storeCoins(src.distributableSpectatorPool);
        b_0.storeCoins(src.totalSpectatorRake);
    };
}

export function loadEventMatchResolved(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1249309108) { throw Error('Invalid prefix'); }
    const _matchId = sc_0.loadUintBig(64);
    const _winner = sc_0.loadAddress();
    const _playerPotPayout = sc_0.loadCoins();
    const _totalPlayerRake = sc_0.loadCoins();
    const _distributableSpectatorPool = sc_0.loadCoins();
    const _totalSpectatorRake = sc_0.loadCoins();
    return { $$type: 'EventMatchResolved' as const, matchId: _matchId, winner: _winner, playerPotPayout: _playerPotPayout, totalPlayerRake: _totalPlayerRake, distributableSpectatorPool: _distributableSpectatorPool, totalSpectatorRake: _totalSpectatorRake };
}

export function loadTupleEventMatchResolved(source: TupleReader) {
    const _matchId = source.readBigNumber();
    const _winner = source.readAddress();
    const _playerPotPayout = source.readBigNumber();
    const _totalPlayerRake = source.readBigNumber();
    const _distributableSpectatorPool = source.readBigNumber();
    const _totalSpectatorRake = source.readBigNumber();
    return { $$type: 'EventMatchResolved' as const, matchId: _matchId, winner: _winner, playerPotPayout: _playerPotPayout, totalPlayerRake: _totalPlayerRake, distributableSpectatorPool: _distributableSpectatorPool, totalSpectatorRake: _totalSpectatorRake };
}

export function loadGetterTupleEventMatchResolved(source: TupleReader) {
    const _matchId = source.readBigNumber();
    const _winner = source.readAddress();
    const _playerPotPayout = source.readBigNumber();
    const _totalPlayerRake = source.readBigNumber();
    const _distributableSpectatorPool = source.readBigNumber();
    const _totalSpectatorRake = source.readBigNumber();
    return { $$type: 'EventMatchResolved' as const, matchId: _matchId, winner: _winner, playerPotPayout: _playerPotPayout, totalPlayerRake: _totalPlayerRake, distributableSpectatorPool: _distributableSpectatorPool, totalSpectatorRake: _totalSpectatorRake };
}

export function storeTupleEventMatchResolved(source: EventMatchResolved) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.matchId);
    builder.writeAddress(source.winner);
    builder.writeNumber(source.playerPotPayout);
    builder.writeNumber(source.totalPlayerRake);
    builder.writeNumber(source.distributableSpectatorPool);
    builder.writeNumber(source.totalSpectatorRake);
    return builder.build();
}

export function dictValueParserEventMatchResolved(): DictionaryValue<EventMatchResolved> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeEventMatchResolved(src)).endCell());
        },
        parse: (src) => {
            return loadEventMatchResolved(src.loadRef().beginParse());
        }
    }
}

export type EventSpectatorClaim = {
    $$type: 'EventSpectatorClaim';
    matchId: bigint;
    spectator: Address;
    payout: bigint;
}

export function storeEventSpectatorClaim(src: EventSpectatorClaim) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(190681496, 32);
        b_0.storeUint(src.matchId, 64);
        b_0.storeAddress(src.spectator);
        b_0.storeCoins(src.payout);
    };
}

export function loadEventSpectatorClaim(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 190681496) { throw Error('Invalid prefix'); }
    const _matchId = sc_0.loadUintBig(64);
    const _spectator = sc_0.loadAddress();
    const _payout = sc_0.loadCoins();
    return { $$type: 'EventSpectatorClaim' as const, matchId: _matchId, spectator: _spectator, payout: _payout };
}

export function loadTupleEventSpectatorClaim(source: TupleReader) {
    const _matchId = source.readBigNumber();
    const _spectator = source.readAddress();
    const _payout = source.readBigNumber();
    return { $$type: 'EventSpectatorClaim' as const, matchId: _matchId, spectator: _spectator, payout: _payout };
}

export function loadGetterTupleEventSpectatorClaim(source: TupleReader) {
    const _matchId = source.readBigNumber();
    const _spectator = source.readAddress();
    const _payout = source.readBigNumber();
    return { $$type: 'EventSpectatorClaim' as const, matchId: _matchId, spectator: _spectator, payout: _payout };
}

export function storeTupleEventSpectatorClaim(source: EventSpectatorClaim) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.matchId);
    builder.writeAddress(source.spectator);
    builder.writeNumber(source.payout);
    return builder.build();
}

export function dictValueParserEventSpectatorClaim(): DictionaryValue<EventSpectatorClaim> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeEventSpectatorClaim(src)).endCell());
        },
        parse: (src) => {
            return loadEventSpectatorClaim(src.loadRef().beginParse());
        }
    }
}

export type EventAffiliatePayout = {
    $$type: 'EventAffiliatePayout';
    matchId: bigint;
    recipient: Address;
    amount: bigint;
    reason: string;
}

export function storeEventAffiliatePayout(src: EventAffiliatePayout) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(3972509664, 32);
        b_0.storeUint(src.matchId, 64);
        b_0.storeAddress(src.recipient);
        b_0.storeCoins(src.amount);
        b_0.storeStringRefTail(src.reason);
    };
}

export function loadEventAffiliatePayout(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 3972509664) { throw Error('Invalid prefix'); }
    const _matchId = sc_0.loadUintBig(64);
    const _recipient = sc_0.loadAddress();
    const _amount = sc_0.loadCoins();
    const _reason = sc_0.loadStringRefTail();
    return { $$type: 'EventAffiliatePayout' as const, matchId: _matchId, recipient: _recipient, amount: _amount, reason: _reason };
}

export function loadTupleEventAffiliatePayout(source: TupleReader) {
    const _matchId = source.readBigNumber();
    const _recipient = source.readAddress();
    const _amount = source.readBigNumber();
    const _reason = source.readString();
    return { $$type: 'EventAffiliatePayout' as const, matchId: _matchId, recipient: _recipient, amount: _amount, reason: _reason };
}

export function loadGetterTupleEventAffiliatePayout(source: TupleReader) {
    const _matchId = source.readBigNumber();
    const _recipient = source.readAddress();
    const _amount = source.readBigNumber();
    const _reason = source.readString();
    return { $$type: 'EventAffiliatePayout' as const, matchId: _matchId, recipient: _recipient, amount: _amount, reason: _reason };
}

export function storeTupleEventAffiliatePayout(source: EventAffiliatePayout) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.matchId);
    builder.writeAddress(source.recipient);
    builder.writeNumber(source.amount);
    builder.writeString(source.reason);
    return builder.build();
}

export function dictValueParserEventAffiliatePayout(): DictionaryValue<EventAffiliatePayout> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeEventAffiliatePayout(src)).endCell());
        },
        parse: (src) => {
            return loadEventAffiliatePayout(src.loadRef().beginParse());
        }
    }
}

export type MatchEscrow$Data = {
    $$type: 'MatchEscrow$Data';
    clashMaster: Address;
    matchId: bigint;
    playerA: Address;
    playerB: Address | null;
    wagerAmount: bigint;
    totalBetsA: bigint;
    totalBetsB: bigint;
    state: bigint;
    recruiterA: Address | null;
    recruiterB: Address | null;
    groupAdminAddress: Address | null;
    serverPublicKey: bigint;
    winner: Address | null;
    creationFeePaid: bigint;
    spectatorBetsA: Dictionary<Address, bigint>;
    spectatorBetsB: Dictionary<Address, bigint>;
    spectatorClaimed: Dictionary<Address, boolean>;
    distributableSpectatorPool: bigint;
    remainingWinningBetsToClaim: bigint;
    totalWinningBets: bigint;
}

export function storeMatchEscrow$Data(src: MatchEscrow$Data) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeAddress(src.clashMaster);
        b_0.storeUint(src.matchId, 64);
        b_0.storeAddress(src.playerA);
        b_0.storeAddress(src.playerB);
        b_0.storeCoins(src.wagerAmount);
        const b_1 = new Builder();
        b_1.storeCoins(src.totalBetsA);
        b_1.storeCoins(src.totalBetsB);
        b_1.storeUint(src.state, 8);
        b_1.storeAddress(src.recruiterA);
        b_1.storeAddress(src.recruiterB);
        const b_2 = new Builder();
        b_2.storeAddress(src.groupAdminAddress);
        b_2.storeUint(src.serverPublicKey, 256);
        b_2.storeAddress(src.winner);
        b_2.storeCoins(src.creationFeePaid);
        b_2.storeDict(src.spectatorBetsA, Dictionary.Keys.Address(), Dictionary.Values.BigVarUint(4));
        b_2.storeDict(src.spectatorBetsB, Dictionary.Keys.Address(), Dictionary.Values.BigVarUint(4));
        b_2.storeDict(src.spectatorClaimed, Dictionary.Keys.Address(), Dictionary.Values.Bool());
        const b_3 = new Builder();
        b_3.storeCoins(src.distributableSpectatorPool);
        b_3.storeCoins(src.remainingWinningBetsToClaim);
        b_3.storeCoins(src.totalWinningBets);
        b_2.storeRef(b_3.endCell());
        b_1.storeRef(b_2.endCell());
        b_0.storeRef(b_1.endCell());
    };
}

export function loadMatchEscrow$Data(slice: Slice) {
    const sc_0 = slice;
    const _clashMaster = sc_0.loadAddress();
    const _matchId = sc_0.loadUintBig(64);
    const _playerA = sc_0.loadAddress();
    const _playerB = sc_0.loadMaybeAddress();
    const _wagerAmount = sc_0.loadCoins();
    const sc_1 = sc_0.loadRef().beginParse();
    const _totalBetsA = sc_1.loadCoins();
    const _totalBetsB = sc_1.loadCoins();
    const _state = sc_1.loadUintBig(8);
    const _recruiterA = sc_1.loadMaybeAddress();
    const _recruiterB = sc_1.loadMaybeAddress();
    const sc_2 = sc_1.loadRef().beginParse();
    const _groupAdminAddress = sc_2.loadMaybeAddress();
    const _serverPublicKey = sc_2.loadUintBig(256);
    const _winner = sc_2.loadMaybeAddress();
    const _creationFeePaid = sc_2.loadCoins();
    const _spectatorBetsA = Dictionary.load(Dictionary.Keys.Address(), Dictionary.Values.BigVarUint(4), sc_2);
    const _spectatorBetsB = Dictionary.load(Dictionary.Keys.Address(), Dictionary.Values.BigVarUint(4), sc_2);
    const _spectatorClaimed = Dictionary.load(Dictionary.Keys.Address(), Dictionary.Values.Bool(), sc_2);
    const sc_3 = sc_2.loadRef().beginParse();
    const _distributableSpectatorPool = sc_3.loadCoins();
    const _remainingWinningBetsToClaim = sc_3.loadCoins();
    const _totalWinningBets = sc_3.loadCoins();
    return { $$type: 'MatchEscrow$Data' as const, clashMaster: _clashMaster, matchId: _matchId, playerA: _playerA, playerB: _playerB, wagerAmount: _wagerAmount, totalBetsA: _totalBetsA, totalBetsB: _totalBetsB, state: _state, recruiterA: _recruiterA, recruiterB: _recruiterB, groupAdminAddress: _groupAdminAddress, serverPublicKey: _serverPublicKey, winner: _winner, creationFeePaid: _creationFeePaid, spectatorBetsA: _spectatorBetsA, spectatorBetsB: _spectatorBetsB, spectatorClaimed: _spectatorClaimed, distributableSpectatorPool: _distributableSpectatorPool, remainingWinningBetsToClaim: _remainingWinningBetsToClaim, totalWinningBets: _totalWinningBets };
}

export function loadTupleMatchEscrow$Data(source: TupleReader) {
    const _clashMaster = source.readAddress();
    const _matchId = source.readBigNumber();
    const _playerA = source.readAddress();
    const _playerB = source.readAddressOpt();
    const _wagerAmount = source.readBigNumber();
    const _totalBetsA = source.readBigNumber();
    const _totalBetsB = source.readBigNumber();
    const _state = source.readBigNumber();
    const _recruiterA = source.readAddressOpt();
    const _recruiterB = source.readAddressOpt();
    const _groupAdminAddress = source.readAddressOpt();
    const _serverPublicKey = source.readBigNumber();
    const _winner = source.readAddressOpt();
    const _creationFeePaid = source.readBigNumber();
    source = source.readTuple();
    const _spectatorBetsA = Dictionary.loadDirect(Dictionary.Keys.Address(), Dictionary.Values.BigVarUint(4), source.readCellOpt());
    const _spectatorBetsB = Dictionary.loadDirect(Dictionary.Keys.Address(), Dictionary.Values.BigVarUint(4), source.readCellOpt());
    const _spectatorClaimed = Dictionary.loadDirect(Dictionary.Keys.Address(), Dictionary.Values.Bool(), source.readCellOpt());
    const _distributableSpectatorPool = source.readBigNumber();
    const _remainingWinningBetsToClaim = source.readBigNumber();
    const _totalWinningBets = source.readBigNumber();
    return { $$type: 'MatchEscrow$Data' as const, clashMaster: _clashMaster, matchId: _matchId, playerA: _playerA, playerB: _playerB, wagerAmount: _wagerAmount, totalBetsA: _totalBetsA, totalBetsB: _totalBetsB, state: _state, recruiterA: _recruiterA, recruiterB: _recruiterB, groupAdminAddress: _groupAdminAddress, serverPublicKey: _serverPublicKey, winner: _winner, creationFeePaid: _creationFeePaid, spectatorBetsA: _spectatorBetsA, spectatorBetsB: _spectatorBetsB, spectatorClaimed: _spectatorClaimed, distributableSpectatorPool: _distributableSpectatorPool, remainingWinningBetsToClaim: _remainingWinningBetsToClaim, totalWinningBets: _totalWinningBets };
}

export function loadGetterTupleMatchEscrow$Data(source: TupleReader) {
    const _clashMaster = source.readAddress();
    const _matchId = source.readBigNumber();
    const _playerA = source.readAddress();
    const _playerB = source.readAddressOpt();
    const _wagerAmount = source.readBigNumber();
    const _totalBetsA = source.readBigNumber();
    const _totalBetsB = source.readBigNumber();
    const _state = source.readBigNumber();
    const _recruiterA = source.readAddressOpt();
    const _recruiterB = source.readAddressOpt();
    const _groupAdminAddress = source.readAddressOpt();
    const _serverPublicKey = source.readBigNumber();
    const _winner = source.readAddressOpt();
    const _creationFeePaid = source.readBigNumber();
    const _spectatorBetsA = Dictionary.loadDirect(Dictionary.Keys.Address(), Dictionary.Values.BigVarUint(4), source.readCellOpt());
    const _spectatorBetsB = Dictionary.loadDirect(Dictionary.Keys.Address(), Dictionary.Values.BigVarUint(4), source.readCellOpt());
    const _spectatorClaimed = Dictionary.loadDirect(Dictionary.Keys.Address(), Dictionary.Values.Bool(), source.readCellOpt());
    const _distributableSpectatorPool = source.readBigNumber();
    const _remainingWinningBetsToClaim = source.readBigNumber();
    const _totalWinningBets = source.readBigNumber();
    return { $$type: 'MatchEscrow$Data' as const, clashMaster: _clashMaster, matchId: _matchId, playerA: _playerA, playerB: _playerB, wagerAmount: _wagerAmount, totalBetsA: _totalBetsA, totalBetsB: _totalBetsB, state: _state, recruiterA: _recruiterA, recruiterB: _recruiterB, groupAdminAddress: _groupAdminAddress, serverPublicKey: _serverPublicKey, winner: _winner, creationFeePaid: _creationFeePaid, spectatorBetsA: _spectatorBetsA, spectatorBetsB: _spectatorBetsB, spectatorClaimed: _spectatorClaimed, distributableSpectatorPool: _distributableSpectatorPool, remainingWinningBetsToClaim: _remainingWinningBetsToClaim, totalWinningBets: _totalWinningBets };
}

export function storeTupleMatchEscrow$Data(source: MatchEscrow$Data) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.clashMaster);
    builder.writeNumber(source.matchId);
    builder.writeAddress(source.playerA);
    builder.writeAddress(source.playerB);
    builder.writeNumber(source.wagerAmount);
    builder.writeNumber(source.totalBetsA);
    builder.writeNumber(source.totalBetsB);
    builder.writeNumber(source.state);
    builder.writeAddress(source.recruiterA);
    builder.writeAddress(source.recruiterB);
    builder.writeAddress(source.groupAdminAddress);
    builder.writeNumber(source.serverPublicKey);
    builder.writeAddress(source.winner);
    builder.writeNumber(source.creationFeePaid);
    builder.writeCell(source.spectatorBetsA.size > 0 ? beginCell().storeDictDirect(source.spectatorBetsA, Dictionary.Keys.Address(), Dictionary.Values.BigVarUint(4)).endCell() : null);
    builder.writeCell(source.spectatorBetsB.size > 0 ? beginCell().storeDictDirect(source.spectatorBetsB, Dictionary.Keys.Address(), Dictionary.Values.BigVarUint(4)).endCell() : null);
    builder.writeCell(source.spectatorClaimed.size > 0 ? beginCell().storeDictDirect(source.spectatorClaimed, Dictionary.Keys.Address(), Dictionary.Values.Bool()).endCell() : null);
    builder.writeNumber(source.distributableSpectatorPool);
    builder.writeNumber(source.remainingWinningBetsToClaim);
    builder.writeNumber(source.totalWinningBets);
    return builder.build();
}

export function dictValueParserMatchEscrow$Data(): DictionaryValue<MatchEscrow$Data> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeMatchEscrow$Data(src)).endCell());
        },
        parse: (src) => {
            return loadMatchEscrow$Data(src.loadRef().beginParse());
        }
    }
}

export type MatchEscrowDetails = {
    $$type: 'MatchEscrowDetails';
    matchId: bigint;
    playerA: Address;
    playerB: Address | null;
    wagerAmount: bigint;
    totalBetsA: bigint;
    totalBetsB: bigint;
    state: bigint;
    winner: Address | null;
    distributableSpectatorPool: bigint;
    remainingWinningBetsToClaim: bigint;
}

export function storeMatchEscrowDetails(src: MatchEscrowDetails) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(src.matchId, 64);
        b_0.storeAddress(src.playerA);
        b_0.storeAddress(src.playerB);
        b_0.storeCoins(src.wagerAmount);
        b_0.storeCoins(src.totalBetsA);
        b_0.storeCoins(src.totalBetsB);
        b_0.storeUint(src.state, 8);
        const b_1 = new Builder();
        b_1.storeAddress(src.winner);
        b_1.storeCoins(src.distributableSpectatorPool);
        b_1.storeCoins(src.remainingWinningBetsToClaim);
        b_0.storeRef(b_1.endCell());
    };
}

export function loadMatchEscrowDetails(slice: Slice) {
    const sc_0 = slice;
    const _matchId = sc_0.loadUintBig(64);
    const _playerA = sc_0.loadAddress();
    const _playerB = sc_0.loadMaybeAddress();
    const _wagerAmount = sc_0.loadCoins();
    const _totalBetsA = sc_0.loadCoins();
    const _totalBetsB = sc_0.loadCoins();
    const _state = sc_0.loadUintBig(8);
    const sc_1 = sc_0.loadRef().beginParse();
    const _winner = sc_1.loadMaybeAddress();
    const _distributableSpectatorPool = sc_1.loadCoins();
    const _remainingWinningBetsToClaim = sc_1.loadCoins();
    return { $$type: 'MatchEscrowDetails' as const, matchId: _matchId, playerA: _playerA, playerB: _playerB, wagerAmount: _wagerAmount, totalBetsA: _totalBetsA, totalBetsB: _totalBetsB, state: _state, winner: _winner, distributableSpectatorPool: _distributableSpectatorPool, remainingWinningBetsToClaim: _remainingWinningBetsToClaim };
}

export function loadTupleMatchEscrowDetails(source: TupleReader) {
    const _matchId = source.readBigNumber();
    const _playerA = source.readAddress();
    const _playerB = source.readAddressOpt();
    const _wagerAmount = source.readBigNumber();
    const _totalBetsA = source.readBigNumber();
    const _totalBetsB = source.readBigNumber();
    const _state = source.readBigNumber();
    const _winner = source.readAddressOpt();
    const _distributableSpectatorPool = source.readBigNumber();
    const _remainingWinningBetsToClaim = source.readBigNumber();
    return { $$type: 'MatchEscrowDetails' as const, matchId: _matchId, playerA: _playerA, playerB: _playerB, wagerAmount: _wagerAmount, totalBetsA: _totalBetsA, totalBetsB: _totalBetsB, state: _state, winner: _winner, distributableSpectatorPool: _distributableSpectatorPool, remainingWinningBetsToClaim: _remainingWinningBetsToClaim };
}

export function loadGetterTupleMatchEscrowDetails(source: TupleReader) {
    const _matchId = source.readBigNumber();
    const _playerA = source.readAddress();
    const _playerB = source.readAddressOpt();
    const _wagerAmount = source.readBigNumber();
    const _totalBetsA = source.readBigNumber();
    const _totalBetsB = source.readBigNumber();
    const _state = source.readBigNumber();
    const _winner = source.readAddressOpt();
    const _distributableSpectatorPool = source.readBigNumber();
    const _remainingWinningBetsToClaim = source.readBigNumber();
    return { $$type: 'MatchEscrowDetails' as const, matchId: _matchId, playerA: _playerA, playerB: _playerB, wagerAmount: _wagerAmount, totalBetsA: _totalBetsA, totalBetsB: _totalBetsB, state: _state, winner: _winner, distributableSpectatorPool: _distributableSpectatorPool, remainingWinningBetsToClaim: _remainingWinningBetsToClaim };
}

export function storeTupleMatchEscrowDetails(source: MatchEscrowDetails) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.matchId);
    builder.writeAddress(source.playerA);
    builder.writeAddress(source.playerB);
    builder.writeNumber(source.wagerAmount);
    builder.writeNumber(source.totalBetsA);
    builder.writeNumber(source.totalBetsB);
    builder.writeNumber(source.state);
    builder.writeAddress(source.winner);
    builder.writeNumber(source.distributableSpectatorPool);
    builder.writeNumber(source.remainingWinningBetsToClaim);
    return builder.build();
}

export function dictValueParserMatchEscrowDetails(): DictionaryValue<MatchEscrowDetails> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeMatchEscrowDetails(src)).endCell());
        },
        parse: (src) => {
            return loadMatchEscrowDetails(src.loadRef().beginParse());
        }
    }
}

export type RakeDistribution = {
    $$type: 'RakeDistribution';
    treasuryShare: bigint;
    recruiterShare: bigint;
    groupAdminShare: bigint;
}

export function storeRakeDistribution(src: RakeDistribution) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeCoins(src.treasuryShare);
        b_0.storeCoins(src.recruiterShare);
        b_0.storeCoins(src.groupAdminShare);
    };
}

export function loadRakeDistribution(slice: Slice) {
    const sc_0 = slice;
    const _treasuryShare = sc_0.loadCoins();
    const _recruiterShare = sc_0.loadCoins();
    const _groupAdminShare = sc_0.loadCoins();
    return { $$type: 'RakeDistribution' as const, treasuryShare: _treasuryShare, recruiterShare: _recruiterShare, groupAdminShare: _groupAdminShare };
}

export function loadTupleRakeDistribution(source: TupleReader) {
    const _treasuryShare = source.readBigNumber();
    const _recruiterShare = source.readBigNumber();
    const _groupAdminShare = source.readBigNumber();
    return { $$type: 'RakeDistribution' as const, treasuryShare: _treasuryShare, recruiterShare: _recruiterShare, groupAdminShare: _groupAdminShare };
}

export function loadGetterTupleRakeDistribution(source: TupleReader) {
    const _treasuryShare = source.readBigNumber();
    const _recruiterShare = source.readBigNumber();
    const _groupAdminShare = source.readBigNumber();
    return { $$type: 'RakeDistribution' as const, treasuryShare: _treasuryShare, recruiterShare: _recruiterShare, groupAdminShare: _groupAdminShare };
}

export function storeTupleRakeDistribution(source: RakeDistribution) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.treasuryShare);
    builder.writeNumber(source.recruiterShare);
    builder.writeNumber(source.groupAdminShare);
    return builder.build();
}

export function dictValueParserRakeDistribution(): DictionaryValue<RakeDistribution> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeRakeDistribution(src)).endCell());
        },
        parse: (src) => {
            return loadRakeDistribution(src.loadRef().beginParse());
        }
    }
}

export type WithdrawTreasury = {
    $$type: 'WithdrawTreasury';
    amount: bigint;
    recipient: Address;
}

export function storeWithdrawTreasury(src: WithdrawTreasury) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1116654954, 32);
        b_0.storeCoins(src.amount);
        b_0.storeAddress(src.recipient);
    };
}

export function loadWithdrawTreasury(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1116654954) { throw Error('Invalid prefix'); }
    const _amount = sc_0.loadCoins();
    const _recipient = sc_0.loadAddress();
    return { $$type: 'WithdrawTreasury' as const, amount: _amount, recipient: _recipient };
}

export function loadTupleWithdrawTreasury(source: TupleReader) {
    const _amount = source.readBigNumber();
    const _recipient = source.readAddress();
    return { $$type: 'WithdrawTreasury' as const, amount: _amount, recipient: _recipient };
}

export function loadGetterTupleWithdrawTreasury(source: TupleReader) {
    const _amount = source.readBigNumber();
    const _recipient = source.readAddress();
    return { $$type: 'WithdrawTreasury' as const, amount: _amount, recipient: _recipient };
}

export function storeTupleWithdrawTreasury(source: WithdrawTreasury) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.amount);
    builder.writeAddress(source.recipient);
    return builder.build();
}

export function dictValueParserWithdrawTreasury(): DictionaryValue<WithdrawTreasury> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeWithdrawTreasury(src)).endCell());
        },
        parse: (src) => {
            return loadWithdrawTreasury(src.loadRef().beginParse());
        }
    }
}

export type MasterStats = {
    $$type: 'MasterStats';
    matchCount: bigint;
    serverPublicKey: bigint;
    owner: Address;
    balance: bigint;
}

export function storeMasterStats(src: MasterStats) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(src.matchCount, 64);
        b_0.storeUint(src.serverPublicKey, 256);
        b_0.storeAddress(src.owner);
        b_0.storeCoins(src.balance);
    };
}

export function loadMasterStats(slice: Slice) {
    const sc_0 = slice;
    const _matchCount = sc_0.loadUintBig(64);
    const _serverPublicKey = sc_0.loadUintBig(256);
    const _owner = sc_0.loadAddress();
    const _balance = sc_0.loadCoins();
    return { $$type: 'MasterStats' as const, matchCount: _matchCount, serverPublicKey: _serverPublicKey, owner: _owner, balance: _balance };
}

export function loadTupleMasterStats(source: TupleReader) {
    const _matchCount = source.readBigNumber();
    const _serverPublicKey = source.readBigNumber();
    const _owner = source.readAddress();
    const _balance = source.readBigNumber();
    return { $$type: 'MasterStats' as const, matchCount: _matchCount, serverPublicKey: _serverPublicKey, owner: _owner, balance: _balance };
}

export function loadGetterTupleMasterStats(source: TupleReader) {
    const _matchCount = source.readBigNumber();
    const _serverPublicKey = source.readBigNumber();
    const _owner = source.readAddress();
    const _balance = source.readBigNumber();
    return { $$type: 'MasterStats' as const, matchCount: _matchCount, serverPublicKey: _serverPublicKey, owner: _owner, balance: _balance };
}

export function storeTupleMasterStats(source: MasterStats) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.matchCount);
    builder.writeNumber(source.serverPublicKey);
    builder.writeAddress(source.owner);
    builder.writeNumber(source.balance);
    return builder.build();
}

export function dictValueParserMasterStats(): DictionaryValue<MasterStats> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeMasterStats(src)).endCell());
        },
        parse: (src) => {
            return loadMasterStats(src.loadRef().beginParse());
        }
    }
}

export type ClashMaster$Data = {
    $$type: 'ClashMaster$Data';
    owner: Address;
    serverPublicKey: bigint;
    matchCount: bigint;
}

export function storeClashMaster$Data(src: ClashMaster$Data) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeAddress(src.owner);
        b_0.storeUint(src.serverPublicKey, 256);
        b_0.storeUint(src.matchCount, 64);
    };
}

export function loadClashMaster$Data(slice: Slice) {
    const sc_0 = slice;
    const _owner = sc_0.loadAddress();
    const _serverPublicKey = sc_0.loadUintBig(256);
    const _matchCount = sc_0.loadUintBig(64);
    return { $$type: 'ClashMaster$Data' as const, owner: _owner, serverPublicKey: _serverPublicKey, matchCount: _matchCount };
}

export function loadTupleClashMaster$Data(source: TupleReader) {
    const _owner = source.readAddress();
    const _serverPublicKey = source.readBigNumber();
    const _matchCount = source.readBigNumber();
    return { $$type: 'ClashMaster$Data' as const, owner: _owner, serverPublicKey: _serverPublicKey, matchCount: _matchCount };
}

export function loadGetterTupleClashMaster$Data(source: TupleReader) {
    const _owner = source.readAddress();
    const _serverPublicKey = source.readBigNumber();
    const _matchCount = source.readBigNumber();
    return { $$type: 'ClashMaster$Data' as const, owner: _owner, serverPublicKey: _serverPublicKey, matchCount: _matchCount };
}

export function storeTupleClashMaster$Data(source: ClashMaster$Data) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.owner);
    builder.writeNumber(source.serverPublicKey);
    builder.writeNumber(source.matchCount);
    return builder.build();
}

export function dictValueParserClashMaster$Data(): DictionaryValue<ClashMaster$Data> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeClashMaster$Data(src)).endCell());
        },
        parse: (src) => {
            return loadClashMaster$Data(src.loadRef().beginParse());
        }
    }
}

 type ClashMaster_init_args = {
    $$type: 'ClashMaster_init_args';
    owner: Address;
    serverPublicKey: bigint;
}

function initClashMaster_init_args(src: ClashMaster_init_args) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeAddress(src.owner);
        b_0.storeUint(src.serverPublicKey, 256);
    };
}

async function ClashMaster_init(owner: Address, serverPublicKey: bigint) {
    const __code = Cell.fromHex('b5ee9c7241024d01001376000228ff008e88f4a413f4bcf2c80bed5320e303ed43d90106020378e002040145b9676ed44d0d200019afa40d3ffd33f55206c1399fa40d3ff5902d10170e2db3c6c348030012f8276f1054613052500149b964eed44d0d200019afa40d3ffd33f55206c1399fa40d3ff5902d10170e25542db3c6c31805016ef828050443132702db3c705920f90022f9005ad76501d76582020134c8cb17cb0fcb0fcbffcbff71f90400c87401cb0212ca07cbffc9d00902e030eda2edfb01d072d721d200d200fa4021103450666f04f86102f862ed44d0d200019afa40d3ffd33f55206c1399fa40d3ff5902d10170e204925f04e07023d74920c21f9134e30d20c00024c121b08e14303202c87f01ca0055205023cecbffcb3fc9ed54e0c000925f04e30df2c082074c02923103d31f218210127b5e95bae302218210ddf158a6ba8e25345b01d3ff308200b6e1f84223c705f2f458c87f01ca0055205023cecbffcb3fc9ed54db31e0218210428ecd6abae30230084a02fe313302d33ffa00d72c01916d93fa4001e201d72c01916d93fa4001e231f8416f243032248209312d00a0820afaf080a0028165fd03be12f2f407a4f82854453029544630544a70db3c5c705920f90022f9005ad76501d76582020134c8cb17cb0fcb0fcbffcbff71f90400c87401cb0212ca07cbffc9d024820afaf080a0720947016088c87001ca0055615067ce14cb3f12ce01fa02cbffc858206e9430cf84809201cee258206e9430cf84809201cee2cdc90a0262ff008e88f4a413f4bcf2c80bed53208e9c30eda2edfb01d072d721d200d200fa4021103450666f04f86102f862e1ed43d90b190202710c170201200d140201200e1102f1b6691da89a1a400031cb5f481a67ff481f401a7ffa803a1ae580322db27f48003c403ae580322db27f48003c462204e204c204a204820460fa2aa0adadadadadae0db0412625a00a8e444a60012222012213e209c207a20f8209621142072207020ce20adc61a22262228222622242226222422222224222301a0f01281110111111100f11100f550edb3c57105f0f6c4110003c81010b260259f40a6fa193fa003092306de2206eb395206ef2d080e0307002f1b4657da89a1a400031cb5f481a67ff481f401a7ffa803a1ae580322db27f48003c403ae580322db27f48003c462204e204c204a204820460fa2aa0adadadadadae0db0412625a00a8e444a60012222012213e209c207a20f8209621142072207020ce20adc61a22262228222622242226222422222224222301a1201281110111111100f11100f550edb3c57105f0f6c4113003c81010b270259f40a6fa193fa003092306de2206eb395206ef2d080e0307002f1b8966ed44d0d200018e5afa40d33ffa40fa00d3ffd401d0d72c01916d93fa4001e201d72c01916d93fa4001e2311027102610251024102307d155056d6d6d6d6d706d8209312d00547222530009111009109f104e103d107c104b108a1039103810671056e30d11131114111311121113111211111112111181a1501281110111111100f11100f550edb3c57105f0f6c4116004281010b2502714133f40a6fa19401d70030925b6de2206eb395206ef2d080e0307002d9bf78df6a268690000c72d7d20699ffd207d0069ffea00e86b9600c8b6c9fd2000f100eb9600c8b6c9fd2000f1188813881308128812081183e8aa82b6b6b6b6b6b836c1049896802a3911298004888804884f8827081e883e08258845081c881c0833882b7186ed9e3655365541a1800225612561256125612561256125612547e9803fced44d0d200018e5afa40d33ffa40fa00d3ffd401d0d72c01916d93fa4001e201d72c01916d93fa4001e2311027102610251024102307d155056d6d6d6d6d706d8209312d00547222530009111009109f104e103d107c104b108a1039103810671056e30d1115945f0f5f06e0705614d74920c21f925715e30d20c00056151a1c4401f6fa40d33ffa40d72c01916d93fa4001e201fa00d401d0fa00fa00d307d72c01916d93fa4001e201d72c01916d93fa4001e201d430d0d72c01916d93fa4001e201d3ffd72c01916d93fa4001e201fa00f404f404f404d430d0fa00fa00fa00300f11140f0f11130f0f11120f0f11110f0f11100f57141112111311121b00241111111211111110111111100f11100f550e0456311114d31f21821046024d54bae302218210c8998cb6bae3022182102d15922dbae302218210c1b57e3cba1d1f233201fc313a3f571207d33fd72c01916d93fa4001e231f8416f2430328137a60dc0001df2f4811bcf035612ba13f2f48115952b5611c705b3f2f482008c0c512ebe12f2f4539f710cc8598209e248d95003cb1fcb3fcec9c88258c000000000000000000000000101cb67ccc970fb001111111311111110111211100f11110f11101e016010df10ce10bd10ac109b1a10791068105710461035401403c87f01ca001114111311121111111055e0db3cc9ed54db314503ca3157141113d33ffa4030f8416f243032810b4c2fc000917f932fc001e2f2f4811bcf045615ba14f2f4215613c70556126eb39f5612206ef2d0805230c70592307fdede8145a101f2f481620b21821005f5e100bef2f4215613c705e30f5613552054377fc8202122007e702781010b2559f40a6fa193fa003092306de2206eb39631206ef2d0809130e281010b5112a024103901206e953059f4593098c801fa024133f441e251f6a00088702681010b2559f40a6fa193fa003092306de2206eb39631206ef2d0809130e281010b5112a024103801206e953059f4593098c801fa024133f441e251e5a0106f0e050601f05550821068764a9f5007cb1f15cb3f13cece01fa0201fa0201fa02c9c88258c000000000000000000000000101cb67ccc970fb001111111311111110111211100f11110f0e11100e10df103e10bd10ac109b108a107910681057104610454034c87f01ca001114111311121111111055e0db3cc9ed54db314504fe385f035711571102d33ffa40d31fd430d08200e11d0bc0011bf2f4811bcf235611baf2f48122e42e6eb3f2f4531ec705917f9a2d206ef2d0805220c705e28200b5a401f2f454411a26db3c815d9e01f2f426722baa0020db3c66a153cba070547001c2008e925f0320db3c66a12c5612c705912e912de2599133e2547024243c242526000caa018064a904000ca7068064a90404d4a056105616c705912f912ee2206eb32f6eb31023db3c7170885616513d413310246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb0021c2008e88236eb3923330e30d923330e221c2002728292b005622a7468064a9045330a12391229170e29a6c223221ab005122a112e00393313270e00193327001e05b7020004a000000005366696461426f74204475656c2057696e6e6572205061796f757420283936252902f223206ef2d08071708825552010246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb0003206ef2d0808d04149958dc9d5a5d195c8814995dd85c9920561a5033c855308210ecc7afe05005cb1f13cb3fce01fa0201c8cecdc92a2e003a000000005366696461426f74205265637275697465722052657761726403f28e872e6eb39131e30d9131e22aa0717088561a553010246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb005615050411100410361027111016c8555082104a76f1b45007cb1f15cb3f13ce01fa0201fa0201fa0201fa02c92c2f3002f62e206ef2d08071708825552010246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb002e206ef2d0808d0451dc9bdd5c08121bdcdd0814995dd85c99205619035044c855308210ecc7afe05005cb1f13cb3fce01fa0201c8cecdc92d2e0044000000005366696461426f7420486f737420436f6d6d756e697479205265776172640030c88258c000000000000000000000000101cb67ccc970fb000034000000005366696461426f742054726561737572792052616b6502f8c88258c000000000000000000000000101cb67ccc970fb002a8ed01111111311111110111211100f11110f0e11100e10df10ce10bd102c109b108a107910685e3310344130db3c04111304031112030411110403111003104f103e104d103c104b1a104918104716144330df1111111311111110111211100f11110f423101640e11100e10df10ce10bd102c109b108a107910685e3310344130c87f01ca001114111311121111111055e0db3cc9ed54db314504f68ff03157141113d33f30f8416f2410235f038121e32dc002f2f4816684286eb3f2f4811bcf025613ba12f2f4702381010b23714133f40a6fa19401d70030925b6de2206eb39631206ef2d0809130e2813f9401b3f2f47027206ef2d0805612c705e30f81508621c200f2f40381010b227f71e0218210a2cff8f8ba3334353a003e2581010b2359f40a6fa193fa003092306de2206eb39631206ef2d0809130e2003e2481010b2359f40a6fa193fa003092306de2206eb39631206ef2d0809130e203fa216e955b59f4593098c801cf004133f441e25d5617db3c8169db21c200f2f40111150104a1717088245137413310246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb0056124004c8552082100b5d91985004cb1f12cb3fce01fa02c9363738001620935f0370e159a801a904004e000000005366696461426f7420537065637461746f7220546f74616c697a6572205061796f757402f8c88258c000000000000000000000000101cb67ccc970fb0021c1018ece1111111311111110111211100f11110f0e11100e10df10ce10bd10ac109b108a10791068105710461035401403db3c1113031112031111031110030f103e0d103c0b103a09103807103605034414de1111111311111110111211100f11110f4239016a0e11100e10df10ce10bd10ac109b108a10791068105710461035401403c87f01ca001114111311121111111055e0db3cc9ed54db314503c0e302218210e167214aba8f523157141113d33f30f8416f245b8113fe325614c705f2f4811bcf015612baf2f41111111311111110111211100f11110f0e11100e10df551cdb3cc87f01ca001114111311121111111055e0db3cc9ed54db31e0303b424504fc3157141113d33fd431d430d0f8416f2410235f038200e79f2ec000917f932ec001e2f2f4811bcf235615baf2f45612c705930cc000923c70e293303a7f8e8901705611401d29db3ce281327801f2f4737170885612035611413310246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf818ae23c3d3e3f0020c815cb3f5003cf16cb1fc9f90002f9100042000000005366696461426f74204475656c20526566756e6420506c617965722041001a58cf8680cf8480f400f400cf8103faf400c901fb002e6eb38ec42e206ef2d0807170885611552010246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb00de1111111311111110111211100f11110f0e11100e10df10ce10bd0c109b108a107910681057104610354403db3c4042410042000000005366696461426f74204475656c20526566756e6420506c6179657220420130c87f01ca001114111311121111111055e0db3cc9ed54db31450182708100a070885617553010246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb00430050000000005366696461426f7420457363726f7720436c65616e75702026204475737420537765657002fec121b08eb13057131111111311111110111211100f11110f0e11100e10df551cc87f01ca001114111311121111111055e0db3cc9ed54e0c0008ebb1113c21f8eb01111111311111110111211100f11110f0e11100e10df551cc87f01ca001114111311121111111055e0db3cc9ed54db31e05f0f5f05945f0f5f06e2f2c082454501f6011113011114ce01111101cb3f1fce500d206e9430cf84809201cee2500bfa02c8500afa025008fa0216cb075004206e9430cf84809201cee258206e9430cf84809201cee2c858206e9430cf84809201cee212cbff58206e9430cf84809201cee258fa0213f40013f40013f400c85004fa025004fa025004fa02cd46000612cdcd02e07088551410465522c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb0050558209312d00c8553082100b3af9c25005cb1f13cb3fce01fa0201fa02c9c88258c000000000000000000000000101cb67ccc970fb00024849003e000000005366696461426f7420457363726f7720496e697469616c697a65640026c87f01ca0055205023cecbffcb3fc9ed54db3101ec313302fa00fa40308200a7d4f84224c705f2f48200e96ff8276f1023821005f5e100a0bcf2f4717088103410246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb0002c87f01ca0055205023cecbffcb3fc9ed54db314b0052000000005366696461426f7420506c6174666f726d205472656173757279205769746864726177616c003802c21f8e1402c87f01ca0055205023cecbffcb3fc9ed54db31e05f0383cb6984');
    const builder = beginCell();
    builder.storeUint(0, 1);
    initClashMaster_init_args({ $$type: 'ClashMaster_init_args', owner, serverPublicKey })(builder);
    const __data = builder.endCell();
    return { code: __code, data: __data };
}

export const ClashMaster_errors = {
    2: { message: "Stack underflow" },
    3: { message: "Stack overflow" },
    4: { message: "Integer overflow" },
    5: { message: "Integer out of expected range" },
    6: { message: "Invalid opcode" },
    7: { message: "Type check error" },
    8: { message: "Cell overflow" },
    9: { message: "Cell underflow" },
    10: { message: "Dictionary error" },
    11: { message: "'Unknown' error" },
    12: { message: "Fatal error" },
    13: { message: "Out of gas error" },
    14: { message: "Virtualization error" },
    32: { message: "Action list is invalid" },
    33: { message: "Action list is too long" },
    34: { message: "Action is invalid or not supported" },
    35: { message: "Invalid source address in outbound message" },
    36: { message: "Invalid destination address in outbound message" },
    37: { message: "Not enough Toncoin" },
    38: { message: "Not enough extra currencies" },
    39: { message: "Outbound message does not fit into a cell after rewriting" },
    40: { message: "Cannot process a message" },
    41: { message: "Library reference is null" },
    42: { message: "Library change action error" },
    43: { message: "Exceeded maximum number of cells in the library or the maximum depth of the Merkle tree" },
    50: { message: "Account state size exceeded limits" },
    128: { message: "Null reference exception" },
    129: { message: "Invalid serialization prefix" },
    130: { message: "Invalid incoming message" },
    131: { message: "Constraints error" },
    132: { message: "Access denied" },
    133: { message: "Contract stopped" },
    134: { message: "Invalid argument" },
    135: { message: "Code of a contract was not found" },
    136: { message: "Invalid standard address" },
    138: { message: "Not a basechain address" },
    2892: { message: "Betting closed for this match" },
    5118: { message: "Only Master can trigger emergency sweep" },
    5525: { message: "Player A cannot play against self" },
    7119: { message: "Match ID mismatch" },
    8675: { message: "Match not resolved yet" },
    8932: { message: "Player B missing" },
    12920: { message: "Unauthorized match cancellation" },
    14246: { message: "Match already active or settled" },
    16276: { message: "Already claimed reward" },
    17825: { message: "Invalid target player" },
    20614: { message: "No winning bet found for sender" },
    23966: { message: "Invalid Ed25519 resolution signature" },
    25099: { message: "Minimum spectator bet is 0.1 TON" },
    26109: { message: "Insufficient TON sent for deployment and initial wager" },
    26244: { message: "Winner not set" },
    27099: { message: "Zero payout calculated" },
    35852: { message: "Insufficient wager amount sent" },
    42964: { message: "Only owner can withdraw treasury funds" },
    46500: { message: "Invalid winner" },
    46817: { message: "Only owner can update server public key" },
    57629: { message: "Match must be active to resolve" },
    59295: { message: "Cannot cancel resolved match" },
    59759: { message: "Reserve minimum storage balance" },
} as const

export const ClashMaster_errors_backward = {
    "Stack underflow": 2,
    "Stack overflow": 3,
    "Integer overflow": 4,
    "Integer out of expected range": 5,
    "Invalid opcode": 6,
    "Type check error": 7,
    "Cell overflow": 8,
    "Cell underflow": 9,
    "Dictionary error": 10,
    "'Unknown' error": 11,
    "Fatal error": 12,
    "Out of gas error": 13,
    "Virtualization error": 14,
    "Action list is invalid": 32,
    "Action list is too long": 33,
    "Action is invalid or not supported": 34,
    "Invalid source address in outbound message": 35,
    "Invalid destination address in outbound message": 36,
    "Not enough Toncoin": 37,
    "Not enough extra currencies": 38,
    "Outbound message does not fit into a cell after rewriting": 39,
    "Cannot process a message": 40,
    "Library reference is null": 41,
    "Library change action error": 42,
    "Exceeded maximum number of cells in the library or the maximum depth of the Merkle tree": 43,
    "Account state size exceeded limits": 50,
    "Null reference exception": 128,
    "Invalid serialization prefix": 129,
    "Invalid incoming message": 130,
    "Constraints error": 131,
    "Access denied": 132,
    "Contract stopped": 133,
    "Invalid argument": 134,
    "Code of a contract was not found": 135,
    "Invalid standard address": 136,
    "Not a basechain address": 138,
    "Betting closed for this match": 2892,
    "Only Master can trigger emergency sweep": 5118,
    "Player A cannot play against self": 5525,
    "Match ID mismatch": 7119,
    "Match not resolved yet": 8675,
    "Player B missing": 8932,
    "Unauthorized match cancellation": 12920,
    "Match already active or settled": 14246,
    "Already claimed reward": 16276,
    "Invalid target player": 17825,
    "No winning bet found for sender": 20614,
    "Invalid Ed25519 resolution signature": 23966,
    "Minimum spectator bet is 0.1 TON": 25099,
    "Insufficient TON sent for deployment and initial wager": 26109,
    "Winner not set": 26244,
    "Zero payout calculated": 27099,
    "Insufficient wager amount sent": 35852,
    "Only owner can withdraw treasury funds": 42964,
    "Invalid winner": 46500,
    "Only owner can update server public key": 46817,
    "Match must be active to resolve": 57629,
    "Cannot cancel resolved match": 59295,
    "Reserve minimum storage balance": 59759,
} as const

const ClashMaster_types: ABIType[] = [
    {"name":"DataSize","header":null,"fields":[{"name":"cells","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"bits","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"refs","type":{"kind":"simple","type":"int","optional":false,"format":257}}]},
    {"name":"SignedBundle","header":null,"fields":[{"name":"signature","type":{"kind":"simple","type":"fixed-bytes","optional":false,"format":64}},{"name":"signedData","type":{"kind":"simple","type":"slice","optional":false,"format":"remainder"}}]},
    {"name":"StateInit","header":null,"fields":[{"name":"code","type":{"kind":"simple","type":"cell","optional":false}},{"name":"data","type":{"kind":"simple","type":"cell","optional":false}}]},
    {"name":"Context","header":null,"fields":[{"name":"bounceable","type":{"kind":"simple","type":"bool","optional":false}},{"name":"sender","type":{"kind":"simple","type":"address","optional":false}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"raw","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"SendParameters","header":null,"fields":[{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"code","type":{"kind":"simple","type":"cell","optional":true}},{"name":"data","type":{"kind":"simple","type":"cell","optional":true}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"to","type":{"kind":"simple","type":"address","optional":false}},{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"MessageParameters","header":null,"fields":[{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"to","type":{"kind":"simple","type":"address","optional":false}},{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"DeployParameters","header":null,"fields":[{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}},{"name":"init","type":{"kind":"simple","type":"StateInit","optional":false}}]},
    {"name":"StdAddress","header":null,"fields":[{"name":"workchain","type":{"kind":"simple","type":"int","optional":false,"format":8}},{"name":"address","type":{"kind":"simple","type":"uint","optional":false,"format":256}}]},
    {"name":"VarAddress","header":null,"fields":[{"name":"workchain","type":{"kind":"simple","type":"int","optional":false,"format":32}},{"name":"address","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"BasechainAddress","header":null,"fields":[{"name":"hash","type":{"kind":"simple","type":"int","optional":true,"format":257}}]},
    {"name":"DeployMatch","header":310075029,"fields":[{"name":"matchId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"wagerAmount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"recruiterA","type":{"kind":"simple","type":"address","optional":true}},{"name":"groupAdminAddress","type":{"kind":"simple","type":"address","optional":true}}]},
    {"name":"JoinMatch","header":1174555988,"fields":[{"name":"matchId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"recruiterB","type":{"kind":"simple","type":"address","optional":true}}]},
    {"name":"BetSpectator","header":3365506230,"fields":[{"name":"matchId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"targetPlayer","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"ResolveMatch","header":756388397,"fields":[{"name":"matchId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"winner","type":{"kind":"simple","type":"address","optional":false}},{"name":"timestamp","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"signature","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"ClaimSpectatorReward","header":3249897020,"fields":[{"name":"matchId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"CancelMatch","header":2731538680,"fields":[{"name":"matchId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"reason","type":{"kind":"simple","type":"string","optional":false}},{"name":"signature","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"EmergencyRefund","header":3781632330,"fields":[{"name":"matchId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"SetServerPublicKey","header":3723581606,"fields":[{"name":"newKey","type":{"kind":"simple","type":"uint","optional":false,"format":256}}]},
    {"name":"EventMatchCreated","header":188414402,"fields":[{"name":"matchId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"playerA","type":{"kind":"simple","type":"address","optional":false}},{"name":"wagerAmount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"creationFee","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}}]},
    {"name":"EventPlayerJoined","header":31607001,"fields":[{"name":"matchId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"playerB","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"EventSpectatorBet","header":1752582815,"fields":[{"name":"matchId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"spectator","type":{"kind":"simple","type":"address","optional":false}},{"name":"targetPlayer","type":{"kind":"simple","type":"address","optional":false}},{"name":"amount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"totalBetsA","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"totalBetsB","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}}]},
    {"name":"EventMatchResolved","header":1249309108,"fields":[{"name":"matchId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"winner","type":{"kind":"simple","type":"address","optional":false}},{"name":"playerPotPayout","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"totalPlayerRake","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"distributableSpectatorPool","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"totalSpectatorRake","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}}]},
    {"name":"EventSpectatorClaim","header":190681496,"fields":[{"name":"matchId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"spectator","type":{"kind":"simple","type":"address","optional":false}},{"name":"payout","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}}]},
    {"name":"EventAffiliatePayout","header":3972509664,"fields":[{"name":"matchId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"recipient","type":{"kind":"simple","type":"address","optional":false}},{"name":"amount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"reason","type":{"kind":"simple","type":"string","optional":false}}]},
    {"name":"MatchEscrow$Data","header":null,"fields":[{"name":"clashMaster","type":{"kind":"simple","type":"address","optional":false}},{"name":"matchId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"playerA","type":{"kind":"simple","type":"address","optional":false}},{"name":"playerB","type":{"kind":"simple","type":"address","optional":true}},{"name":"wagerAmount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"totalBetsA","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"totalBetsB","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"state","type":{"kind":"simple","type":"uint","optional":false,"format":8}},{"name":"recruiterA","type":{"kind":"simple","type":"address","optional":true}},{"name":"recruiterB","type":{"kind":"simple","type":"address","optional":true}},{"name":"groupAdminAddress","type":{"kind":"simple","type":"address","optional":true}},{"name":"serverPublicKey","type":{"kind":"simple","type":"uint","optional":false,"format":256}},{"name":"winner","type":{"kind":"simple","type":"address","optional":true}},{"name":"creationFeePaid","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"spectatorBetsA","type":{"kind":"dict","key":"address","value":"uint","valueFormat":"coins"}},{"name":"spectatorBetsB","type":{"kind":"dict","key":"address","value":"uint","valueFormat":"coins"}},{"name":"spectatorClaimed","type":{"kind":"dict","key":"address","value":"bool"}},{"name":"distributableSpectatorPool","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"remainingWinningBetsToClaim","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"totalWinningBets","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}}]},
    {"name":"MatchEscrowDetails","header":null,"fields":[{"name":"matchId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"playerA","type":{"kind":"simple","type":"address","optional":false}},{"name":"playerB","type":{"kind":"simple","type":"address","optional":true}},{"name":"wagerAmount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"totalBetsA","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"totalBetsB","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"state","type":{"kind":"simple","type":"uint","optional":false,"format":8}},{"name":"winner","type":{"kind":"simple","type":"address","optional":true}},{"name":"distributableSpectatorPool","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"remainingWinningBetsToClaim","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}}]},
    {"name":"RakeDistribution","header":null,"fields":[{"name":"treasuryShare","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"recruiterShare","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"groupAdminShare","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}}]},
    {"name":"WithdrawTreasury","header":1116654954,"fields":[{"name":"amount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"recipient","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"MasterStats","header":null,"fields":[{"name":"matchCount","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"serverPublicKey","type":{"kind":"simple","type":"uint","optional":false,"format":256}},{"name":"owner","type":{"kind":"simple","type":"address","optional":false}},{"name":"balance","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}}]},
    {"name":"ClashMaster$Data","header":null,"fields":[{"name":"owner","type":{"kind":"simple","type":"address","optional":false}},{"name":"serverPublicKey","type":{"kind":"simple","type":"uint","optional":false,"format":256}},{"name":"matchCount","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
]

const ClashMaster_opcodes = {
    "DeployMatch": 310075029,
    "JoinMatch": 1174555988,
    "BetSpectator": 3365506230,
    "ResolveMatch": 756388397,
    "ClaimSpectatorReward": 3249897020,
    "CancelMatch": 2731538680,
    "EmergencyRefund": 3781632330,
    "SetServerPublicKey": 3723581606,
    "EventMatchCreated": 188414402,
    "EventPlayerJoined": 31607001,
    "EventSpectatorBet": 1752582815,
    "EventMatchResolved": 1249309108,
    "EventSpectatorClaim": 190681496,
    "EventAffiliatePayout": 3972509664,
    "WithdrawTreasury": 1116654954,
}

const ClashMaster_getters: ABIGetter[] = [
    {"name":"getEscrowAddress","methodId":120398,"arguments":[{"name":"matchId","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"playerA","type":{"kind":"simple","type":"address","optional":false}},{"name":"wagerAmount","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"recruiterA","type":{"kind":"simple","type":"address","optional":true}},{"name":"groupAdminAddress","type":{"kind":"simple","type":"address","optional":true}}],"returnType":{"kind":"simple","type":"address","optional":false}},
    {"name":"getStats","methodId":104054,"arguments":[],"returnType":{"kind":"simple","type":"MasterStats","optional":false}},
]

export const ClashMaster_getterMapping: { [key: string]: string } = {
    'getEscrowAddress': 'getGetEscrowAddress',
    'getStats': 'getGetStats',
}

const ClashMaster_receivers: ABIReceiver[] = [
    {"receiver":"internal","message":{"kind":"typed","type":"DeployMatch"}},
    {"receiver":"internal","message":{"kind":"text"}},
    {"receiver":"internal","message":{"kind":"empty"}},
    {"receiver":"internal","message":{"kind":"typed","type":"SetServerPublicKey"}},
    {"receiver":"internal","message":{"kind":"typed","type":"WithdrawTreasury"}},
]

export const STATE_CREATED = 0n;
export const STATE_ACTIVE = 1n;
export const STATE_RESOLVED = 2n;
export const STATE_CANCELLED = 3n;

export class ClashMaster implements Contract {
    
    public static readonly storageReserve = 0n;
    public static readonly errors = ClashMaster_errors_backward;
    public static readonly opcodes = ClashMaster_opcodes;
    
    static async init(owner: Address, serverPublicKey: bigint) {
        return await ClashMaster_init(owner, serverPublicKey);
    }
    
    static async fromInit(owner: Address, serverPublicKey: bigint) {
        const __gen_init = await ClashMaster_init(owner, serverPublicKey);
        const address = contractAddress(0, __gen_init);
        return new ClashMaster(address, __gen_init);
    }
    
    static fromAddress(address: Address) {
        return new ClashMaster(address);
    }
    
    readonly address: Address; 
    readonly init?: { code: Cell, data: Cell };
    readonly abi: ContractABI = {
        types:  ClashMaster_types,
        getters: ClashMaster_getters,
        receivers: ClashMaster_receivers,
        errors: ClashMaster_errors,
    };
    
    constructor(address: Address, init?: { code: Cell, data: Cell }) {
        this.address = address;
        this.init = init;
    }
    
    async send(provider: ContractProvider, via: Sender, args: { value: bigint, bounce?: boolean| null | undefined }, message: DeployMatch | string | null | SetServerPublicKey | WithdrawTreasury) {
        
        let body: Cell | null = null;
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'DeployMatch') {
            body = beginCell().store(storeDeployMatch(message)).endCell();
        }
        if (typeof message === 'string') {
            body = beginCell().storeUint(0, 32).storeStringTail(message).endCell();
        }
        if (message === null) {
            body = new Cell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'SetServerPublicKey') {
            body = beginCell().store(storeSetServerPublicKey(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'WithdrawTreasury') {
            body = beginCell().store(storeWithdrawTreasury(message)).endCell();
        }
        if (body === null) { throw new Error('Invalid message type'); }
        
        await provider.internal(via, { ...args, body: body });
        
    }
    
    async getGetEscrowAddress(provider: ContractProvider, matchId: bigint, playerA: Address, wagerAmount: bigint, recruiterA: Address | null, groupAdminAddress: Address | null) {
        const builder = new TupleBuilder();
        builder.writeNumber(matchId);
        builder.writeAddress(playerA);
        builder.writeNumber(wagerAmount);
        builder.writeAddress(recruiterA);
        builder.writeAddress(groupAdminAddress);
        const source = (await provider.get('getEscrowAddress', builder.build())).stack;
        const result = source.readAddress();
        return result;
    }
    
    async getGetStats(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('getStats', builder.build())).stack;
        const result = loadGetterTupleMasterStats(source);
        return result;
    }
    
}