import { Text, View } from 'react-native';

export default function Dashboard() {



  return (
    <View className="flex-1 items-center justify-center p-4">
      <Text className="mb-2 text-3xl font-bold">Dashboard</Text>
      <Text className="text-base text-gray-500">You are logged in.</Text>
    </View>
  );
}
