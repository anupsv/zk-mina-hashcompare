import {
  fetchAccount,
  PublicKey,
  PrivateKey,
  Field,
} from 'snarkyjs'

import type { AppWorkerRequest, AppWorkerResponse, WorkerFunctions } from './zkappWorker';

export default class AppWorkerClient {

  // ---------------------------------------------------------------------------------------

  loadSnarkyJS() {
    return this._call('loadSnarkyJS', {});
  }

  setActiveInstanceToBerkeley() {
    return this._call('setActiveInstanceToBerkeley', {});
  }

  getContract() {
    return this._call('loadContract', {});
  }

  compileContract() {
    return this._call('compileContract', {});
  }
  createTransactionWithWallet() {
    return this._call('createTransactionWithWallet', {});
  }

  fetchAccount({ publicKey }: { publicKey: PublicKey }): ReturnType<typeof fetchAccount> {
    const result = this._call('fetchAccount', { publicKey58: publicKey.toBase58() });
    return (result as ReturnType<typeof fetchAccount>);
  }

  initAppInstance(publicKey: PublicKey) {
    return this._call('initAppInstance', { publicKey58: publicKey.toBase58() });
  }

  async getNum(): Promise<Field> {
    const result = await this._call('getNum', {});
    return Field.fromString(result as string);
  }

  createUpdateTransaction(feePayerPrivateKey: PrivateKey, transactionFee: number) {
    const feePayerPrivateKey58 = feePayerPrivateKey.toBase58();
    return this._call('createUpdateTransaction', { feePayerPrivateKey58, transactionFee });
  }

  proveUpdateTransaction() {
    return this._call('proveUpdateTransaction', {});
  }

  async sendUpdateTransaction() {
    const result = await this._call('sendUpdateTransaction', {});
    return result as string;
  }

  // ---------------------------------------------------------------------------------------

  worker: Worker;

  promises: { [id: number]: { resolve: (res: any) => void, reject: (err: any) => void } };

  nextId: number;

  constructor() {
    this.worker = new Worker(new URL('./zkappWorker.ts', import.meta.url))
    this.promises = {};
    this.nextId = 0;

    this.worker.onmessage = (event: MessageEvent<AppWorkerResponse>) => {
      this.promises[event.data.id].resolve(event.data.data);
      delete this.promises[event.data.id];
    };
  }

  _call(fn: WorkerFunctions, args: any) {
    return new Promise((resolve, reject) => {
      this.promises[this.nextId] = { resolve, reject }

      const message: AppWorkerRequest = {
        id: this.nextId,
        fn,
        args,
      };

      this.worker.postMessage(message);

      this.nextId++;
    });
  }
}

