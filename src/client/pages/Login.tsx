import React, { useContext, useState } from 'react';
import { TextField, Button, InputAdornment, CircularProgress } from '@mui/material';
import { AccountCircle, Lock, HighlightOff, Login as LoginIcon, Check } from '@mui/icons-material';
import "../css/login.css";
import ModeSwitcher from '../components/ModeSwitcher';
import axios from 'axios';
import qs from 'qs';
import { LoginContext, convertJwt } from '../components/App';
import { useNavigate } from 'react-router-dom';
import LinearBuffer from '../components/LinearBuffer';

function Login() {
  const [finish, setFinish] = useState(1);
  const [start, setStart] = useState(1);
  const navigate = useNavigate();
  const [isLoggedIn, setLogin, userInfo, setUserInfo] = useContext(LoginContext);
  const [formInfo, updateFormInfo] = useState({
    user: {
      isError: false,
      message: "Minimum 2",
      value: userInfo?.user || ""
    },
    password: {
      isError: false,
      message: "Enter Password",
      value: ""
    },
    token: ""
  });
  const [isLoading, setLoading] = React.useState(false);
  const [errorObj, setMessageObj] = React.useState({ isError: null, status: null, message: null });

  const isFormValid = formInfo.user.value && !formInfo.user.isError && formInfo.password.value && !formInfo.password.isError;

  function updateField(name: string, value: string) {
    const hasError = validateField(name, value, false);
    const newObj = { ...formInfo, [name]: { ...formInfo[name], value: value } }
    if (!hasError) { newObj[name].isError = false } // remove error state while typing but don't add before blur event
    updateFormInfo(newObj)
  }

  function validateField(name: string, value: string, update = true) {
    const isError = value.length <= 1;
    if (update) {
      updateFormInfo({ ...formInfo, [name]: { ...formInfo[name], isError: isError } })
    } else {
      return isError;
    }
  }

  async function submit(e) {
    e.preventDefault();
    const date = new Date();
    setStart(date.getTime());
    const milliseconds = 9 * 1000; // Estimated bcrypt Time
    setFinish(new Date(date.getTime() + milliseconds).getTime());

    setLoading(true);
    setMessageObj({ isError: null, status: null, message: null });


    let token = null; // get csrf token
    try {
      token = await axios({
        method: "post",
        url: "/login/csrf",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "x-requested-with": "XMLHttpRequest"
        }
      })
      updateFormInfo({ ...formInfo, token: token.data });
    } catch (error) {
      console.log(error);
      setMessageObj({ isError: true, status: error.response.data.status || error.response.status, message: error.response.data.message || error.message })
    }

    if (!token) { setLoading(false); return; } // skip when the first request has an error

    // collect data and convert to urlencoded string then send
    const bodyFormData = { "user": formInfo.user.value, "password": formInfo.password.value, csrfToken: token.data };
    try {
      const response = await axios({
        method: "post",
        url: "/login",
        data: qs.stringify(bodyFormData),
        headers: { "content-type": "application/x-www-form-urlencoded" }
      })
      const token = response.data.token;
      localStorage.setItem("jwt", token);
      setLogin(true);
      setMessageObj({ isError: false, status: <Check />, message: "Success!" })

      // update linearBar for delay until redirect
      const date = new Date();
      setStart(date.getTime());
      setFinish(new Date(date.getTime() + 1000).getTime());
      setUserInfo(convertJwt());

      // redirect back to main page
      setTimeout(() => { setLoading(false); navigate("/") }, 1000);

    } catch (error) {
      console.log(error);
      setMessageObj({ isError: true, status: error.response.data.status || error.response.status, message: error.response.data.message || error.message })
      setLoading(false); // Reset loading after request is complete
    }
  }

  return (
    <div className="login">
      <div className="fixed">
        <ModeSwitcher />
      </div>
      <div className="wrapper cut">
        <h1 className="headline">
          Login Page
        </h1>
        {isLoggedIn &&
         <h2 className="headline sub">You are logged in</h2>
        }
        <form action="/login" method="post" onSubmit={submit}>
          <TextField
            label="Username"
            variant="filled"
            value={formInfo.user.value}
            onChange={(e) => updateField(e.target.name, e.target.value)}
            onBlur={(e) => validateField(e.target.name, e.target.value)}
            error={formInfo.user.isError}
            helperText={formInfo.user.isError ? formInfo.user.message : false}
            required
            InputProps={{
              classes: {
                root: "cut",
              },
              autoFocus: true,
              name: "user",
              startAdornment: (
                <InputAdornment position="start">
                  <AccountCircle />
                </InputAdornment>
              ),
              endAdornment: formInfo.user.isError ? (
                <InputAdornment position="end">
                  <HighlightOff color="error" />
                </InputAdornment>
              ) : null
            }}
          />

          <TextField
            label="Password"
            type="password"
            variant="filled"
            value={formInfo.password.value}
            onChange={(e) => updateField(e.target.name, e.target.value)}
            onBlur={(e) => validateField(e.target.name, e.target.value)}
            required
            error={formInfo.password.isError}
            helperText={formInfo.password.isError ? formInfo.password.message : false}
            InputProps={{
              classes: {
                root: "cut",
              },
              name: "password",
              startAdornment: (
                <InputAdornment position="start">
                  <Lock />
                </InputAdornment>
              ),
              endAdornment: formInfo.password.isError ? (
                <InputAdornment position="end">
                  <HighlightOff color="error" />
                </InputAdornment>
              ) : null
            }}
          />
          <input type="hidden" id="csrfToken" value={formInfo.token} name="csrfToken" />
          <div className="subWrapper">
            {errorObj.status ? (
              <p className={`message ${errorObj.isError ? 'message--error' : 'message--success'}`}>
                <strong>{errorObj.status}</strong>
                {errorObj.message.split('\n').map((line: string, index: string) => (
                  <React.Fragment key={index}>
                    {line}
                    <br />
                  </React.Fragment>
                ))}
              </p>
            ) : null}
            <Button
              className="submit cut"
              variant="contained"
              startIcon={isLoading ? <CircularProgress color="inherit" size={"1em"} /> : <LoginIcon />}
              color="primary"
              type="submit"
              disabled={!isFormValid || isLoading}
            >
              Login
            </Button>
          </div>
          {isLoading && <LinearBuffer msStart={start} msFinish={finish} />}
        </form>
      </div>
      <svg className="bg-pattern" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="url(#repeatingGradient)" />
      </svg>
    </div>
  )
}

export default Login;
