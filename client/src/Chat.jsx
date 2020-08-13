import { useOktaAuth } from '@okta/okta-react'
import React, { useState, useEffect } from 'react'
import config from './config'
import { fetchUserLoginStatus } from './api';
// @ts-ignore
import styles from './App.module.css'
import io from "socket.io-client"
import TextContainer from './components/TextContainer/TextContainer'
import InfoBar from './components/InfoBar/InfoBar'
import Messages from './components/Messages/Messages'
import Input from './components/Input/Input'

//temp
const possibleErrors = ['Your resource server example is using the same Okta authorization server (issuer) that you have configured this React application to use.']
let savedRoomsFetchFailed = false
let counterpartySocketMap = {}
let counterpartyRoomMap = {}

const Chat = () => {
  const { authState, authService } = useOktaAuth()
  const [userInfo, setUserInfo] = useState(null)
  const [allAppUsers, setAllAppUsers] = useState([])
  const [counterparties, setCounterparties] = useState([])
  const [selectedCounterparty, setSelectedCounterparty] = useState(null)
  const [savedRooms, setSavedRooms] = useState([])
  const [activeRoom, setActiveRoom] = useState('')
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])

  //fetch all saved rooms from DB
  useEffect(() => {
    if (authState.isAuthenticated) {
      authService.getUser().then((info) => {
        const { accessToken } = authState
        setUserInfo(info)
        fetch(`${config.resourceServer.roomsUrl}?user=${info.sub}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }).then((response) => {
          if (!response.ok) {
            return Promise.reject()
          }
          return response.json()
        }).then((data) => {
          setAllAppUsers(data.allAppUsers)
          setSavedRooms(data.rooms)
        }).catch((err) => {
          savedRoomsFetchFailed = true
          console.error(err)
        });
      });
    }
  }, [authState, authService])

  useEffect(() => {
    (async () => {
      if (savedRooms.length > 0) {
        const counterpartyNames = savedRooms.filter(room => room.members.length === 2 && room.members.includes(userInfo.name))
          .map(room => {
            let temp = [...room.members]
            const index = temp.indexOf(userInfo.name)
            if (index > -1) {
              temp.splice(index, 1)
            }
            counterpartyRoomMap[temp[0]] = room.roomName
            return temp[0]
          }
          )
        const counterparties = []
        for (const name of counterpartyNames) {
          counterparties.push({ name: name, status: await fetchUserLoginStatus(name) })
        }
        setCounterparties(counterparties)
        window.scrollTo(0, document.body.scrollHeight)
      }
    })()
  }, [savedRooms])

  useEffect(() => {
    if (selectedCounterparty) {
      if (counterpartySocketMap[selectedCounterparty]) {
        setMessages([{ user: null, text: `Saved messages from DB for this room with ${selectedCounterparty}. (to be done ...)` }])
        setActiveRoom(counterpartyRoomMap[selectedCounterparty])
      } else {
        setMessages([{ user: null, text: `Saved messages from DB for this room with ${selectedCounterparty}. (to be done ...)` }])
        counterpartySocketMap[selectedCounterparty] = io(process.env.REACT_APP_EXPRESS_NODE_SERVER_ENDPOINT);
        let room
        if (counterpartyRoomMap[selectedCounterparty]) {
          room = counterpartyRoomMap[selectedCounterparty]
        } else {
          room = `DM-${userInfo.name}-${selectedCounterparty}`
          counterpartyRoomMap[selectedCounterparty] = room
        }
        setActiveRoom(room)
        const name = userInfo.name
        counterpartySocketMap[selectedCounterparty].emit('join', { name, room }, (error) => {
          if (error) {
            console.log(error)
          }
        })
        counterpartySocketMap[selectedCounterparty].on('message', message => {
          setMessages(prevMessages => [...prevMessages, message])
        })
        counterpartySocketMap[selectedCounterparty].on("roomData", ({ room, users }) => {
          console.log("roomData users=" + JSON.stringify(users) + ", room=" + room)
        })
      }
    }
  }, [selectedCounterparty])

  const sendMessage = (event) => {
    event.preventDefault()
    if (message) {
      if (counterpartySocketMap[selectedCounterparty]) {
        counterpartySocketMap[selectedCounterparty].emit('sendMessage', message, () => setMessage(''))
      } else {
        alert('Please select one DM target to send a message!')
      }
    }
  }

  const handlePopupSelection = async (value) => {
    if (value && !Array.isArray(value)) {
      setSelectedCounterparty(value)
      if (!counterparties.map((counterparty) => counterparty.name).includes(value)) {
        let temp = [...counterparties]
        temp.push({ name: value, status: await fetchUserLoginStatus(value) })
        setCounterparties(temp)
      }
    }
  }

  return (
    <div>
      {savedRoomsFetchFailed && <div style={{ color: "orange", marginTop: "3em" }}>Failed to fetch saved rooms!! Please verify: ${possibleErrors}</div>}
      <div className={styles.container}>
        <div className={styles.nav}>
          <TextContainer userInfo={userInfo} allAppUsers={allAppUsers} counterparties={counterparties} selectedCounterparty={selectedCounterparty} setSelectedCounterparty={setSelectedCounterparty} handlePopupSelection={handlePopupSelection} />
        </div>
        <div className={styles.charts}>
          <InfoBar room={activeRoom} />
          <Messages messages={messages} name={userInfo ? userInfo.name : ''} />
          <Input message={message} setMessage={setMessage} sendMessage={sendMessage} />
        </div>
      </div>
    </div>
  )
}

export default Chat