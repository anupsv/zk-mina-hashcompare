import '../styles/globals.css'
import React, {useEffect, useState} from "react";

import {Field, Mina, PrivateKey, PublicKey,} from 'snarkyjs'

import AppWorkerClient from './appWorkerClient';
import Votes from './Votes';


import './reactCOIServiceWorker';

let transactionFee = 100_000_000;

export default function App() {
  let [appLoadingState, setAppLoadingState] = useState("....");
  let [minaAccount, setMinaAccount] = useState();
  let [votes, setVotes] = useState(0);
  let [state, setState] = useState({
    zkappWorkerClient: null as null | AppWorkerClient,
    hasBeenSetup: false,
    accountExists: false,
    currentNum: null as null | Field,
    privateKey: null as null | PrivateKey,
    publicKey: null as null | PublicKey,
    appPublicKey: null as null | PublicKey,
    creatingTransaction: false,
  });

  // -------------------------------------------------------
  // Do Setup

  useEffect(() => {
    (async () => {
      if (!state.hasBeenSetup) {
        const appWorkerClient = new AppWorkerClient();
        await appWorkerClient.loadSnarkyJS();
        await appWorkerClient.setActiveInstanceToBerkeley();

        if (localStorage.privateKey == null) {
          localStorage.privateKey = PrivateKey.random().toBase58();
        }

        let privateKey = PrivateKey.fromBase58(localStorage.privateKey);
        let publicKey = privateKey.toPublicKey();

        setAppLoadingState('checking if account exists with some tMINA');
        const res = await appWorkerClient.fetchAccount({ publicKey: publicKey! });
        const accountExists = res.error == null;

        await appWorkerClient.getContract();
        setAppLoadingState('compiling our app.....');

        await appWorkerClient.compileContract();

        const appPublicKey = PublicKey.fromBase58('B62qrBBEARoG78KLD1bmYZeEirUfpNXoMPYQboTwqmGLtfqAGLXdWpU');

        await appWorkerClient.initAppInstance(appPublicKey);

        setAppLoadingState('getting app state from chain .......');
        await appWorkerClient.fetchAccount({ publicKey: appPublicKey })
        const currentNum = await appWorkerClient.getNum();
        setAppLoadingState(`current state: ${currentNum.toString()}` );

        setState({ 
            ...state, 
            zkappWorkerClient: appWorkerClient,
            hasBeenSetup: true, 
            publicKey, 
            privateKey, 
            appPublicKey: appPublicKey,
            accountExists, 
            currentNum
        });
      }
    })();
  }, [state]);

  // -------------------------------------------------------
  // Wait for account to exist, if it didn't

  // useEffect(() => {
  //   (async () => {
  //     if (state.hasBeenSetup && !state.accountExists) {
  //       for (;;) {
  //         setAppLoadingState('checking if account exists...');
  //         const res = await state.zkappWorkerClient!.fetchAccount({ publicKey: state.publicKey! })
  //         const accountExists = res.error == null;
  //         if (accountExists) {
  //           break;
  //         }
  //         await new Promise((resolve) => setTimeout(resolve, 5000));
  //       }
  //       setState({ ...state, accountExists: true });
  //     }
  //   })();
  // }, [state.hasBeenSetup]);

  // -------------------------------------------------------
  // Send a transaction

  const onSendTransaction = async () => {
    setState({ ...state, creatingTransaction: true });
    setAppLoadingState('sending a transaction...');

    await state.zkappWorkerClient!.fetchAccount({ publicKey: state.publicKey! });

    // await state.zkappWorkerClient!.createUpdateTransaction(state.privateKey!, transactionFee);

    let transactionJson = await state.zkappWorkerClient!.createTransactionWithWallet();
    console.log(transactionJson);
    let partyResult = await window.mina.sendTransaction({
      transaction: transactionJson,
      feePayer: {
        memo: "",
        fee: 0.1
      },
    }).catch(err => err)

    if (partyResult.message == 'user reject'){
      alert("User rejected Signature");
    }else {
      alert(`Hash of the tx : ${partyResult.hash}`);
    }
    // setAppLoadingState('creating proof...');
    // await state.zkappWorkerClient!.proveUpdateTransaction();

    // const transactionHash = await state.zkappWorkerClient!.sendUpdateTransaction();

    // if (!transactionHash) {
    //   setAppLoadingState(
    //       'See transaction here https://berkeley.minaexplorer.com/transaction/' + transactionHash
    //   );

    // alert(txjson);
    setVotes(1);
    setState({ ...state, creatingTransaction: false });
  }

  // Refresh the current state

  const refreshCurrentNum = async () => {
    setAppLoadingState('getting app state...');
    await state.zkappWorkerClient!.fetchAccount({ publicKey: state.appPublicKey! })
    const currentNum = await state.zkappWorkerClient!.getNum();
    setAppLoadingState(`current state var: ${currentNum.toString()}`);
    setState({ ...state, currentNum });
  }

  const connectWallet = async () => {
    if (!window.mina) {
      alert("No provider was found Auro Wallet")
    } else {
      let approveAccount = await window.mina.requestAccounts().catch(err => err);
      setMinaAccount(approveAccount);
      alert(`connected with auro wallet with account ${approveAccount}`)
      }
  }

  // -------------------------------------------------------
  // Create UI elements

  let setupText = state.hasBeenSetup ? 'SnarkyJS is now ready, lets go !!' : 'SnarkyJS being imported, give it a few minutes .....';
  let setup = <div className={"centered"}> { setupText } </div>

  let mainContent;
  if (state.hasBeenSetup && state.accountExists) {
    mainContent = <div>
      <button className={"button-29"} onClick={onSendTransaction} disabled={state.creatingTransaction}> Send Transaction </button>
      <div> Current Number in app: { state.currentNum!.toString() } </div>
      <button onClick={refreshCurrentNum}> Get Latest State </button>
    </div>
  }

  return <div>
   {!state.hasBeenSetup ? setup : ""}
    {/*{<Notification message={appLoadingState} />}*/}
    {/*{ true? <div>*/}
    { state.hasBeenSetup && state.accountExists? <div>
     {/*<div> Current Number in app: { state.currentNum!.toString() } </div>*/}
     {/*<button onClick={refreshCurrentNum}> Get Latest State </button>*/}
      <div className={"centered"}><br/>DAO Proposal 1: DAO will never disclose users. <br/>Votes: <Votes message={votes} />
        <br/><br/><br/>
        <div><br/>&nbsp;&nbsp;&nbsp;&nbsp;<button className={"button-29"} onClick={onSendTransaction} disabled={state.creatingTransaction}> Vote </button></div>
      </div>
      <div className={"offcentered"}><br/>DAO Proposal 2: DAO will have more features in the future. <br/>Votes: 2
        <br/><br/><br/>
        <div><br/>&nbsp;&nbsp;&nbsp;&nbsp;<button className={"button-29"} onClick={onSendTransaction} disabled={state.creatingTransaction}> Vote </button></div>
      </div>
   </div> : "" }
    <button onClick={connectWallet}> Connect </button>
  </div>
}

