import { Button, StyleSheet, Text, View } from 'react-native';
import { navigate } from '../lib/router';

export default function HelloScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hello from /hello!</Text>
      <Button title="Go to Chats" onPress={() => navigate('Chats')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
  },
});
