import React, { useEffect, useState } from "react";
import { BrowserView, MobileView } from 'react-device-detect';
import { ethers } from "ethers";
import twitter3 from "./utils/twitter3.json"
import './App.css';
import loaderSVG from './utils/loader.svg';
import classNames from "classnames";
import moment from 'moment'

export default function App() {

  const [currentAccount, setCurrentAccount] = useState(null);
  const [metamask, setMetamask] = useState(false);
  const [message, setMessage] = useState("");
  const [warn, setWarn] = useState(false);
  const [loader, setLoader] = useState(false);
  const [allTweets, setAllTweets] = useState([]);
  const currentNetwork = 'Ropsten';
  const contractAddress = "0x72Ea8e02218090D1F4393Abd12Ab03c7922A6314";
  const contractABI = twitter3.abi;

  const checkMetaMask = () => {
    const { ethereum } = window;

    if (ethereum) {
      setMetamask(true);
      console.log('metamask looking super good', ethereum)
      checkIsWalletConnectedToAcc();
      return true;
    } else {
      setMetamask(false);
      console.log('no Metamask found , install Metamask from https://metamask.io/');
      return false;
    }
  }

  const checkIsWalletConnectedToAcc = async () => {
    try {
      const { ethereum } = window;
      const account = await ethereum.request({ method: 'eth_accounts' });
      checkAccoutAndSetState(account);
      getAllTweets();
    } catch (err) {
      console.log(err)
    }
  }

  const connectWallet = async () => {
    try {
      const { ethereum } = window;
      const account = await ethereum.request({ method: 'eth_requestAccounts' });
      checkAccoutAndSetState(account);
      getAllTweets();
    } catch (err) {
      console.log(err)
    }
  }

  const checkAccoutAndSetState = (account) => {
    if (account) {
      setCurrentAccount(account[0]);
      console.log('Your Metamask account id : ', account[0]);
    }
  }

  const tweet = async () => {
    try {
      if (!checkMsg()) return;
      const twitter3Contract = getTwitter3Contract();
      let count = await twitter3Contract.getTweetsCount();
      setLoader(true);
      console.log('previous count : ', count.toNumber());
      const tweetTxn = await twitter3Contract.tweet(message);
      console.log('minning started ...', tweetTxn.hash);
      await tweetTxn.wait();
      console.log('minning finished ...', tweetTxn.hash);
      count = await twitter3Contract.getTweetsCount();
      console.log('new count : ', count.toNumber());
      setLoader(false);
    } catch (err) {
      console.log(err);
      setLoader(false);
      handleErr(err);
    }
  }

  const checkMsg = () => {
    setWarn(!message);
    if (!message) setTimeout(() => alert('Please enter tweet'), 200);
    return !!message;
  }

  const getAllTweets = async (loader = true) => {
    try {
      const twitter3Contract = getTwitter3Contract();
      console.log('getting all tweets ...');
      if (loader) setLoader(true);
      const tweets = await twitter3Contract.getAllTweets();
      const tweetsArray = tweets.map(tweet => {
        return {
          address: tweet.tweeter,
          timestamp: new Date(tweet.timestamp * 1000),
          tweet: tweet.tweet
        }
      });
      console.log('all tweets : ', tweetsArray);
      setAllTweets(tweetsArray);
      setLoader(false);
    } catch (err) {
      console.log(err);
      setLoader(false);
      handleErr(err);
    }
  }

  const getTwitter3Contract = () => {
    const { ethereum } = window;
    const provider = new ethers.providers.Web3Provider(ethereum);
    const signer = provider.getSigner();
    return new ethers.Contract(contractAddress, contractABI, signer);
  }

  const onNewTweet = (from, timestamp, tweet) => {
    console.log('new tweet', from, timestamp, tweet);
    setMessage('');
    getAllTweets(false);
  };

  const resetState = () => {
    setCurrentAccount(null);
    setMetamask(false);
    setMessage('');
    setWarn(false);
    setAllTweets([]);
    setLoader(false);
  }

  const handleErr = (err) => {
    const errorMsg = err.message.includes("Wait 1 Mints to Tweet again")
      ? 'You need to wait 1 mints to tweet again! let ether nodes to cool down'
      : `Something went wrong! are you sure is your network is ${currentNetwork}`;
    alert(errorMsg);
  }

  useEffect(() => {
    if (checkMetaMask()) getTwitter3Contract().on('NewTweet', onNewTweet);
    return () => {
      if (!!getTwitter3Contract()) getTwitter3Contract().off('NewTweet', onNewTweet);
      resetState();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  var btnClass = classNames({
    'btn-blue': true,
    'btn-green': message,
    'btn-red': !message && warn
  });

  return (
    <div className="mainContainer">

      {loader && <div className="progress-loader">
        <div className="overlay"></div>
        <div className="loading-spinner">
          <img className='spinner' src={loaderSVG} />
        </div>
      </div>
      }

      <div className="dataContainer">
        <div className="header">
          🐦 Hey there!
        </div>

        {!metamask && <div className="bio">
          <BrowserView> To use this Dapp you need to download Metamask from <a href="https://metamask.io/">https://metamask.io/</a> kindly refresh the page after installing Metamask.</BrowserView>
          <MobileView>This D-App currently not supported in mobile phones, use this from your desktop/laptop!</MobileView>
          <div className="bio"></div>
        </div>
        }

        {metamask && !currentAccount && (<div>
          <div className="bio">
            Hey I'm Rakesh, People dont need to be too smart to write a smart contract or to use smart contract , so connect your metamask wallet and write your first web3 tweet!
          </div>
          <div className="flex-column-justify-center ">
            <button className="waveButton ripple" onClick={connectWallet}>
              Connect Wallet
            </button>
          </div>
        </div>
        )}

        {metamask && currentAccount && <div>
          <div className="bio">
            Hey I'm Rakesh, People dont need to be too smart to write a smart contract or to use smart contract , start writing your web3 tweet! Check console of the browser to see all the cool stuff of Txn and minning Data!
          </div>
          <div className="flex-column-justify-center tweet-input-container">
            <input label="Message" maxLength="120" placeholder={warn ? "Tweet Cant be empty in Blockchain!" : "Enter your tweet here, to store in blockchain ;)"}
              value={message} onChange={e => { setMessage(e.target.value); setWarn(false) }} className={btnClass} onKeyPress={(e) => { if (e.key === 'Enter') tweet() }} />

            <button className="waveButton ripple" onClick={tweet}>
              Tweet
            </button>
          </div>
          <div id="style-4" className='tweetsContainer flex-direction-column'>
            <div className="bio">{allTweets.length ? `All Tweets in Twitter-3.0 Block (${allTweets.length})` : "There are no Tweets in the Blockchain"}</div>
            {allTweets.map((tweetData, index) => {
              return (
                <div key={index} className="tweet-card">
                  <div className="lineSpace"><span className="tweetName">Tweet</span> {tweetData.tweet}</div>
                  <div className="flex-space-between-pad-1">
                    <div className="bio">{tweetData.address}</div>
                    <div className="bio">{moment(tweetData.timestamp).format('DD/MM/YYYY')}</div>
                  </div>
                </div>)
            })}
          </div>
        </div>}

      </div>
    </div>

  );
}

