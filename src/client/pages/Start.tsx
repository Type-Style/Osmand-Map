import React, { useEffect, useState, useContext, useRef } from 'react'
import "../css/start.css";
import axios from 'axios';
import { LoginContext } from "../components/App";
import { HighlightOff, Check } from '@mui/icons-material';
import { Button } from '@mui/material';
import ModeSwitcher from '../components/ModeSwitcher';
import Map from '../components/Map';
import Status from '../components/Status';
import LinearBuffer from "../components/LinearBuffer";

function timeAgo(timestamp: number): string {
  if (!Number.isInteger(timestamp)) {
    return "";
  }
  const now = Date.now();
  const diffInSeconds = Math.floor((now - timestamp) / 1000);

  const seconds = diffInSeconds;
  const minutes = Math.floor(diffInSeconds / 60);
  const hours = Math.floor(diffInSeconds / 3600);
  const days = Math.floor(diffInSeconds / 86400);
  const weeks = Math.floor(diffInSeconds / 604800);
  const months = Math.floor(diffInSeconds / 2592000);
  const years = Math.floor(diffInSeconds / 31536000);

  if (seconds < 8) { return "Instant"; }
  else if (seconds < 30) { return "Just now" }
  else if (seconds < 60) { return "a moment ago" }
  else if (minutes < 60) { return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`; }
  else if (hours < 24) { return `${hours} ${hours === 1 ? "hour" : "hours"} ago`; }
  else if (days < 7) { return `${days} ${days === 1 ? "day" : "days"} ago`; }
  else if (weeks < 4) { return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`; }
  else if (months < 12) { return `${months} ${months === 1 ? "month" : "months"} ago`; }
  else { return `${years} ${years === 1 ? "year" : "years"} ago`; }
}

function Start() {
  const [isLoggedIn, setLogin, userInfo] = useContext(LoginContext);
  const [entries, setEntries] = useState<Models.IEntry[]>([]);
  const [messageObj, setMessageObj] = useState({ isError: null, status: null, message: null });
  const [lastFetch, setLastFetch] = useState<number>();
  const [nextFetch, setNextFetch] = useState<number>();

  const index = useRef(0);
  const intervalID = useRef<NodeJS.Timeout>();

  const fetchIntervalMs = 1000 * 55;

  const getData = async () => {
    const token = localStorage.getItem("jwt");
    let response;

    if (!token) {
      setLogin(false);
      setMessageObj({ isError: true, status: "403", message: "No valid login" })
      return false;
    }

    try {
      const now = new Date().getTime();
      setLastFetch(now);
      response = await axios({
        method: 'get',
        url: "/read?index=" + index.current + "&noCache=" + now,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const newEntries = response.data.entries;
      if (newEntries.length) {
        setEntries((prevEntries) => [prevEntries, ...newEntries]);
        index.current += newEntries.length;
      }

      setMessageObj({ isError: null, status: null, message: null });
      setNextFetch(new Date().getTime() + fetchIntervalMs);
    } catch (error) {
      clearInterval(intervalID.current); intervalID.current = null;
      console.info("cleared Interval");
      setNextFetch(null);
      if (error.response.status == 403) { setLogin(false) }
      setMessageObj({ isError: true, status: error.response.data.status || error.response.status, message: error.response.data.message || error.message });
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      getData();
      intervalID.current = setInterval(getData, fetchIntervalMs); // capture interval ID as return from setInterval and pass to state
      return () => { console.log("cleanup"); clearInterval(intervalID.current); intervalID.current = null; };
    } else if (userInfo) { // no valid login but userInfo
      setMessageObj({ isError: true, status: "403", message: "Login expired" })
    }
  }, []);

  return (
    <>
      <div className="start">
        <div className="grid-item info">
          {messageObj.isError &&
            <div className="message center error">
              <strong className="title">{messageObj.status}</strong> <span className="fadeIn">{messageObj.message}</span>
            </div>
          }
          {!messageObj.isError && userInfo &&
            <div className="message">
              <strong className="title">{userInfo.user}</strong> <span className="fade">Welcome back</span>
            </div>
          }
          <Button
            className={`loginButton ${isLoggedIn ? "loginButton--loggedIn" : ''} cut`}
            variant="contained"
            href={isLoggedIn ? null : "/login"}
            onClick={isLoggedIn ? () => { setLogin(false); localStorage.clear(); } : null}
            endIcon={isLoggedIn ? <Check /> : null}
            startIcon={isLoggedIn ? null : <HighlightOff />}
            color={isLoggedIn ? "success" : "error"}
            size="large"
          >
            {isLoggedIn ? "Logged In" : "Logged Out"}
          </Button>
        </div>

        <div className="grid-item map"><Map entries={entries} /></div>
        <div className="grid-item theme"><ModeSwitcher /></div>
        <div className="grid-item status cut-after"><Status entries={entries} /></div>
        <div className="grid-item images">
          <div className="image">image1</div>
          <div className="image">image2</div>
          <div className="image">image3</div>
        </div>

        <div className="grid-item subinfo">
          {isLoggedIn && intervalID &&
            <LinearBuffer msStart={lastFetch} msFinish={nextFetch} variant="determinate" />
          }
          {isLoggedIn && intervalID && entries?.length > 0 &&
            <>
              <strong className="info noDivider">GPS:</strong>
              <span className="info">{entries.at(-1).lat} / {entries.at(-1).lon}</span>
              <span className="info">{timeAgo(entries.at(-1).time.created)}</span>
            </>
          }
        </div>
      </div>
      <svg className="bg-pattern" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="url(#repeatingGradient)" />
      </svg>
    </>
  )
}

export default Start