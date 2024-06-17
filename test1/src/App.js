import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import Component from '../src/components/TabComponent';
import "firebase/auth";
import "firebase/database";
import "firebase/firestore";
import "firebase/functions";
import "firebase/storage";
import { initializeApp, getApps } from "firebase/app";
import Toast from 'react-native-toast-message';

const firebaseConfig = {
  apiKey: "AIzaSyDKekclUFx6lNdLoEVDvzfrO4C2ygU6nYM",
  authDomain: "pbl5-94a59.firebaseapp.com",
  databaseURL: "https://pbl5-94a59-default-rtdb.firebaseio.com",
  projectId: "pbl5-94a59",
  storageBucket: "pbl5-94a59.appspot.com",
  messagingSenderId: "898822763888",
  appId: "1:898822763888:web:d0a4473478f6443d4f4bb5",
  measurementId: "G-4B0C59YV3D"
};

if (!getApps().length) {
  initializeApp(firebaseConfig);
  console.log("Firebase initialized successfully");
}

function App() {
  const [activeTab, setActiveTab] = useState(1);

  const handleTabClick = (tabIndex) => {
    setActiveTab(tabIndex);
  };

  return (
    <View style={styles.container}>
      <Component />
      <StatusBar style="auto" />
      <Toast ref={(ref) => Toast.setRef(ref)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
