import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  FlatList,
  StyleSheet,
} from 'react-native';
import io from 'socket.io-client';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';

const socket = io("http://192.168.1.4:3000");

export default function HomeScreen() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [username, setUsername] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [room, setRoom] = useState("");
  const [isRoomSelected, setIsRoomSelected] = useState(false);
  const [sound, setSound] = useState();

  async function configureAudio() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true, // Arka planda ses çalabilmesi için gerekli
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.log("Audio mode configuration error:", error);
    }
  }


  async function playSound() {
    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/alarm.mp3')
    );
    setSound(sound);
    await sound.playAsync(); // alarm sesini başlatır
  }

  async function stopSound() {
    if (sound) {
      await sound.stopAsync(); // alarm sesini durdurur
      await sound.unloadAsync(); // alarm sesini kaldırır
    }
  }
  
  async function registerForPushNotificationsAsync() {
    const { status } = await Notifications.getPermissionsAsync();
    let finalStatus = status;

    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      finalStatus = newStatus;
    }

    if (finalStatus !== 'granted') {
      alert('Failed to get push token for notifications!');
      return;
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Push Token:', token);
    return token;
  }

  useEffect(() => {
    async function prepareNotifications() {
      await registerForPushNotificationsAsync();

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
      await configureAudio();
    }

    prepareNotifications();
  }, []);

  useEffect(() => {
    socket.on("receive_message", (data) => {
      setMessages((prevMessages) => [...prevMessages, data]);

      // Send a local notification for new messages
      Notifications.scheduleNotificationAsync({
        content: {
          title: `New Message from ${data.username}`,
          body: data.message,
          sound: true,
        },
        trigger: null, // Show the notification immediately
      });
      playSound();
    });
    
    Notifications.addNotificationResponseReceivedListener(() => {
      stopSound(); // kullanıcı bildirime tıkladığında alarm sesini durdurur
    });
    
    return () => {
      socket.off("receive_message");
    };
  }, []);


  const joinRoom = (roomName) => {
    socket.emit('join_room', { roomName, username });
    setRoom(roomName);
    setIsRoomSelected(true);
  };

  const handleSend = () => {
    if (message.trim()) {
      socket.emit("send_message", { roomName: room, username, message });
      setMessage("");
    }
  };

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.heading}>Enter Your Name:</Text>
        <TextInput
          style={styles.input}
          placeholder="Your name"
          value={username}
          onChangeText={setUsername}
        />
        <TouchableOpacity
          style={styles.button}
          onPress={() => username.trim() && setIsLoggedIn(true)}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!isRoomSelected) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.heading}>Select a Room:</Text>
        <TouchableOpacity style={styles.button} onPress={() => joinRoom("room1")}>
          <Text style={styles.buttonText}>Room 1</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => joinRoom("room2")}>
          <Text style={styles.buttonText}>Room 2</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.messageContainer}>
            <Text style={styles.messageUsername}>{item.username}:</Text>
            <Text style={styles.messageText}>{item.message}</Text>
          </View>
        )}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message"
          value={message}
          onChangeText={setMessage}
        />
        <TouchableOpacity style={styles.button} onPress={handleSend}>
          <Text style={styles.buttonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  heading: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  button: {
    backgroundColor: "#007BFF",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  messageContainer: {
    flexDirection: "row",
    marginBottom: 5,
  },
  messageUsername: {
    fontWeight: "bold",
    marginRight: 5,
  },
  messageText: {
    color: "#333",
  },
});
