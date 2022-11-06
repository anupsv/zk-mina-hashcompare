import {
  Mina,
  isReady,
  PublicKey,
  PrivateKey,
  Field,
  fetchAccount,
} from 'snarkyjs'

type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;

// ---------------------------------------------------------------------------------------

import type { Add } from '../../contracts/src/Add';

const state = {
  Add: null as null | typeof Add,
  zkapp: null as null | Add,
  transaction: null as null | Transaction,
}

// ---------------------------------------------------------------------------------------

const functions = {
  loadSnarkyJS: async (args: {}) => {
    await isReady;
  },
  setActiveInstanceToBerkeley: async (args: {}) => {
    const Berkeley = Mina.BerkeleyQANet(
      "https://proxy.berkeley.minaexplorer.com/graphql"
    );
    Mina.setActiveInstance(Berkeley);
  },
  loadContract: async (args: {}) => {
    const { Add } = await import('../../contracts/build/src/Add.js');
    state.Add = Add;
  },
  compileContract: async (args: {}) => {
    await state.Add!.compile();
  },
  fetchAccount: async (args: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey58);
    return await fetchAccount({ publicKey });
  },
  initAppInstance: async (args: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey58);
    state.zkapp = new state.Add!(publicKey);
  },
  getNum: async (args: {}) => {
    const currentNum = await state.zkapp!.num.get();
    return currentNum.toString();
  },
  createUpdateTransaction: async (args: { feePayerPrivateKey58: string, transactionFee: number }) => {
    const feePayerKey = PrivateKey.fromBase58(args.feePayerPrivateKey58);
    const transaction = await Mina.transaction(
        { feePayerKey, fee: args.transactionFee },
        () => {
          state.zkapp!.update();
        }
    );
    state.transaction = transaction;
  },

  createTransactionWithWallet: async (args: {}) => {
    console.log("creating tx")
    const transaction = await Mina.transaction(() => {
          state.zkapp!.update();
        }
    );

    console.log("prooving tx")

    await transaction!.prove();

    console.log("return json tx")

    return transaction.toJSON();
  },

  proveUpdateTransaction: async (args: {}) => {
    await state.transaction!.prove();
  },

  sendUpdateTransaction: async (args: {}) => {
    var txn_res = await state.transaction!.send();
    const transactionHash = await txn_res!.hash();
    return transactionHash;
  },
};

// ---------------------------------------------------------------------------------------

export type WorkerFunctions = keyof typeof functions;

export type AppWorkerRequest = {
  id: number,
  fn: WorkerFunctions,
  args: any
}

export type AppWorkerResponse = {
  id: number,
  data: any
}
if (process.browser) {
  addEventListener('message', async (event: MessageEvent<AppWorkerRequest>) => {
    const returnData = await functions[event.data.fn](event.data.args);

    const message: AppWorkerResponse = {
      id: event.data.id,
      data: returnData,
    }
    postMessage(message)
  });
}
